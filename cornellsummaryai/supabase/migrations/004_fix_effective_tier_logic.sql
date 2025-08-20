-- Migration: Fix effective subscription tier logic for NULL subscription_tier
-- Date: 2025-08-02
-- Issue: Users with NULL subscription_tier were not defaulting to 'free'

-- Fix the get_effective_subscription_tier function
CREATE OR REPLACE FUNCTION public.get_effective_subscription_tier(p_user_id UUID)
RETURNS subscription_tier AS $$
DECLARE
    v_subscription_tier subscription_tier;
    v_period_end TIMESTAMP WITH TIME ZONE;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user profile exists and get subscription data
    SELECT 
        COALESCE(subscription_tier, 'free'), -- Default to 'free' if NULL
        subscription_period_end,
        TRUE
    INTO v_subscription_tier, v_period_end, v_user_exists
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- If user not found in profiles table, default to free
    IF v_user_exists IS NULL THEN
        RETURN 'free';
    END IF;
    
    -- If no period end date, use current tier (now guaranteed to be non-null)
    IF v_period_end IS NULL THEN
        RETURN v_subscription_tier;
    END IF;
    
    -- Key logic: If still within paid period, user gets Student benefits
    -- regardless of what subscription_tier field says
    IF v_period_end > NOW() THEN
        RETURN 'student';
    END IF;
    
    -- Period has expired, use current subscription_tier
    RETURN v_subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles with NULL subscription_tier to 'free'
UPDATE public.profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;

-- Add a constraint to prevent NULL subscription_tier in future
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_tier_not_null 
CHECK (subscription_tier IS NOT NULL);

-- Set default value for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN subscription_tier SET DEFAULT 'free';