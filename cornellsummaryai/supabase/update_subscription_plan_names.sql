-- Update subscription plan names
-- Run this migration to update existing subscription plan names

UPDATE public.subscription_plans 
SET name = 'Part-Time Student' 
WHERE tier = 'student';

UPDATE public.subscription_plans 
SET name = 'Full Time Student' 
WHERE tier = 'max';