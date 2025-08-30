console.log('🚀 Starting OpenAI test...');

import('openai').then(async (OpenAI) => {
  try {
    // Load env manually
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const apiKey = envContent.match(/OPENAI_KEY=(.+)/)?.[1];
    
    console.log('📋 API Key loaded:', !!apiKey);
    
    if (!apiKey) {
      console.error('❌ No API key found in .env.local');
      return;
    }
    
    const openai = new OpenAI.default({
      apiKey: apiKey,
    });
    
    console.log('🤖 Testing tiny OpenAI call...');
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: 'Say hello in JSON format' }],
      response_format: { type: "json_object" }
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ SUCCESS in ${elapsed}ms:`, completion.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('🔍 Error details:', {
      status: error.status,
      type: error.type,
      code: error.code
    });
  }
});