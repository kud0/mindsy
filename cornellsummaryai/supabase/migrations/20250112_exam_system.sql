-- Exam System Tables

-- Store generated exams
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL, -- Can be single folder or comma-separated for multiple
    folder_name TEXT NOT NULL,
    title TEXT NOT NULL,
    questions JSONB NOT NULL, -- Array of question objects with answers
    question_count INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')) DEFAULT 'mixed',
    source_note_ids TEXT[], -- Array of note IDs used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration for exams
    is_active BOOLEAN DEFAULT true
);

-- Store user exam attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    answers JSONB NOT NULL, -- User's answers {question_id: answer}
    score INTEGER,
    percentage DECIMAL(5,2),
    correct_count INTEGER,
    incorrect_count INTEGER,
    time_spent INTEGER, -- in seconds
    performance_by_topic JSONB, -- Topic-wise performance
    status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress'
);

-- Performance tracking
CREATE TABLE IF NOT EXISTS public.user_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL,
    total_exams_taken INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_exam_date TIMESTAMPTZ,
    weak_topics TEXT[], -- Topics that need improvement
    strong_topics TEXT[], -- Topics with good performance
    total_study_time INTEGER DEFAULT 0, -- in seconds
    xp_points INTEGER DEFAULT 0, -- Gamification points
    level INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, folder_id)
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    exam_id UUID REFERENCES public.exams(id),
    UNIQUE(user_id, achievement_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exams_user_folder ON public.exams(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_user_performance_user ON public.user_performance(user_id);

-- Row Level Security
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for exams
CREATE POLICY "Users can view their own exams" ON public.exams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exams" ON public.exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exams" ON public.exams
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for exam_attempts
CREATE POLICY "Users can view their own attempts" ON public.exam_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" ON public.exam_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON public.exam_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user_performance
CREATE POLICY "Users can view their own performance" ON public.user_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own performance" ON public.user_performance
    FOR ALL USING (auth.uid() = user_id);

-- Policies for achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update performance stats after exam completion
CREATE OR REPLACE FUNCTION update_user_performance()
RETURNS TRIGGER AS $$
DECLARE
    v_folder_id TEXT;
    v_is_passing BOOLEAN;
    v_current_streak INTEGER;
BEGIN
    -- Only process completed attempts
    IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
        -- Get folder_id from exam
        SELECT folder_id INTO v_folder_id FROM public.exams WHERE id = NEW.exam_id;
        
        -- Check if passing score (>= 70%)
        v_is_passing := NEW.percentage >= 70;
        
        -- Get current streak
        SELECT current_streak INTO v_current_streak 
        FROM public.user_performance 
        WHERE user_id = NEW.user_id AND folder_id = v_folder_id;
        
        IF v_current_streak IS NULL THEN
            v_current_streak := 0;
        END IF;
        
        -- Update or insert performance record
        INSERT INTO public.user_performance (
            user_id,
            folder_id,
            total_exams_taken,
            average_score,
            best_score,
            current_streak,
            longest_streak,
            last_exam_date,
            total_study_time,
            xp_points,
            updated_at
        ) VALUES (
            NEW.user_id,
            v_folder_id,
            1,
            NEW.percentage,
            NEW.percentage,
            CASE WHEN v_is_passing THEN 1 ELSE 0 END,
            CASE WHEN v_is_passing THEN 1 ELSE 0 END,
            NOW(),
            NEW.time_spent,
            CASE WHEN v_is_passing THEN NEW.correct_count * 10 ELSE NEW.correct_count * 5 END,
            NOW()
        )
        ON CONFLICT (user_id, folder_id) DO UPDATE SET
            total_exams_taken = user_performance.total_exams_taken + 1,
            average_score = ((user_performance.average_score * user_performance.total_exams_taken) + NEW.percentage) / (user_performance.total_exams_taken + 1),
            best_score = GREATEST(user_performance.best_score, NEW.percentage),
            current_streak = CASE 
                WHEN v_is_passing THEN user_performance.current_streak + 1
                ELSE 0
            END,
            longest_streak = GREATEST(
                user_performance.longest_streak,
                CASE WHEN v_is_passing THEN user_performance.current_streak + 1 ELSE user_performance.current_streak END
            ),
            last_exam_date = NOW(),
            total_study_time = user_performance.total_study_time + NEW.time_spent,
            xp_points = user_performance.xp_points + CASE 
                WHEN v_is_passing THEN NEW.correct_count * 10 
                ELSE NEW.correct_count * 5 
            END,
            level = FLOOR(user_performance.xp_points / 1000) + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for performance updates
CREATE TRIGGER update_performance_on_exam_complete
    AFTER UPDATE ON public.exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_performance();