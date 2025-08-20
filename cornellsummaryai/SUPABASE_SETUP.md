# Supabase Setup Guide

## Environment Variables

You need to update your `.env` file with your actual Supabase project credentials.

### Required Variables:

```bash
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to get these values:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`

### Current Issue:

Your app is trying to connect to `http://localhost:54321` which means your environment variables are either:
- Not set correctly
- Pointing to local development values
- Not being loaded properly

### Fix:

1. Update your `.env` file with the correct values from your Supabase project
2. Make sure the `.env` file is in the root of your project
3. Restart your development server after updating the `.env` file

### Example `.env` file:

```bash
PUBLIC_SUPABASE_URL=https://xyzxyzxyz.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enh5enh5eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjI2Mjg0NDcyLCJleHAiOjE5NDE4NjA0NzJ9.UGc1oJnZGHKpVMnlgfQaKCFfOOnmFqVfrFNQf6WdMGE
```

**Note:** Never commit your `.env` file to git. It should be in your `.gitignore`. 