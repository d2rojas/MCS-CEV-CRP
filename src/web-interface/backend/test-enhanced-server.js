const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testEnhancedServer() {
  console.log('🧪 Testing Enhanced Server with New Prompt Flow\n');
  
  const testMessage = {
    message: 'I need to configure a scenario with 1 MCS, 2 CEVs, and 3 nodes for 24-hour operation with charging efficiency of 90%',
    sessionId: 'test-session-enhanced-server',
    context: {
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
    }
  };
  
  try {
    console.log('📝 Test message:', testMessage.message);
    console.log('📋 Test context:', JSON.stringify(testMessage.context, null, 2));
    
    console.log('\n📡 Sending request to enhanced chat endpoint...');
    
    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Enhanced server test successful!');
    console.log('📝 Response:');
    console.log('   Success:', data.success);
    console.log('   Message:', data.message.substring(0, 150) + '...');
    console.log('   Actions:', data.actions);
    console.log('   Form Updates:', data.formUpdates);
    console.log('   Navigate To Step:', data.navigateToStep);
    console.log('   Session ID:', data.sessionId);
    
    if (data.extractedParameters) {
      console.log('\n📊 Extracted Parameters:');
      console.log('   Scenario:', data.extractedParameters.scenario);
      console.log('   Parameters:', data.extractedParameters.parameters);
      console.log('   Confidence:', data.extractedParameters.extraction_confidence);
    }
    
    if (data.validationResult) {
      console.log('\n✅ Validation Result:');
      console.log('   Is Valid:', data.validationResult.is_valid);
      console.log('   Validation Score:', data.validationResult.validation_score);
      console.log('   Completeness:', data.validationResult.completeness);
      console.log('   Range Validation:', data.validationResult.range_validation);
      console.log('   Consistency Check:', data.validationResult.consistency_check);
      console.log('   Suggestions:', data.validationResult.suggestions);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Enhanced server test failed!');
    console.error('Error details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solution: Make sure the backend server is running on port 3002');
    }
    
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  
  try {
    const response = await fetch('http://localhost:3002/api/health');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Health endpoint test successful!');
    console.log('📝 Response:', data);
    
    return true;
    
  } catch (error) {
    console.error('❌ Health endpoint test failed!');
    console.error('Error details:', error.message);
    return false;
  }
}

async function runServerTests() {
  console.log('🚀 Starting Enhanced Server Tests\n');
  
  const healthTest = await testHealthEndpoint();
  
  if (healthTest) {
    await testEnhancedServer();
  } else {
    console.log('❌ Skipping enhanced server test due to health check failure');
  }
  
  console.log('\n🏁 Enhanced server tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runServerTests().catch(console.error);
}

module.exports = { testEnhancedServer, testHealthEndpoint };
