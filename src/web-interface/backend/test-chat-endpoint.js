const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testChatEndpoint() {
  console.log('🧪 Testing Chat Endpoint...');
  
  const testMessage = {
    message: 'I need to configure a scenario with 1 MCS, 2 CEVs, and 3 nodes',
    sessionId: 'test-session-123',
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
    console.log('📡 Sending request to chat endpoint...');
    console.log('📝 Test message:', testMessage.message);
    
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
    
    console.log('✅ Chat endpoint test successful!');
    console.log('📝 Response:');
    console.log('   Success:', data.success);
    console.log('   Message:', data.message.substring(0, 100) + '...');
    console.log('   Actions:', data.actions);
    console.log('   Form Updates:', data.formUpdates);
    console.log('   Navigate To Step:', data.navigateToStep);
    console.log('   Session ID:', data.sessionId);
    
    return true;
    
  } catch (error) {
    console.error('❌ Chat endpoint test failed!');
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

async function runEndpointTests() {
  console.log('🚀 Starting Endpoint Tests\n');
  
  const healthTest = await testHealthEndpoint();
  
  if (healthTest) {
    await testChatEndpoint();
  } else {
    console.log('❌ Skipping chat endpoint test due to health check failure');
  }
  
  console.log('\n🏁 Endpoint tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runEndpointTests().catch(console.error);
}

module.exports = { testChatEndpoint, testHealthEndpoint };
