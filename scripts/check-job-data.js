// Quick script to check if job data exists
// Run with: node scripts/check-job-data.js cf5e3ddb-b31f-420a-8b93-4e985381ca4b

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const jobId = process.argv[2] || 'cf5e3ddb-b31f-420a-8b93-4e985381ca4b';

async function checkJobData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n🔍 Checking job:', jobId);
  console.log('=====================================\n');

  // Check jobs table
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (jobError || !job) {
    console.log('❌ Job not found in jobs table');
    console.log('Error:', jobError?.message);
    return;
  }

  console.log('✅ Job found:');
  console.log('  - Title:', job.lecture_title);
  console.log('  - Status:', job.status);
  console.log('  - User ID:', job.user_id);
  console.log('  - JSON file:', job.json_file_path || 'None');
  console.log('  - PDF file:', job.pdf_file_path || 'None');
  console.log('  - Created:', new Date(job.created_at).toLocaleString());
  console.log('');

  // Check study_guides table
  const { data: studyGuide, error: sgError } = await supabase
    .from('study_guides')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (sgError || !studyGuide) {
    console.log('⚠️  No study guide found');
    console.log('Error:', sgError?.message);
  } else {
    console.log('✅ Study guide found:');
    console.log('  - Title:', studyGuide.title);
    console.log('  - Questions:', studyGuide.questions?.length || 0);
    console.log('  - Explanations:', studyGuide.explanations?.length || 0);
    console.log('  - Has summary:', !!studyGuide.summary);
    console.log('');
  }

  // Check if JSON file exists in storage
  if (job.json_file_path) {
    console.log('📄 Checking JSON file in storage...');
    const { data: file, error: fileError } = await supabase.storage
      .from('generated-notes')
      .download(job.json_file_path);

    if (fileError) {
      console.log('❌ Could not download JSON file:', fileError.message);
    } else {
      const content = await file.text();
      const json = JSON.parse(content);
      console.log('✅ JSON file exists with keys:', Object.keys(json));
      console.log('  - Questions:', json.questions?.length || 0);
      console.log('  - Explanations:', json.explanations?.length || 0);
    }
  }

  console.log('\n=====================================');
  console.log('📊 Summary:');
  console.log('  Job exists:', !!job);
  console.log('  Has study guide:', !!studyGuide);
  console.log('  Has JSON file:', !!job?.json_file_path);
  console.log('  Status:', job?.status);
  console.log('\nIf all data exists, the API should return real data.');
  console.log('If not, it will fall back to mock data.');
}

checkJobData().catch(console.error);