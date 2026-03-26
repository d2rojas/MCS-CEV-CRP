const promptManager = require('./services/promptManager');
const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('./config/openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

async function testUnderstandingExtraction() {
  console.log('🧪 Testing Understanding Agent Parameter Extraction');
  
  const testMessage = "I need to run the schedule for tomorrow's 10 vehicles at the 5 campus sites";
  
  console.log(`📝 Test Message: "${testMessage}"`);
  
  try {
    // Get the prompt
    const prompt = promptManager.getUnderstandingAgentPrompt(testMessage, {
      conversationHistory: [],
      workflowState: { currentStep: 1 }
    });
    
    console.log('\n📋 Understanding Agent Prompt:');
    console.log('=' .repeat(80));
    console.log(prompt);
    console.log('=' .repeat(80));
    
    // Call OpenAI directly
    console.log('\n🤖 Calling OpenAI API...');
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
    
    console.log('\n✅ OpenAI Response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Analyze the extraction
    console.log('\n🔍 Extraction Analysis:');
    
    if (result.scenario) {
      console.log(`📊 Scenario: ${JSON.stringify(result.scenario, null, 2)}`);
      
      if (result.scenario.numCEV) {
        console.log(`✅ CEV Count: ${result.scenario.numCEV}`);
      } else {
        console.log(`❌ CEV Count: NOT EXTRACTED`);
      }
      
      if (result.scenario.numNodes) {
        console.log(`✅ Node Count: ${result.scenario.numNodes}`);
      } else {
        console.log(`❌ Node Count: NOT EXTRACTED`);
      }
      
      if (result.scenario.numMCS) {
        console.log(`✅ MCS Count: ${result.scenario.numMCS}`);
      } else {
        console.log(`❌ MCS Count: NOT EXTRACTED`);
      }
    } else {
      console.log('❌ No scenario extracted');
    }
    
    if (result.extraction_confidence) {
      console.log(`🎯 Confidence: ${result.extraction_confidence}`);
    }
    
    if (result.missing_critical_info && result.missing_critical_info.length > 0) {
      console.log(`⚠️ Missing Info: ${result.missing_critical_info.join(', ')}`);
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(`💡 Suggestions: ${result.suggestions.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

// Run the test
testUnderstandingExtraction();

