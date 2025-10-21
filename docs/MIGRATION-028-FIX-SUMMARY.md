# Migration 028 Fix - Comprehensive Cleanup

## Problem

The migration was failing with:
```
check constraint "at_least_one_file_required" of relation "jobs" is violated by some row
```

## Root Cause

The original cleanup logic (line 67) was **too conservative**:
```sql
DELETE FROM jobs
WHERE audio_file_path IS NULL
  AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb)
  AND status = 'pending'  -- ❌ PROBLEM: Only deleted pending jobs
  AND txt_file_path IS NULL
  AND json_file_path IS NULL;
```

**Issue**: Jobs with other statuses (`failed`, `error`, `cancelled`, etc.) that also had no files were NOT being deleted.

## Solution

### 1. More Aggressive DELETE (Lines 63-83)

**Before:**
- Only deleted jobs with `status = 'pending'`
- Left invalid jobs with other statuses

**After:**
```sql
DELETE FROM jobs
WHERE audio_file_path IS NULL
  AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb)
  AND txt_file_path IS NULL                 -- No transcription
  AND json_file_path IS NULL                -- No generated content
  -- ✅ NO STATUS CHECK - deletes all invalid jobs regardless of status
```

**Result**: Deletes ALL truly invalid jobs (no files, no data) across all statuses.

### 2. Clearer UPDATE Logic (Lines 85-113)

**Purpose**: Handle edge cases where a job has generated data (transcription/content) but lost its source file reference.

**Logic**:
```sql
UPDATE jobs
SET audio_file_path = 'LEGACY_INVALID_JOB'
WHERE audio_file_path IS NULL
  AND (document_paths IS NULL OR document_paths = '[]'::jsonb)
  AND (
    txt_file_path IS NOT NULL           -- Has transcription
    OR json_file_path IS NOT NULL       -- Has generated content
  )
```

**Result**: Preserves data integrity while satisfying the constraint.

## Coverage

The new cleanup now handles:

1. **Pending jobs with no files** → Deleted
2. **Failed jobs with no files** → Deleted
3. **Error jobs with no files** → Deleted
4. **Cancelled jobs with no files** → Deleted
5. **Any status with no files AND no data** → Deleted
6. **Jobs with data but no source file** → Marked with placeholder

## Testing

Run the migration:
```bash
npx supabase db push
```

Expected output:
```
NOTICE:  Found X invalid job(s) with no files
NOTICE:  Deleted X invalid job(s) with no files and no generated data (all statuses)
NOTICE:  No jobs needed placeholder markers (or Y jobs marked)
NOTICE:  ✓ Constraint "at_least_one_file_required" added successfully
NOTICE:  ✓ No invalid jobs remain in the table
NOTICE:  === MIGRATION 028 COMPLETED SUCCESSFULLY ===
```

## Rollback

If needed:
```sql
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;
```

**Note**: This will NOT restore deleted rows. The deleted rows were invalid anyway (no files, no data).
