# Supabase Database Setup

This directory contains the database schema for Cornell Summary AI.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Save your project URL and anon key for the `.env` file

### 2. Run the Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `schema.sql`
3. Paste and run the SQL in the editor

### 3. Create Storage Buckets

In the Supabase dashboard, go to Storage and create two buckets:

1. **user-uploads** (private)
   - For storing uploaded MP3 and PDF files
   
2. **generated-notes** (private)
   - For storing generated Mindsy Notes PDFs

### 4. Set up Storage Policies

After creating the buckets, run these policies in the SQL editor:

```sql
-- Policies for user-uploads bucket
CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own uploads" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for generated-notes bucket
CREATE POLICY "Users can view own generated notes" ON storage.objects
    FOR SELECT USING (bucket_id = 'generated-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. Configure Authentication

1. Go to Authentication > Providers in Supabase
2. Enable Email authentication
3. Configure email templates as needed

### 6. Update Environment Variables

Update your `.env` file with:

```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key (for server-side operations)
```

## Database Schema Overview

### Tables

1. **profiles** - User profiles extending Supabase auth
2. **usage** - Tracks monthly usage for each user
3. **jobs** - Processing queue for Mindsy Notes generation
4. **notes** - Stores generated Mindsy Notes content
5. **subscription_plans** - Reference table for subscription tiers

### Key Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Automatic timestamps** - created_at and updated_at fields
- **Usage tracking** - Monitors monthly limits per subscription tier
- **Subscription tiers** - Free, Student, and Max plans

### Functions

- `handle_new_user()` - Creates profile and usage records on signup
- `check_usage_limits()` - Verifies if user can process more files
- `increment_usage()` - Updates usage counters after processing

## Testing

After setup, test the database by:

1. Creating a new user account
2. Checking that a profile was created in the profiles table
3. Uploading a file and verifying the job record is created
4. Checking that usage is tracked correctly 