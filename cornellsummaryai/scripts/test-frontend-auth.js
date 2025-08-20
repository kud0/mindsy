// Test what user ID the frontend is seeing vs the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing frontend auth vs database...');

// Create client like frontend does (anon key)
const frontendClient = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client to see all data
const adminClient = createClient(supabaseUrl, serviceRoleKey);

(async () => {
  try {
    // Check what user the frontend sees (this won't work without auth cookies)
    console.log('\n📱 Frontend client (without cookies):');
    const { data: { user: frontendUser }, error: frontendError } = await frontendClient.auth.getUser();
    if (frontendError) {
      console.log('❌ Frontend auth error (expected):', frontendError.message);
    } else {
      console.log('✅ Frontend user:', frontendUser?.id);
    }

    // Check recent jobs from admin perspective
    console.log('\n🔧 Admin view - Recent jobs:');
    const { data: jobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('job_id, user_id, lecture_title, status, created_at')
      .limit(3)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('❌ Admin jobs error:', jobsError);
    } else {
      console.log('📊 Recent jobs:');
      jobs.forEach(job => {
        console.log(`  - ${job.lecture_title} (${job.status}) - User: ${job.user_id}`);
      });
      console.log(`\n🎯 Most recent job user_id: ${jobs[0]?.user_id}`);
    }

    // Check all auth.users to see what users exist
    console.log('\n👥 All users in auth.users:');
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log(`📋 Found ${users.users.length} users:`);
      users.users.forEach(user => {
        console.log(`  - ${user.id} (${user.email})`);
      });
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
})();