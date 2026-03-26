const enhancedOpenAIService = require('./services/enhancedOpenAIService');
const promptManager = require('./services/promptManager');

async function testEnhancedFlow() {
  console.log('🚀 Testing Enhanced OpenAI Flow with Prompt Management\n');
  
  // Test 1: Check prompt loading
  console.log('📝 Test 1: Prompt Loading');
  const promptStats = promptManager.getPromptStats();
  console.log('Prompt Statistics:', promptStats);
  console.log('Available prompts:', promptManager.getAvailablePrompts());
  console.log('');
  
  // Test 2: Test parameter extraction
  console.log('📊 Test 2: Parameter Extraction');
  const testMessage = 'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation';
  const testContext = {
    formData: {
      scenario: { numMCS: 1, numCEV: 1, numNodes: 2 },
      parameters: {},
      evData: [],
      locations: [],
      timeData: [],
      workData: []
    },
    currentStep: 1,
    currentSection: 'wizard'
  };
  
  try {
    console.log('📝 Test message:', testMessage);
    console.log('📋 Test context:', JSON.stringify(testContext, null, 2));
    
    console.log('\n🔄 Processing message with enhanced flow...');
    
    const result = await enhancedOpenAIService.processMessage(
      testMessage, 
      'test-session-enhanced', 
      testContext
    );
    
    console.log('\n✅ Enhanced flow test successful!');
    console.log('📝 Response message:', result.message.substring(0, 150) + '...');
    console.log('🔧 Actions:', result.actions);
    console.log('📝 Form Updates:', result.formUpdates);
    console.log('🧭 Navigate To Step:', result.navigateToStep);
    console.log('📊 Extracted Parameters:', JSON.stringify(result.extractedParameters, null, 2));
    console.log('✅ Validation Result:', JSON.stringify(result.validationResult, null, 2));
    
    return true;
    
  } catch (error) {
    console.error('❌ Enhanced flow test failed!');
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

async function testPromptManager() {
  console.log('\n🔧 Testing Prompt Manager Functions\n');
  
  try {
    // Test conversation prompt
    console.log('💬 Test Conversation Prompt:');
    const conversationPrompt = promptManager.getConversationPrompt({
      currentStep: 2,
      formData: { scenario: { numMCS: 1, numCEV: 2 } },
      previousActions: ['Configured scenario']
    });
    console.log('Conversation prompt length:', conversationPrompt.length);
    console.log('First 200 chars:', conversationPrompt.substring(0, 200) + '...');
    
    // Test parameter extractor prompt
    console.log('\n📊 Test Parameter Extractor Prompt:');
    const extractorPrompt = promptManager.getParameterExtractorPrompt(
      'I need 2 MCS and 3 CEVs',
      { currentStep: 1 }
    );
    console.log('Extractor prompt length:', extractorPrompt.length);
    console.log('First 200 chars:', extractorPrompt.substring(0, 200) + '...');
    
    // Test parameter validator prompt
    console.log('\n✅ Test Parameter Validator Prompt:');
    const validatorPrompt = promptManager.getParameterValidatorPrompt(
      { scenario: { numMCS: 2, numCEV: 3 } },
      'I need 2 MCS and 3 CEVs',
      { scenario: { numMCS: 1 } }
    );
    console.log('Validator prompt length:', validatorPrompt.length);
    console.log('First 200 chars:', validatorPrompt.substring(0, 200) + '...');
    
    return true;
    
  } catch (error) {
    console.error('❌ Prompt manager test failed!');
    console.error('Error details:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Enhanced Flow Tests\n');
  
  const promptManagerTest = await testPromptManager();
  const enhancedFlowTest = await testEnhancedFlow();
  
  console.log('\n🏁 Test Results:');
  console.log('   Prompt Manager Test:', promptManagerTest ? '✅ PASSED' : '❌ FAILED');
  console.log('   Enhanced Flow Test:', enhancedFlowTest ? '✅ PASSED' : '❌ FAILED');
  
  if (promptManagerTest && enhancedFlowTest) {
    console.log('\n🎉 All tests passed! Enhanced flow is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testEnhancedFlow, testPromptManager };
