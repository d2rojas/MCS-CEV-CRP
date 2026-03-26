const fetch = require('node-fetch').default;

async function testReActCoTOrchestrator() {
  console.log('🧪 Testing ReAct + CoT Agent Orchestrator');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Parameter Extraction Test',
      message: 'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation',
      expectedFlow: 'parameter_extraction'
    },
    {
      name: 'Simple Question Test',
      message: 'What is the difference between MCS and CEV?',
      expectedFlow: 'simple_question'
    },
    {
      name: 'Validation Request Test',
      message: 'Can you validate my current configuration?',
      expectedFlow: 'validation_request'
    },
    {
      name: 'Recommendation Request Test',
      message: 'What would you recommend for optimal charging efficiency?',
      expectedFlow: 'recommendation_request'
    },
    {
      name: 'Complex Analysis Test',
      message: 'I want to optimize a construction site with 3 MCS, 5 CEVs, 6 nodes, 24-hour operation, and need recommendations for battery capacity',
      expectedFlow: 'full_analysis'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`💬 Message: "${testCase.message}"`);
    console.log(`🎯 Expected Flow: ${testCase.expectedFlow}`);
    
    try {
      const response = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          sessionId: 'test-react-cot-session',
          context: {
            currentStep: 1,
            formData: {}
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ Response Status: ${data.success ? 'Success' : 'Failed'}`);
      console.log(`🧠 Flow Type: ${data.flowAnalysis?.flowType || 'Unknown'}`);
      console.log(`🎯 Confidence: ${data.flowAnalysis?.confidence || 'N/A'}`);
      console.log(`💭 Reasoning: ${data.flowAnalysis?.reasoning?.substring(0, 100)}...`);
      
      // Check ReAct Chain
      if (data.reactChain && data.reactChain.length > 0) {
        console.log(`🔄 ReAct Chain Steps: ${data.reactChain.length}`);
        data.reactChain.forEach((step, index) => {
          console.log(`   Step ${index + 1}: ${step.thought.substring(0, 50)}...`);
        });
      }
      
      // Check Orchestration Chain
      if (data.orchestrationChain && data.orchestrationChain.length > 0) {
        console.log(`🎯 Orchestration Chain Steps: ${data.orchestrationChain.length}`);
        data.orchestrationChain.forEach((step, index) => {
          console.log(`   Step ${index + 1}: ${step.action.substring(0, 50)}...`);
        });
      }
      
      // Validate flow type
      const actualFlow = data.flowAnalysis?.flowType;
      if (actualFlow === testCase.expectedFlow) {
        console.log(`✅ Flow Type Match: Expected ${testCase.expectedFlow}, Got ${actualFlow}`);
      } else {
        console.log(`❌ Flow Type Mismatch: Expected ${testCase.expectedFlow}, Got ${actualFlow}`);
      }
      
      console.log(`💬 AI Response: ${data.message.substring(0, 100)}...`);
      
    } catch (error) {
      console.error(`❌ Test Failed: ${error.message}`);
    }
    
    console.log('-'.repeat(40));
  }

  console.log('\n🎉 ReAct + CoT Orchestrator Test Complete!');
}

async function testReActCoTPerformance() {
  console.log('\n🚀 Testing ReAct + CoT Performance');
  console.log('='.repeat(60));

  const testMessage = 'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation';
  
  console.log(`💬 Test Message: "${testMessage}"`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        sessionId: 'test-react-cot-performance',
        context: {
          currentStep: 1,
          formData: {}
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Total Response Time: ${duration}ms`);
    console.log(`🧠 Analysis Time: ~${duration * 0.3}ms (estimated)`);
    console.log(`🎯 Orchestration Time: ~${duration * 0.5}ms (estimated)`);
    console.log(`💬 Conversation Time: ~${duration * 0.2}ms (estimated)`);
    
    console.log(`✅ Success: ${data.success}`);
    console.log(`🔄 ReAct Chain Length: ${data.reactChain?.length || 0}`);
    console.log(`🎯 Orchestration Chain Length: ${data.orchestrationChain?.length || 0}`);
    
  } catch (error) {
    console.error(`❌ Performance Test Failed: ${error.message}`);
  }
}

async function runAllTests() {
  try {
    // Check if server is running
    const healthResponse = await fetch('http://localhost:3002/api/health');
    if (!healthResponse.ok) {
      console.log('❌ Server not running. Please start the server first.');
      return;
    }
    
    console.log('✅ Server is running. Starting ReAct + CoT tests...\n');
    
    await testReActCoTOrchestrator();
    await testReActCoTPerformance();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.log('\n💡 Make sure the server is running on port 3002');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testReActCoTOrchestrator,
  testReActCoTPerformance,
  runAllTests
};
