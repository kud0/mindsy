#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://lvpqojnsubocmalkaygb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cHFvam5zdWJvY21hbGtheWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk1MzE3MSwiZXhwIjoyMDY2NTI5MTcxfQ.MDkSp_VUUJcz8PFjSUwuJBd0YQ7WtdaN3huqSfs70L8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Reading migration file...');

  const migrationPath = join(__dirname, '..', 'migrations', '028_fix_invalid_jobs_and_add_constraint.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Executing migration 028...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('Data:', data);
  } catch (err) {
    console.error('❌ Error executing migration:', err);

    // Try direct query if RPC fails
    console.log('\n🔄 Trying direct SQL execution...');
    try {
      const { error: directError } = await supabase.rpc('query', {
        query_text: migrationSQL
      });

      if (directError) {
        console.error('❌ Direct execution also failed:', directError);
        console.log('\n📝 Migration SQL:');
        console.log(migrationSQL);
        process.exit(1);
      }

      console.log('✅ Migration completed via direct execution!');
    } catch (directErr) {
      console.error('❌ Both methods failed:', directErr);
      console.log('\n📋 You may need to run this SQL manually in the Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/lvpqojnsubocmalkaygb/sql/new');
      process.exit(1);
    }
  }
}

runMigration();
