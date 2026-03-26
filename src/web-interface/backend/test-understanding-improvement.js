console.log('🧪 Testing Understanding Agent Improvement');

async function testUnderstandingAgent() {
  try {
    console.log('\n📋 Testing the specific user message...');

    // Test the exact message from the user
    const testMessage = "I need to optimize charging for 3 electric excavators at 2 construction sites";
    
    console.log(`\n🧪 Test Message: "${testMessage}"`);

    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        sessionId: 'test-understanding-improvement',
        context: {
          currentStep: 1
        }
      })
    });

    const data = await response.json();
    
    console.log('\n✅ Response Status:', data.success);
    console.log('📝 AI Message:', data.message.substring(0, 300) + '...');
    console.log('🚀 Navigate To Step:', data.navigateToStep);
    
    if (data.extractedParameters) {
      console.log('\n📊 Extracted Parameters:');
      console.log('Scenario:', data.extractedParameters.scenario || 'Not extracted');
      console.log('Parameters:', data.extractedParameters.parameters || 'Not extracted');
      console.log('EV Data:', data.extractedParameters.evData || 'Not extracted');
    }

    // Check if the agent correctly extracted the scenario
    const scenario = data.extractedParameters?.scenario;
    if (scenario) {
      console.log('\n🎯 Scenario Extraction Analysis:');
      console.log('✅ numCEV:', scenario.numCEV, '(Expected: 3)');
      console.log('✅ numNodes:', scenario.numNodes, '(Expected: 3)');
      console.log('✅ numMCS:', scenario.numMCS, '(Expected: 1)');
      console.log('✅ scenarioName:', scenario.scenarioName);
      
      const isCorrect = scenario.numCEV === 3 && scenario.numNodes === 3 && scenario.numMCS === 1;
      console.log('\n🎉 Extraction Result:', isCorrect ? '✅ SUCCESS' : '❌ FAILED');
      
      if (isCorrect) {
        console.log('🎯 The Understanding Agent is now correctly extracting parameters!');
      } else {
        console.log('🔧 The Understanding Agent still needs improvement.');
      }
    } else {
      console.log('\n❌ No scenario parameters were extracted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUnderstandingAgent();
