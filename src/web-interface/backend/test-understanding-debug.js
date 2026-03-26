const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('./config/openai');
const promptManager = require('./services/promptManager');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

async function testUnderstandingAgent() {
  const testMessage = "I need to optimize charging for 3 electric excavators at 2 construction sites";
  
  console.log('🧪 Testing Understanding Agent with message:', testMessage);
  console.log('=' .repeat(80));
  
  try {
    // Get the prompt
    const prompt = promptManager.getUnderstandingAgentPrompt(testMessage, {
      currentContext: {},
      conversationHistory: [],
      workflowState: { currentStep: 1 }
    });
    
    console.log('📝 Prompt loaded successfully');
    console.log('Prompt length:', prompt.length, 'characters');
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: testMessage }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ Understanding Agent Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Analyze the result
    console.log('\n🔍 Analysis:');
    if (result.scenario) {
      console.log('✅ Scenario extracted:', result.scenario);
    } else {
      console.log('❌ No scenario extracted');
    }
    
    if (result.extraction_confidence) {
      console.log('📊 Confidence:', result.extraction_confidence);
    }
    
    if (result.missing_critical_info && result.missing_critical_info.length > 0) {
      console.log('⚠️ Missing info:', result.missing_critical_info);
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('💡 Suggestions:', result.suggestions);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testUnderstandingAgent();


