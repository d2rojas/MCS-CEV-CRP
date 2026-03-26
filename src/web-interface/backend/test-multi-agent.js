const agentOrchestrator = require('./services/agentOrchestrator');

async function testMultiAgentSystem() {
  console.log('🧪 Testing Multi-Agent System\n');
  
  const sessionId = 'test-multi-agent-session';
  
  // Test the exact conversation from the user
  const conversation = [
    "I need to optimize charging for 3 electric excavators at 2 construction sites",
    "can you recommend me a value?",
    "yes is for 24 hours"
  ];
  
  console.log('💬 Testing Multi-Agent Conversation Flow\n');
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`\n📝 Message ${i + 1}: "${message}"`);
    console.log('🔄 Processing with multi-agent system...');
    
    try {
      const result = await agentOrchestrator.processMessage(
        message,
        sessionId,
        { currentStep: 1 }
      );
      
      console.log(`🤖 AI Response: ${result.message.substring(0, 200)}...`);
      
      // Check agent results
      console.log('\n📊 Agent Results:');
      
      // Understanding Agent
      if (result.extractedParameters && Object.keys(result.extractedParameters).length > 0) {
        console.log('🧠 Understanding Agent: ✅ Extracted parameters');
        if (result.extractedParameters.scenario) {
          console.log(`   Scenario: ${JSON.stringify(result.extractedParameters.scenario)}`);
        }
      } else {
        console.log('🧠 Understanding Agent: ❌ No parameters extracted');
      }
      
      // Validation Agent
      if (result.validationResult) {
        console.log(`✅ Validation Agent: ${result.validationResult.is_valid ? 'Valid' : 'Invalid'}`);
        if (!result.validationResult.is_valid && result.validationResult.suggestions) {
          console.log(`   Suggestions: ${result.validationResult.suggestions.join(', ')}`);
        }
      }
      
      // Recommendation Agent
      if (result.recommendations && result.recommendations.recommendations && result.recommendations.recommendations.length > 0) {
        console.log(`💡 Recommendation Agent: ${result.recommendations.recommendations.length} recommendations`);
        result.recommendations.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.parameter}: ${rec.recommended_value} (${rec.reasoning})`);
        });
      } else {
        console.log('💡 Recommendation Agent: No recommendations needed');
      }
      
      // Workflow State
      if (result.workflowState) {
        console.log(`🔄 Workflow State: ${result.workflowState.workflowStage}`);
      }
      
      // Actions
      if (result.actions && result.actions.length > 0) {
        console.log('🔧 Actions:');
        result.actions.forEach(action => {
          console.log(`   - ${action.description} (${action.status})`);
        });
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Error in message ${i + 1}:`, error.message);
    }
  }
  
  // Test workflow state
  console.log('📚 Testing Workflow State Management...');
  const workflowState = agentOrchestrator.getWorkflowState(sessionId);
  console.log('Workflow State:', JSON.stringify(workflowState, null, 2));
  
  // Test conversation history
  console.log('\n📚 Testing Conversation History...');
  const history = agentOrchestrator.getConversationHistory(sessionId);
  console.log(`Total messages in history: ${history.length}`);
  
  if (history.length >= 6) {
    console.log('✅ Conversation history is being maintained');
  } else {
    console.log('❌ Conversation history not properly maintained');
  }
}

async function testAgentSpecialization() {
  console.log('\n🔧 Testing Agent Specialization\n');
  
  const testCases = [
    {
      name: 'Scenario Configuration',
      message: 'I need 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation',
      expectedAgents: ['understanding', 'validation']
    },
    {
      name: 'Parameter Recommendation',
      message: 'What charging efficiency should I use?',
      expectedAgents: ['understanding', 'recommendation']
    },
    {
      name: 'Validation Issues',
      message: 'Set MCS capacity to 50 kWh',
      expectedAgents: ['understanding', 'validation', 'recommendation']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    
    try {
      const result = await agentOrchestrator.processMessage(
        testCase.message,
        'test-specialization',
        { currentStep: 1 }
      );
      
      console.log(`🤖 Response: ${result.message.substring(0, 150)}...`);
      
      // Check which agents were active
      const activeAgents = [];
      if (result.extractedParameters && Object.keys(result.extractedParameters).length > 0) {
        activeAgents.push('understanding');
      }
      if (result.validationResult) {
        activeAgents.push('validation');
      }
      if (result.recommendations && result.recommendations.recommendations && result.recommendations.recommendations.length > 0) {
        activeAgents.push('recommendation');
      }
      
      console.log(`🔧 Active Agents: ${activeAgents.join(', ')}`);
      
      const expectedAgents = testCase.expectedAgents;
      const allExpectedActive = expectedAgents.every(agent => activeAgents.includes(agent));
      
      if (allExpectedActive) {
        console.log('✅ All expected agents were active');
      } else {
        console.log('❌ Not all expected agents were active');
        console.log(`   Expected: ${expectedAgents.join(', ')}`);
        console.log(`   Actual: ${activeAgents.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

async function runMultiAgentTests() {
  console.log('🚀 Starting Multi-Agent System Tests\n');
  
  await testMultiAgentSystem();
  await testAgentSpecialization();
  
  console.log('\n🏁 Multi-agent tests completed!');
  console.log('\n💡 System Features:');
  console.log('1. 🧠 Understanding Agent: Extracts parameters from natural language');
  console.log('2. ✅ Validation Agent: Validates parameters and identifies issues');
  console.log('3. 💡 Recommendation Agent: Provides contextual recommendations');
  console.log('4. 💬 Conversation Manager: Generates natural responses');
  console.log('5. 🔄 Workflow Orchestrator: Coordinates all agents');
  console.log('6. 📚 Context Management: Maintains conversation history and state');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runMultiAgentTests().catch(console.error);
}

module.exports = { testMultiAgentSystem, testAgentSpecialization };
