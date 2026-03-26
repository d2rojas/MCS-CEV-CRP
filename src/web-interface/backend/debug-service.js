const openaiService = require('./services/openaiService');

async function debugService() {
  console.log('🔍 Debugging OpenAI Service...');
  
  const testMessage = 'I need to configure a scenario with 1 MCS, 2 CEVs, and 3 nodes';
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
    
    console.log('\n🧪 Testing processMessage...');
    
    const result = await openaiService.processMessage(testMessage, 'test-session', testContext);
    
    console.log('✅ Service test successful!');
    console.log('📝 Result:');
    console.log('   Message:', result.message.substring(0, 100) + '...');
    console.log('   Actions:', result.actions);
    console.log('   Form Updates:', result.formUpdates);
    console.log('   Navigate To Step:', result.navigateToStep);
    console.log('   Conversation State:', result.conversationState);
    
    return true;
    
  } catch (error) {
    console.error('❌ Service test failed!');
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run debug if this file is executed directly
if (require.main === module) {
  debugService().catch(console.error);
}

module.exports = { debugService };
