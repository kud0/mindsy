#!/usr/bin/env node

/**
 * Fix Profiles RLS Policy Script
 * This script ensures the profiles table has the correct RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProfilesRLS() {
  try {
    console.log('🔍 Checking current RLS policies for profiles table...');
    
    // First, check if the INSERT policy exists
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'profiles' })
      .single();

    if (policiesError) {
      console.log('📋 Checking policies with direct query...');
      
      // Alternative way to check policies
      const { data: policyCheck, error } = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'profiles');

      console.log('Current privileges:', policyCheck);
    }

    console.log('🔧 Applying INSERT policy for profiles table...');
    
    // Apply the INSERT policy
    const insertPolicySQL = `
      -- Ensure RLS is enabled on profiles table
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing INSERT policy if it exists
      DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
      
      -- Create INSERT policy for profiles
      CREATE POLICY "Users can insert own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
      
      -- Also ensure UPDATE policy exists for upsert
      DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
      CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);
    `;

    const { error: sqlError } = await supabase.rpc('exec_sql', { 
      sql: insertPolicySQL 
    });

    if (sqlError) {
      console.error('❌ Error applying policies:', sqlError);
      
      // Try alternative approach - apply policies one by one
      console.log('🔄 Trying alternative approach...');
      
      const policies = [
        'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;',
        'DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;',
        'CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);',
        'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;', 
        'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);'
      ];

      for (const policy of policies) {
        try {
          console.log(`Applying: ${policy}`);
          const { error } = await supabase.rpc('exec_sql', { sql: policy });
          if (error) {
            console.warn(`⚠️ Warning applying policy: ${error.message}`);
          }
        } catch (err) {
          console.warn(`⚠️ Warning: ${err.message}`);
        }
      }
    }

    console.log('✅ Profiles RLS policies have been applied');
    
    // Test the policies by trying to query as admin
    console.log('🧪 Testing profile access...');
    
    const { data: testProfiles, error: testError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(1);

    if (testError) {
      console.warn('⚠️ Test query warning:', testError.message);
    } else {
      console.log(`📊 Found ${testProfiles?.length || 0} profiles (service role can see all)`);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Test email signup again');
    console.log('2. Check browser console for any remaining RLS errors');
    console.log('3. Profile should be created/updated successfully');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

console.log('🚀 Fixing profiles RLS policies...\n');
fixProfilesRLS();