#!/usr/bin/env node

/**
 * Script to regenerate content for existing lectures that have transcriptions
 * but are missing OpenAI-generated study guides
 */

const jobId = process.argv[2] || 'cf5e3ddb-b31f-420a-8b93-4e985381ca4b';

console.log(`🚀 Regenerating content for lecture: ${jobId}`);
console.log('📍 Make sure your dev server is running on http://localhost:3000');
console.log('🔑 You must be logged in to the app in your browser\n');

// Instructions for the user
console.log('To regenerate content for your lecture:');
console.log('\n1. Open your browser console (F12)');
console.log('2. Go to your Mindsy dashboard');
console.log('3. Paste this code:\n');

const browserCode = `
// Regenerate content for lecture
fetch('/api/lectures/${jobId}/regenerate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ Content generation completed!');
    console.log('📚 Refresh the page to see your content');
    window.location.href = '/dashboard/lectures/${jobId}/student-desk';
  } else {
    console.error('❌ Error:', data.error);
  }
})
.catch(err => console.error('❌ Network error:', err));
`;

console.log('```javascript');
console.log(browserCode);
console.log('```');

console.log('\n4. Press Enter to run the code');
console.log('5. Wait for completion (may take 30-60 seconds)');
console.log('6. The page will refresh automatically with your content!\n');

console.log('This will generate:');
console.log('- Study questions');
console.log('- Detailed explanations');
console.log('- Comprehensive summary');
console.log('- PDF study guide');