-- Create pomodoro_settings table
CREATE TABLE IF NOT EXISTS public.pomodoro_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    focus_duration INTEGER DEFAULT 25, -- in minutes
    short_break_duration INTEGER DEFAULT 5,
    long_break_duration INTEGER DEFAULT 15,
    auto_start_breaks BOOLEAN DEFAULT false,
    auto_start_focus BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    daily_goal INTEGER DEFAULT 8, -- number of focus sessions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create pomodoro_sessions table
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('focus', 'shortBreak', 'longBreak')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration INTEGER NOT NULL, -- in minutes
    note TEXT,
    was_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON public.pomodoro_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_date ON public.pomodoro_sessions(user_id, started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for pomodoro_settings
CREATE POLICY "Users can view their own settings" ON public.pomodoro_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.pomodoro_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.pomodoro_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.pomodoro_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for pomodoro_sessions
CREATE POLICY "Users can view their own sessions" ON public.pomodoro_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.pomodoro_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.pomodoro_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.pomodoro_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for pomodoro_settings
CREATE TRIGGER update_pomodoro_settings_updated_at
    BEFORE UPDATE ON public.pomodoro_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();