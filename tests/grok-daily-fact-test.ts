/**
 * Test file for generateDailyStudyFact function
 * This is a manual test file - run with: npx tsx tests/grok-daily-fact-test.ts
 */

import { generateDailyStudyFact } from '../lib/grok-client';

async function testDailyStudyFact() {
  console.log('🧪 Testing Daily Study Fact Generation\n');

  // Test 1: English topics
  console.log('Test 1: English topics');
  const result1 = await generateDailyStudyFact({
    recentTopics: [
      'Introduction to Quantum Physics',
      'Ancient Roman History',
      'Calculus and Derivatives'
    ]
  });

  if (result1.success) {
    console.log('✅ Success!');
    console.log('Language:', result1.language);
    console.log('Fact:', result1.fact);
  } else {
    console.log('❌ Failed:', result1.error);
  }

  console.log('\n---\n');

  // Test 2: Spanish topics
  console.log('Test 2: Spanish topics');
  const result2 = await generateDailyStudyFact({
    recentTopics: [
      'Economía de la Empresa',
      'Matemáticas Avanzadas',
      'Historia de España'
    ],
    detectedLanguage: 'es'
  });

  if (result2.success) {
    console.log('✅ Success!');
    console.log('Language:', result2.language);
    console.log('Fact:', result2.fact);
  } else {
    console.log('❌ Failed:', result2.error);
  }

  console.log('\n---\n');

  // Test 3: Invalid input (no topics)
  console.log('Test 3: Invalid input (no topics)');
  const result3 = await generateDailyStudyFact({
    recentTopics: []
  });

  if (!result3.success) {
    console.log('✅ Error handling works!');
    console.log('Error:', result3.error);
    console.log('Error Code:', result3.errorCode);
  } else {
    console.log('❌ Should have failed with INVALID_INPUT');
  }
}

// Run test
testDailyStudyFact()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
