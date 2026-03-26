const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('./config/openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI API connection...');
  console.log('📋 Configuration:');
  console.log(`   Model: ${OPENAI_CONFIG.model}`);
  console.log(`   Max Tokens: ${OPENAI_CONFIG.maxTokens}`);
  console.log(`   Temperature: ${OPENAI_CONFIG.temperature}`);
  console.log(`   API Key: ${OPENAI_CONFIG.apiKey.substring(0, 20)}...`);
  
  try {
    console.log('\n📡 Sending test request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Please respond with a simple greeting.'
        },
        {
          role: 'user',
          content: 'Hello! Can you help me with MCS-CEV optimization?'
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    console.log('✅ OpenAI API connection successful!');
    console.log('📝 Response:');
    console.log(response.choices[0].message.content);
    console.log('\n📊 Usage:');
    console.log(`   Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`   Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`   Total tokens: ${response.usage.total_tokens}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ OpenAI API connection failed!');
    console.error('Error details:', error.message);
    
    if (error.code === 'insufficient_quota') {
      console.error('💡 Solution: Check your OpenAI account quota');
    } else if (error.code === 'invalid_api_key') {
      console.error('💡 Solution: Verify your API key is correct');
    } else if (error.code === 'rate_limit_exceeded') {
      console.error('💡 Solution: Wait a moment and try again');
    } else if (error.code === 'model_not_found') {
      console.error('💡 Solution: Check if the model name is correct');
    }
    
    return false;
  }
}

async function testOpenAIService() {
  console.log('\n🔧 Testing OpenAI Service integration...');
  
  try {
    const openaiService = require('./services/openaiService');
    
    console.log('📡 Testing service with sample message...');
    
    const result = await openaiService.processMessage(
      'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes',
      'test-session',
      {
        formData: {
          scenario: { numMCS: 1, numCEV: 1, numNodes: 2 }
        },
        currentStep: 1
      }
    );
    
    console.log('✅ OpenAI Service test successful!');
    console.log('📝 Response message:', result.message.substring(0, 100) + '...');
    console.log('🔧 Actions:', result.actions);
    console.log('📝 Form updates:', result.formUpdates);
    
    return true;
    
  } catch (error) {
    console.error('❌ OpenAI Service test failed!');
    console.error('Error details:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting OpenAI Integration Tests\n');
  
  const connectionTest = await testOpenAIConnection();
  
  if (connectionTest) {
    await testOpenAIService();
  }
  
  console.log('\n🏁 Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testOpenAIConnection, testOpenAIService };
