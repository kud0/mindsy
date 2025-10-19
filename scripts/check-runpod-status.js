#!/usr/bin/env node

// Check RunPod job status directly
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_JOB_ID = 'd52a7312-8019-42d4-a2e7-82bbf8db4a43-e2';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY not found in environment');
  process.exit(1);
}

console.log('🔍 Checking RunPod job status...');
console.log('Job ID:', RUNPOD_JOB_ID);

fetch(`https://api.runpod.ai/v2/ojwmcpij9mwq9w/status/${RUNPOD_JOB_ID}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${RUNPOD_API_KEY}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('\n📊 RunPod Status:');
  console.log(JSON.stringify(data, null, 2));

  if (data.status === 'COMPLETED') {
    console.log('\n✅ RunPod transcription COMPLETED!');
    console.log('⚠️  But webhook did not trigger - check webhook URL');
  } else if (data.status === 'IN_PROGRESS' || data.status === 'IN_QUEUE') {
    console.log(`\n⏳ Still processing: ${data.status}`);
  } else if (data.status === 'FAILED') {
    console.log('\n❌ RunPod job FAILED');
    console.log('Error:', data.error);
  }
})
.catch(err => {
  console.error('❌ Error checking status:', err.message);
});