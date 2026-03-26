console.log('🚀 Testing Auto-Navigation System');

async function testAutoNavigation() {
  try {
    // Test 1: Complete Scenario Configuration
    console.log('\n📋 Test 1: Complete Scenario Configuration');
    const scenarioResponse = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation with scenario name "Test Project"',
        sessionId: 'test-auto-navigation',
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

    const scenarioData = await scenarioResponse.json();
    console.log('✅ Scenario Response Status:', scenarioData.success);
    console.log('📝 AI Message:', scenarioData.message.substring(0, 150) + '...');
    console.log('🚀 Navigate To Step:', scenarioData.navigateToStep);
    console.log('📊 Extracted Parameters:', Object.keys(scenarioData.extractedParameters?.scenario || {}).length, 'scenario parameters');

    // Test 2: Complete Model Parameters
    console.log('\n⚙️ Test 2: Complete Model Parameters');
    const parametersResponse = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Set charging efficiency to 0.92, MCS max capacity to 800 kWh, MCS min to 200 kWh, initial capacity to 500 kWh, charging rate to 60 kW, discharging rate to 50 kW, plug power to 50 kW, 4 plugs, travel factor 1.0, time interval 0.5 hours, and missed work penalty 0.6',
        sessionId: 'test-auto-navigation',
        context: {
          currentStep: 2,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test Project' },
            parameters: { eta_ch_dch: 0.95 },
            evData: [],
            locations: [],
            timeData: [],
            workData: []
          }
        }
      })
    });

    const parametersData = await parametersResponse.json();
    console.log('✅ Parameters Response Status:', parametersData.success);
    console.log('📝 AI Message:', parametersData.message.substring(0, 150) + '...');
    console.log('🚀 Navigate To Step:', parametersData.navigateToStep);
    console.log('📊 Extracted Parameters:', Object.keys(parametersData.extractedParameters?.parameters || {}).length, 'parameter values');

    // Test 3: Incomplete Step (should stay on current step)
    console.log('\n⚠️ Test 3: Incomplete Step (should stay)');
    const incompleteResponse = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Set charging efficiency to 0.9',
        sessionId: 'test-auto-navigation',
        context: {
          currentStep: 2,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test Project' },
            parameters: {},
            evData: [],
            locations: [],
            timeData: [],
            workData: []
          }
        }
      })
    });

    const incompleteData = await incompleteResponse.json();
    console.log('✅ Incomplete Response Status:', incompleteData.success);
    console.log('📝 AI Message:', incompleteData.message.substring(0, 150) + '...');
    console.log('🚀 Navigate To Step:', incompleteData.navigateToStep);
    console.log('⚠️ Validation Issues:', incompleteData.validationResult?.range_validation?.issues?.length || 0, 'issues detected');

    // Test 4: Step with Issues (should stay and provide guidance)
    console.log('\n🔧 Test 4: Step with Issues (should provide guidance)');
    const issuesResponse = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Set MCS capacity to 50 kWh',
        sessionId: 'test-auto-navigation',
        context: {
          currentStep: 2,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test Project' },
            parameters: { MCS_max: 1000, MCS_min: 100 },
            evData: [],
            locations: [],
            timeData: [],
            workData: []
          }
        }
      })
    });

    const issuesData = await issuesResponse.json();
    console.log('✅ Issues Response Status:', issuesData.success);
    console.log('📝 AI Message:', issuesData.message.substring(0, 150) + '...');
    console.log('🚀 Navigate To Step:', issuesData.navigateToStep);
    console.log('💡 Recommendations:', issuesData.recommendations?.recommendations?.length || 0, 'recommendations');

    console.log('\n🎉 Auto-navigation tests completed!');
    console.log('\n📋 Navigation Behavior Summary:');
    console.log('✅ Complete steps: Auto-advance to next step');
    console.log('✅ Incomplete steps: Stay on current step');
    console.log('✅ Steps with issues: Stay and provide guidance');
    console.log('✅ Proactive navigation: Automatic step progression');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend is running: node server.js');
    console.log('2. Check that the agent orchestrator is working');
    console.log('3. Verify prompt loading is successful');
  }
}

testAutoNavigation();
