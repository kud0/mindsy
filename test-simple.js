const fs = require('fs');

console.log('🚀 Starting simple test...');

async function test() {
  try {
    // Load environment
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const apiKey = envContent.match(/OPENAI_KEY=(.+)/)?.[1];
    
    console.log('📋 API Key found:', !!apiKey);
    console.log('📋 API Key length:', apiKey?.length);
    
    if (!apiKey) {
      console.error('❌ No API key in .env.local');
      return;
    }

    // Dynamic import for ES modules
    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: apiKey.trim(),
    });
    
    console.log('🤖 Making tiny OpenAI call...');
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'user', content: 'Say hello in JSON format' }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ SUCCESS in ${elapsed}ms`);
    console.log('🔍 Full completion object:', JSON.stringify(completion, null, 2));
    console.log('📄 Message content:', completion.choices[0]?.message?.content);
    console.log('📄 Content type:', typeof completion.choices[0]?.message?.content);
    console.log('📄 Content length:', completion.choices[0]?.message?.content?.length);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('🔍 Full error:', error);
  }
}

test();