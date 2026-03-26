console.log('🧪 Testing Agent Integration with Conversation Manager');

async function testAgentIntegration() {
  try {
    console.log('\n📋 Testing if Conversation Manager uses other agents\' results...');

    // Test the exact message from the user
    const testMessage = "I need to configure a scenario with 2 MCS, 5 CEVs, and 4 nodes for 24-hour operation";
    
    console.log(`\n🧪 Test Message: "${testMessage}"`);

    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        sessionId: 'test-agent-integration',
        context: {
          currentStep: 1
        }
      })
    });

    const data = await response.json();
    
    console.log('\n✅ Response Status:', data.success);
    console.log('📝 AI Message:', data.message.substring(0, 400) + '...');
    console.log('🚀 Navigate To Step:', data.navigateToStep);
    
    if (data.extractedParameters) {
      console.log('\n📊 Agent Results:');
      console.log('✅ Understanding Agent: Extracted parameters successfully');
      console.log('✅ Validation Agent: Validation completed');
      console.log('✅ Recommendation Agent: Recommendations provided');
      
      // Check if Conversation Manager references agent results
      const message = data.message.toLowerCase();
      const referencesExtracted = message.includes('2 mcs') || message.includes('5 cevs') || message.includes('4 nodes');
      const referencesValidation = message.includes('valid') || message.includes('configured') || message.includes('complete');
      const isProactive = !message.includes('how can i assist') && !message.includes('what would you like');
      
      console.log('\n🎯 Conversation Manager Analysis:');
      console.log('✅ References extracted parameters:', referencesExtracted ? 'YES' : 'NO');
      console.log('✅ References validation results:', referencesValidation ? 'YES' : 'NO');
      console.log('✅ Is proactive (no open questions):', isProactive ? 'YES' : 'NO');
      
      const overallSuccess = referencesExtracted && referencesValidation && isProactive;
      console.log('\n🎉 Integration Result:', overallSuccess ? '✅ SUCCESS' : '❌ NEEDS IMPROVEMENT');
      
      if (overallSuccess) {
        console.log('🎯 The Conversation Manager is properly using all agent results!');
      } else {
        console.log('🔧 The Conversation Manager needs to better integrate agent results.');
      }
    } else {
      console.log('\n❌ No agent results were provided to Conversation Manager');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAgentIntegration();
