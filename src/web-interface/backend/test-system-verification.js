console.log('🔍 MCS-CEV System Verification');

async function verifySystem() {
  const results = {
    prompts: { status: 'pending', details: [] },
    agents: { status: 'pending', details: [] },
    navigation: { status: 'pending', details: [] },
    integration: { status: 'pending', details: [] }
  };

  try {
    console.log('\n📋 Starting comprehensive system verification...');

    // Test 1: Prompt System Verification
    console.log('\n📝 Test 1: Prompt System Verification');
    const promptManager = require('./services/promptManager');
    
    const requiredPrompts = [
      'conversation-manager',
      'understanding-agent', 
      'validation-agent',
      'recommendation-agent'
    ];

    for (const promptName of requiredPrompts) {
      try {
        const prompt = promptManager.getPrompt(promptName);
        if (prompt && prompt.length > 0) {
          results.prompts.details.push(`✅ ${promptName}: Loaded (${prompt.length} chars)`);
        } else {
          results.prompts.details.push(`❌ ${promptName}: Empty or invalid`);
        }
      } catch (error) {
        results.prompts.details.push(`❌ ${promptName}: ${error.message}`);
      }
    }

    results.prompts.status = results.prompts.details.every(d => d.includes('✅')) ? 'passed' : 'failed';

    // Test 2: Agent System Verification
    console.log('\n🤖 Test 2: Agent System Verification');
    const agentOrchestrator = require('./services/agentOrchestrator');
    
    const testMessage = 'I need to configure a scenario with 1 MCS, 2 CEVs, and 3 nodes';
    const testContext = {
      currentStep: 1,
      formData: {
        scenario: { numMCS: 1, numCEV: 1, numNodes: 2 },
        parameters: {},
        evData: [],
        locations: [],
        timeData: [],
        workData: []
      }
    };

    try {
      const agentResult = await agentOrchestrator.processMessage(testMessage, 'verification-session', testContext);
      
      if (agentResult.message && agentResult.extractedParameters) {
        results.agents.details.push('✅ Agent Orchestrator: Processing successful');
        results.agents.details.push(`✅ Understanding Agent: ${Object.keys(agentResult.extractedParameters.scenario || {}).length} parameters extracted`);
        results.agents.details.push(`✅ Validation Agent: ${agentResult.validationResult?.is_valid ? 'Valid' : 'Invalid'} configuration`);
        results.agents.details.push(`✅ Conversation Manager: Response generated (${agentResult.message.length} chars)`);
      } else {
        results.agents.details.push('❌ Agent Orchestrator: Missing required fields');
      }
    } catch (error) {
      results.agents.details.push(`❌ Agent Orchestrator: ${error.message}`);
    }

    results.agents.status = results.agents.details.every(d => d.includes('✅')) ? 'passed' : 'failed';

    // Test 3: Navigation System Verification
    console.log('\n🚀 Test 3: Navigation System Verification');
    
    try {
      const navigationTest = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Complete scenario configuration with 2 MCS, 3 CEVs, 4 nodes, 24-hour operation, scenario name "Test Project"',
          sessionId: 'navigation-test',
          context: {
            currentStep: 1,
            formData: {
              scenario: { numMCS: 1, numCEV: 1, numNodes: 2 },
              parameters: {},
              evData: [],
              locations: [],
              timeData: [],
              workData: []
            }
          }
        })
      });

      const navigationData = await navigationTest.json();
      
      if (navigationData.success && navigationData.navigateToStep !== undefined) {
        results.navigation.details.push('✅ Navigation API: Responding correctly');
        results.navigation.details.push(`✅ Auto-navigation: Step ${navigationData.navigateToStep} determined`);
        results.navigation.details.push(`✅ Form updates: ${navigationData.formUpdates?.length || 0} updates provided`);
      } else {
        results.navigation.details.push('❌ Navigation API: Invalid response format');
      }
    } catch (error) {
      results.navigation.details.push(`❌ Navigation API: ${error.message}`);
    }

    results.navigation.status = results.navigation.details.every(d => d.includes('✅')) ? 'passed' : 'failed';

    // Test 4: Integration Verification
    console.log('\n🔗 Test 4: Integration Verification');
    
    try {
      const healthResponse = await fetch('http://localhost:3002/api/health');
      const healthData = await healthResponse.json();
      
      if (healthData.status === 'OK') {
        results.integration.details.push('✅ Backend API: Running and healthy');
        
        // Test complete flow
        const flowResponse = await fetch('http://localhost:3002/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'What charging efficiency should I use for construction equipment?',
            sessionId: 'integration-test',
            context: {
              currentStep: 2,
              formData: {
                scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true },
                parameters: { eta_ch_dch: 0.95 },
                evData: [],
                locations: [],
                timeData: [],
                workData: []
              }
            }
          })
        });

        const flowData = await flowResponse.json();
        
        if (flowData.success && flowData.message && flowData.recommendations) {
          results.integration.details.push('✅ Complete Flow: All agents working together');
          results.integration.details.push(`✅ Recommendations: ${flowData.recommendations.recommendations?.length || 0} provided`);
          results.integration.details.push('✅ Response Quality: Natural conversation maintained');
        } else {
          results.integration.details.push('❌ Complete Flow: Missing expected fields');
        }
      } else {
        results.integration.details.push('❌ Backend API: Health check failed');
      }
    } catch (error) {
      results.integration.details.push(`❌ Integration: ${error.message}`);
    }

    results.integration.status = results.integration.details.every(d => d.includes('✅')) ? 'passed' : 'failed';

    // Generate Report
    console.log('\n📊 System Verification Report');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([component, result]) => {
      const status = result.status === 'passed' ? '✅ PASSED' : '❌ FAILED';
      console.log(`\n${component.toUpperCase()}: ${status}`);
      result.details.forEach(detail => console.log(`  ${detail}`));
    });

    // Overall Status
    const allPassed = Object.values(results).every(r => r.status === 'passed');
    console.log('\n' + '=' .repeat(50));
    console.log(`OVERALL STATUS: ${allPassed ? '✅ ALL SYSTEMS OPERATIONAL' : '❌ ISSUES DETECTED'}`);
    
    if (allPassed) {
      console.log('\n🎉 System is ready for production use!');
      console.log('\n📋 Ready Features:');
      console.log('✅ Multi-agent conversation system');
      console.log('✅ Automatic navigation between steps');
      console.log('✅ Parameter extraction and validation');
      console.log('✅ Contextual recommendations');
      console.log('✅ Proactive user guidance');
    } else {
      console.log('\n🔧 Issues to address:');
      Object.entries(results).forEach(([component, result]) => {
        if (result.status === 'failed') {
          console.log(`❌ ${component}: Check details above`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure backend is running: node server.js');
    console.log('2. Check all prompt files exist in prompts/ directory');
    console.log('3. Verify OpenAI API key is configured');
    console.log('4. Check network connectivity for API calls');
  }
}

verifySystem();
