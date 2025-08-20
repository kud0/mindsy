# Subscription Tier Logic Deployment Guide

## Quick Start

**Option 1: Automated (Recommended)**
```bash
npm run deploy-subscription-logic
```

**Option 2: Manual SQL Execution**
If the automated script fails, follow the manual steps below.

## Manual Deployment Steps

### Step 1: Drop Old Function
Run this SQL in your Supabase dashboard:

```sql
DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);
```

### Step 2: Create New Functions
Copy and paste the entire content from `supabase/migrations/003b_effective_tier_functions.sql` into your Supabase SQL editor and execute it.

### Step 3: Validate Deployment
```bash
npm run test-subscription-downgrade
```

## What This Fixes

### Before
- User downgrades from Student to Free → loses benefits immediately
- Unfair: user paid for full month but loses access mid-cycle

### After  
- User downgrades from Student to Free → keeps Student benefits until period expires
- Fair: user gets full value for what they paid

## Key Functions Created

1. **`get_effective_subscription_tier(user_id)`**
   - Returns 'student' if user is within paid period, even if tier is 'free'
   - Returns actual tier if no paid period or period expired

2. **`check_usage_limits(user_id, file_size)`** (Enhanced)
   - Now uses effective tier for usage validation
   - Returns both user_tier and effective_tier for transparency

3. **`cleanup_expired_subscriptions()`**
   - Maintenance function to clean up old period_end dates
   - Should be run periodically (daily recommended)

## Frontend Changes

Account downgrade flow now preserves `subscription_period_end` date instead of nullifying it immediately.

## Testing Scenarios

The test suite validates:
- ✅ Student user downgrades mid-period → keeps Student benefits
- ✅ Student user with expired period → gets Free limits  
- ✅ Active Student user → continues Student benefits
- ✅ Free user (never subscribed) → Free limits

## Maintenance

Run cleanup periodically:
```bash
npm run cleanup-expired-subscriptions
```

Or set up a daily cron job:
```bash
0 2 * * * cd /path/to/project && npm run cleanup-expired-subscriptions
```

## Rollback Plan

If issues occur, you can rollback by:

1. **Restore old function:**
```sql
DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.check_usage_limits(p_user_id UUID, p_file_size_mb INTEGER)
RETURNS TABLE(can_process BOOLEAN, message TEXT, current_usage_mb INTEGER, monthly_limit_mb INTEGER, files_this_month INTEGER, user_tier TEXT) AS $$
-- [Include original function body from schema.sql]
```

2. **Revert frontend changes** to set `subscription_period_end: null` on downgrade

## Monitoring

After deployment, monitor:
- User downgrade behavior
- Effective tier vs actual tier logging in API calls
- Customer support tickets about billing/access issues (should decrease)

## Support

For issues:
1. Check logs with `npm run test-subscription-downgrade`
2. Verify function exists: `SELECT proname FROM pg_proc WHERE proname LIKE '%effective%';`
3. Check user subscription details with `get_user_subscription_details(user_id)`