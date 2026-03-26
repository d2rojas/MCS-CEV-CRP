console.log('🧪 Testing Proactive Conversation Manager');

async function testProactiveConversation() {
  try {
    console.log('\n📋 Testing proactive conversation flow...');

    // Test 1: Scenario configuration
    console.log('\n🧪 Test 1: Scenario Configuration');
    const response1 = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I need to configure a scenario with 2 MCS, 5 CEVs, and 4 nodes for 24-hour operation',
        sessionId: 'test-proactive-conversation',
        context: {
          currentStep: 1
        }
      })
    });

    const data1 = await response1.json();
    console.log('✅ Response 1 Status:', data1.success);
    console.log('📝 AI Message 1:', data1.message.substring(0, 200) + '...');
    console.log('🚀 Navigate To Step:', data1.navigateToStep);
    
    // Check if the response is proactive
    const isProactive1 = !data1.message.includes('How can I assist you') && 
                        !data1.message.includes('What would you like') &&
                        !data1.message.includes('Let me know');
    
    console.log('🎯 Is Proactive Response 1:', isProactive1 ? '✅ YES' : '❌ NO');

    // Test 2: Model parameters (simulating step 2)
    console.log('\n🧪 Test 2: Model Parameters (Step 2)');
    const response2 = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Use default parameters for construction equipment',
        sessionId: 'test-proactive-conversation',
        context: {
          currentStep: 2,
          formData: {
            scenario: {
              numMCS: 2,
              numCEV: 5,
              numNodes: 4,
              is24Hours: true,
              scenarioName: 'Test Scenario'
            }
          }
        }
      })
    });

    const data2 = await response2.json();
    console.log('✅ Response 2 Status:', data2.success);
    console.log('📝 AI Message 2:', data2.message.substring(0, 200) + '...');
    console.log('🚀 Navigate To Step:', data2.navigateToStep);
    
    // Check if the response is proactive
    const isProactive2 = !data2.message.includes('How can I assist you') && 
                        !data2.message.includes('What would you like') &&
                        !data2.message.includes('Let me know');
    
    console.log('🎯 Is Proactive Response 2:', isProactive2 ? '✅ YES' : '❌ NO');

    // Overall assessment
    console.log('\n🎉 Proactive Conversation Test Results:');
    console.log('✅ Test 1 (Scenario):', isProactive1 ? 'PASS' : 'FAIL');
    console.log('✅ Test 2 (Parameters):', isProactive2 ? 'PASS' : 'FAIL');
    
    const overallSuccess = isProactive1 && isProactive2;
    console.log('\n🎯 Overall Result:', overallSuccess ? '✅ CONVERSATION MANAGER IS PROACTIVE' : '❌ NEEDS IMPROVEMENT');
    
    if (overallSuccess) {
      console.log('🎉 The Conversation Manager is now properly proactive and guiding the user!');
    } else {
      console.log('🔧 The Conversation Manager still needs to be more proactive.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProactiveConversation();
