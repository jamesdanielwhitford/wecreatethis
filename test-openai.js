// test-openai.js - Run this to test your OpenAI setup
// Save this file in your project root and run: node test-openai.js

require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  console.log('🧪 Testing OpenAI setup...');
  
  // Check environment variable
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Make sure you have it in your .env.local file');
    return;
  }
  
  console.log('✅ OPENAI_API_KEY found');
  console.log('🔑 API Key starts with:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
  
  // Try to import OpenAI
  try {
    const OpenAI = require('openai');
    console.log('✅ OpenAI package imported successfully');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Test API connection with a simple request
    console.log('🔄 Testing API connection...');
    const models = await openai.models.list();
    console.log('✅ API connection successful');
    console.log('📋 Available models:', models.data.slice(0, 3).map(m => m.id));
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ OpenAI package not installed');
      console.log('Run: npm install openai');
    } else {
      console.error('❌ API connection failed:', error.message);
    }
  }
}

testOpenAI().catch(console.error);