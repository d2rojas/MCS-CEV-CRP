const promptManager = require('./services/promptManager');
const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('./config/openai');
const agentOrchestrator = require('./services/agentOrchestrator');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow with Parameter Extraction');
  
  const testMessage = "I need to run the schedule for tomorrow's 10 vehicles at the 5 campus sites";
  const sessionId = 'test-session-' + Date.now();
  
  console.log(`📝 Test Message: "${testMessage}"`);
  console.log(`🆔 Session ID: ${sessionId}`);
  
  try {
    // Test 1: Direct Understanding Agent
    console.log('\n🔍 Test 1: Direct Understanding Agent');
    console.log('=' .repeat(80));
    
    const understandingPrompt = promptManager.getUnderstandingAgentPrompt(testMessage, {
      conversationHistory: [],
      workflowState: { currentStep: 1 }
    });
    
    const understandingResponse = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: understandingPrompt },
        { role: 'user', content: testMessage }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const understandingResult = JSON.parse(understandingResponse.choices[0].message.content);
    console.log('✅ Understanding Result:', JSON.stringify(understandingResult, null, 2));
    
    // Test 2: Direct Validation Agent
    console.log('\n🔍 Test 2: Direct Validation Agent');
    console.log('=' .repeat(80));
    
    const validationPrompt = promptManager.getValidationAgentPrompt(
      understandingResult,
      testMessage,
      {},
      { currentStep: 1 }
    );
    
    const validationResponse = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: validationPrompt },
        { role: 'user', content: `Validate these parameters: ${JSON.stringify(understandingResult)}` }
      ],
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const validationResult = JSON.parse(validationResponse.choices[0].message.content);
    console.log('✅ Validation Result:', JSON.stringify(validationResult, null, 2));
    
    // Test 3: Direct Conversation Manager
    console.log('\n🔍 Test 3: Direct Conversation Manager');
    console.log('=' .repeat(80));
    
    const conversationPrompt = promptManager.getConversationPrompt({
      extractedParameters: understandingResult,
      validationResult: validationResult,
      recommendationResult: { recommendations: [], confidence: 1.0 },
      workflowState: { currentStep: 1 },
      conversationHistory: []
    });
    
    const conversationResponse = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: conversationPrompt },
        { role: 'user', content: testMessage }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const conversationResult = conversationResponse.choices[0].message.content;
    console.log('✅ Conversation Result:', conversationResult);
    
    // Test 4: Full Agent Orchestrator
    console.log('\n🔍 Test 4: Full Agent Orchestrator');
    console.log('=' .repeat(80));
    
    const fullResponse = await agentOrchestrator.processMessage(testMessage, sessionId, {
      formData: {},
      currentStep: 1,
      currentSection: 'wizard'
    });
    
    console.log('✅ Full Orchestrator Response:');
    console.log('Message:', fullResponse.message);
    console.log('Navigate To Step:', fullResponse.navigateToStep);
    console.log('Extracted Parameters:', fullResponse.extractedParameters);
    console.log('Validation Result:', fullResponse.validationResult);
    console.log('Workflow State:', fullResponse.workflowState);
    
    // Test 5: Navigation Analysis
    console.log('\n🔍 Test 5: Navigation Analysis');
    console.log('=' .repeat(80));
    
    console.log('📊 Current Step:', fullResponse.workflowState.currentStep);
    console.log('📊 Extracted Parameters Keys:', Object.keys(fullResponse.extractedParameters || {}));
    console.log('📊 Validation Score:', fullResponse.validationResult?.validation_score);
    console.log('📊 Is Valid:', fullResponse.validationResult?.is_valid);
    
    if (fullResponse.extractedParameters.scenario) {
      console.log('📊 Scenario Config:');
      console.log('  - CEV Count:', fullResponse.extractedParameters.scenario.numCEV);
      console.log('  - Node Count:', fullResponse.extractedParameters.scenario.numNodes);
      console.log('  - MCS Count:', fullResponse.extractedParameters.scenario.numMCS);
      console.log('  - Scenario Name:', fullResponse.extractedParameters.scenario.scenarioName);
    }
    
    console.log('\n🎯 Expected Behavior:');
    console.log('1. Extract: 10 CEVs, 6 nodes (5 sites + 1 grid), 2 MCS');
    console.log('2. Validate: All parameters valid');
    console.log('3. Navigate: From Step 1 to Step 2 (Parameters)');
    console.log('4. Response: Should mention specific numbers and move to next step');
    
    console.log('\n🔍 Actual Behavior:');
    console.log('1. Extract:', fullResponse.extractedParameters.scenario ? '✅ SUCCESS' : '❌ FAILED');
    console.log('2. Validate:', fullResponse.validationResult?.is_valid ? '✅ SUCCESS' : '❌ FAILED');
    console.log('3. Navigate:', fullResponse.navigateToStep === 2 ? '✅ SUCCESS' : `❌ FAILED (stayed on step ${fullResponse.navigateToStep})`);
    console.log('4. Response:', fullResponse.message.includes('10') && fullResponse.message.includes('5') ? '✅ SUCCESS' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

// Run the test
testCompleteFlow();


