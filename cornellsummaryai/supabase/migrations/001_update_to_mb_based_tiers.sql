-- Migration: Update to MB-based two-tier system
-- Date: 2025-07-30
-- Description: Convert from audio-minutes to MB-based limits for Free and Student tiers

BEGIN;

-- 1. Update subscription_plans table structure
ALTER TABLE public.subscription_plans 
  DROP COLUMN IF EXISTS max_audio_minutes_per_file,
  DROP COLUMN IF EXISTS max_audio_minutes_per_month,
  ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS total_monthly_mb INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS output_formats JSONB DEFAULT '["pdf"]'::jsonb;

-- 2. Update usage table structure  
ALTER TABLE public.usage 
  DROP COLUMN IF EXISTS audio_minutes_processed,
  ADD COLUMN IF NOT EXISTS total_mb_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS files_processed INTEGER DEFAULT 0;

-- 2.1. Update jobs table for multi-format support
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS txt_file_path TEXT,
  ADD COLUMN IF NOT EXISTS md_file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_mb INTEGER;

-- 3. Clear old subscription plans and insert new two-tier system
DELETE FROM public.subscription_plans;

INSERT INTO public.subscription_plans (
  tier, name, price_monthly, summaries_per_month, 
  max_file_size_mb, total_monthly_mb, concurrent_jobs, 
  features, output_formats
) VALUES
(
  'free', 'Free', 0.00, 2, 
  60, 120, 1,
  '["Mindsy Notes format", "PDF download only", "Standard processing"]'::jsonb,
  '["pdf"]'::jsonb
),
(
  'student', 'Student', 5.00, -1,
  300, 700, 2,
  '["Mindsy Notes format", "Multiple export formats", "Priority processing", "Email support"]'::jsonb,
  '["txt", "md", "pdf"]'::jsonb
);

-- 4. Add index for efficient monthly MB queries
CREATE INDEX IF NOT EXISTS idx_usage_monthly_totals 
ON public.usage(user_id, month_year, total_mb_used);

-- 5. Update existing users to use 'free' tier if they have old tiers
UPDATE public.profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier NOT IN ('free', 'student');

-- 6. Reset all usage tracking to start fresh with MB-based system
UPDATE public.usage SET 
  total_mb_used = 0,
  files_processed = 0,
  summaries_count = 0;

COMMIT;