-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'student');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cached');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier subscription_tier DEFAULT 'free' NOT NULL,
    subscription_status TEXT DEFAULT 'active',
    subscription_period_start TIMESTAMP WITH TIME ZONE,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    summaries_count INTEGER DEFAULT 0,
    total_mb_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- Jobs table for processing queue
CREATE TABLE public.jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lecture_title TEXT NOT NULL,
    course_subject TEXT,
    audio_file_path TEXT NOT NULL,
    pdf_file_path TEXT,
    output_pdf_path TEXT,
    txt_file_path TEXT,
    md_file_path TEXT,
    status job_status DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    file_size_mb INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated notes table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    course_subject TEXT,
    cue_column TEXT, -- Mindsy notes cue column
    notes_column TEXT, -- Mindsy notes main notes
    summary_section TEXT, -- Mindsy notes summary
    transcript_text TEXT, -- Full transcript
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans table (for reference)
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier subscription_tier UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    summaries_per_month INTEGER NOT NULL,
    max_file_size_mb INTEGER NOT NULL,
    total_monthly_mb INTEGER NOT NULL,
    output_formats JSONB DEFAULT '["pdf"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert subscription plans
INSERT INTO public.subscription_plans (tier, name, price_monthly, summaries_per_month, max_file_size_mb, total_monthly_mb, output_formats) VALUES
('free', 'Free', 0.00, 2, 60, 120, '["pdf"]'::jsonb),
('student', 'Student', 5.00, -1, 300, 700, '["txt", "md", "pdf"]'::jsonb);

-- Create indexes for performance
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_job_id ON public.notes(job_id);
CREATE INDEX idx_usage_user_month ON public.usage(user_id, month_year);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Usage policies
CREATE POLICY "Users can view own usage" ON public.usage
    FOR SELECT USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Users can view own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

-- Subscription plans policies (everyone can read)
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

-- Functions and Triggers

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON public.usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- Initialize usage for current month
    INSERT INTO public.usage (user_id, month_year)
    VALUES (NEW.id, TO_CHAR(NOW(), 'YYYY-MM'));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check usage limits with MB support
CREATE OR REPLACE FUNCTION public.check_usage_limits(p_user_id UUID, p_file_size_mb INTEGER DEFAULT 0)
RETURNS TABLE(can_process BOOLEAN, message TEXT, current_usage_mb INTEGER, monthly_limit_mb INTEGER, files_this_month INTEGER, user_tier TEXT) AS $$
DECLARE
    v_subscription_tier subscription_tier;
    v_current_mb_usage INTEGER;
    v_current_file_count INTEGER;
    v_monthly_mb_limit INTEGER;
    v_file_size_limit INTEGER;
    v_summary_limit INTEGER;
    v_month_year TEXT;
BEGIN
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM public.profiles WHERE id = p_user_id;
    
    IF v_subscription_tier IS NULL THEN
        v_subscription_tier := 'free';
    END IF;
    
    -- Get current month's usage
    SELECT COALESCE(total_mb_used, 0), COALESCE(summaries_count, 0)
    INTO v_current_mb_usage, v_current_file_count
    FROM public.usage 
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    IF v_current_mb_usage IS NULL THEN
        v_current_mb_usage := 0; v_current_file_count := 0;
    END IF;
    
    -- Get plan limits
    SELECT summaries_per_month, max_file_size_mb, total_monthly_mb
    INTO v_summary_limit, v_file_size_limit, v_monthly_mb_limit
    FROM public.subscription_plans WHERE tier = v_subscription_tier;
    
    -- Check file size limit
    IF p_file_size_mb > v_file_size_limit THEN
        RETURN QUERY SELECT FALSE, format('File size %sMB exceeds limit of %sMB', p_file_size_mb, v_file_size_limit), v_current_mb_usage, v_monthly_mb_limit, v_current_file_count, v_subscription_tier::TEXT;
        RETURN;
    END IF;
    
    -- Check monthly MB limit
    IF (v_current_mb_usage + p_file_size_mb) > v_monthly_mb_limit THEN
        RETURN QUERY SELECT FALSE, format('Would exceed monthly limit: %sMB + %sMB > %sMB', v_current_mb_usage, p_file_size_mb, v_monthly_mb_limit), v_current_mb_usage, v_monthly_mb_limit, v_current_file_count, v_subscription_tier::TEXT;
        RETURN;
    END IF;
    
    -- Check summary count limit (only for free tier, student tier is limited by MB only)
    IF v_subscription_tier = 'free' AND v_current_file_count >= v_summary_limit THEN
        RETURN QUERY SELECT FALSE, format('Monthly limit of %s summaries reached', v_summary_limit), v_current_mb_usage, v_monthly_mb_limit, v_current_file_count, v_subscription_tier::TEXT;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Within limits', v_current_mb_usage, v_monthly_mb_limit, v_current_file_count, v_subscription_tier::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_file_size_mb INTEGER)
RETURNS VOID AS $$
DECLARE
    v_month_year TEXT;
BEGIN
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    INSERT INTO public.usage (user_id, month_year, summaries_count, total_mb_used)
    VALUES (p_user_id, v_month_year, 1, p_file_size_mb)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        summaries_count = public.usage.summaries_count + 1,
        total_mb_used = public.usage.total_mb_used + p_file_size_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage buckets (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-uploads', 'user-uploads', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-notes', 'generated-notes', false);

-- Storage policies (run in Supabase dashboard after creating buckets)
-- CREATE POLICY "Users can upload to own folder" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own uploads" ON storage.objects
--     FOR SELECT USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own uploads" ON storage.objects
--     FOR DELETE USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own generated notes" ON storage.objects
--     FOR SELECT USING (bucket_id = 'generated-notes' AND auth.uid()::text = (storage.foldername(name))[1]); 