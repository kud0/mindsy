# Quiz System Fix - Missing Migration

## Problem

The Quiz tab in Student Desk v2 was throwing an error when trying to fetch quizzes:

```
Failed to fetch quizzes: {}
status: [unknown]
statusText: [unknown]
error: { error: 'Unknown error' }
```

## Root Cause

The `quizzes` table migration file was never applied to the database because it wasn't properly numbered. All migrations follow the pattern `NNN_description.sql`, but the quizzes migration was named `create_quizzes_table.sql` (without a number prefix).

When the API route `/api/lectures/[jobId]/quizzes` tried to query the non-existent `quizzes` table, Supabase returned a database error, which was caught and returned as "Unknown error".

## Fix Applied

### 1. Renamed Migration File
```bash
# Before
migrations/create_quizzes_table.sql

# After
migrations/028_create_quizzes_table.sql
```

### 2. Added Database Type Definitions
Added the following type definitions to `/types/database.ts`:
- `QuizQuestion` - Individual question structure
- `QuizConfig` - Quiz configuration options
- `Quiz` - Main quiz table structure

### 3. Migration Application Steps

To fix the issue in your environment, you need to apply the migration to Supabase:

#### Option A: Using Supabase CLI (Recommended)
```bash
# 1. Make sure you're in the project directory
cd /Users/alexsolecarretero/Public/projects/mindsy

# 2. Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Apply the migration
npx supabase db push

# Or apply just this migration
psql $DATABASE_URL < migrations/028_create_quizzes_table.sql
```

#### Option B: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/028_create_quizzes_table.sql`
4. Paste and execute the SQL

#### Option C: Direct PostgreSQL Connection
```bash
# Using psql with your database URL
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f migrations/028_create_quizzes_table.sql
```

## Migration Details

The migration creates:

### Table: `quizzes`
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  questions JSONB NOT NULL,
  quiz_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes
- `idx_quizzes_job_id` - For fast lookup by lecture
- `idx_quizzes_user_id` - For fast lookup by user
- `idx_quizzes_created_at` - For sorting by creation time

### RLS Policies
- Users can only view their own quizzes
- Users can create their own quizzes
- Users can update their own quizzes
- Users can delete their own quizzes

## Testing After Fix

After applying the migration, test the Quiz tab:

1. Navigate to any lecture in Student Desk v2
2. Click on the "Quiz" tab
3. You should see either:
   - Empty state: "Generate Your First Quiz" (if no quizzes exist)
   - Quiz list (if quizzes already exist)
4. Try generating a new quiz
5. Verify the quiz loads and questions are displayed correctly

## Related Files

- **Migration**: `/migrations/028_create_quizzes_table.sql`
- **API Route**: `/app/api/lectures/[jobId]/quizzes/route.ts`
- **Component**: `/components/student-desk-v2/tabs/QuestionsTab.tsx`
- **Types**: `/types/database.ts`

## Prevention

To prevent similar issues in the future:

1. **Always number migration files** using the pattern `NNN_description.sql`
2. **Check migration numbering** before committing
3. **Test database-dependent features** after pulling changes
4. **Document migration dependencies** in feature documentation
