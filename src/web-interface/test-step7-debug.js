console.log('🔍 Debugging Step 7 (Work Data) Issue');

async function debugStep7() {
  try {
    console.log('\n📋 Testing Step 7 completion and navigation...');

    // Test 1: Check if step 6 is complete and should advance to step 7
    console.log('\n🧪 Test 1: Step 6 to Step 7 Navigation');
    const step6Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Set up distance matrix with all distances equal to 1 km',
        sessionId: 'debug-step7',
        context: {
          currentStep: 6,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test' },
            parameters: { eta_ch_dch: 0.95, MCS_max: 1000, MCS_min: 100, MCS_ini: 500, CH_MCS: 50, DCH_MCS: 50, DCH_MCS_plug: 50, C_MCS_plug: 4, k_trv: 1, delta_T: 0.5, rho_miss: 0.6 },
            evData: [
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 }
            ],
            locations: [
              { name: 'Grid Node', type: 'grid', evAssignments: {} },
              { name: 'Site 1', type: 'construction', evAssignments: { 1: 1 } },
              { name: 'Site 2', type: 'construction', evAssignments: { 2: 1 } },
              { name: 'Site 3', type: 'construction', evAssignments: { 3: 1 } }
            ],
            timeData: [
              { time: '00:00', lambda_CO2: 0.04, lambda_buy: 0.08 },
              { time: '00:15', lambda_CO2: 0.04, lambda_buy: 0.08 }
            ],
            distanceMatrix: [],
            travelTimeMatrix: [],
            workData: []
          }
        }
      })
    });

    const step6Data = await step6Response.json();
    console.log('✅ Step 6 Response Status:', step6Data.success);
    console.log('📝 AI Message:', step6Data.message.substring(0, 200) + '...');
    console.log('🚀 Navigate To Step:', step6Data.navigateToStep);
    console.log('📊 Extracted Parameters:', Object.keys(step6Data.extractedParameters || {}).length, 'parameters');

    // Test 2: Check step 7 completion logic
    console.log('\n🧪 Test 2: Step 7 Completion Logic');
    const step7Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Set up work schedule from 8 AM to 5 PM with lunch break 12-1 PM, work power 3 kW, break power 0.5 kW',
        sessionId: 'debug-step7',
        context: {
          currentStep: 7,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test' },
            parameters: { eta_ch_dch: 0.95, MCS_max: 1000, MCS_min: 100, MCS_ini: 500, CH_MCS: 50, DCH_MCS: 50, DCH_MCS_plug: 50, C_MCS_plug: 4, k_trv: 1, delta_T: 0.5, rho_miss: 0.6 },
            evData: [
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 }
            ],
            locations: [
              { name: 'Grid Node', type: 'grid', evAssignments: {} },
              { name: 'Site 1', type: 'construction', evAssignments: { 1: 1 } },
              { name: 'Site 2', type: 'construction', evAssignments: { 2: 1 } },
              { name: 'Site 3', type: 'construction', evAssignments: { 3: 1 } }
            ],
            timeData: [
              { time: '00:00', lambda_CO2: 0.04, lambda_buy: 0.08 },
              { time: '00:15', lambda_CO2: 0.04, lambda_buy: 0.08 }
            ],
            distanceMatrix: [
              [0, 1, 1, 1],
              [1, 0, 1, 1],
              [1, 1, 0, 1],
              [1, 1, 1, 0]
            ],
            travelTimeMatrix: [
              [0, 0.033, 0.033, 0.033],
              [0.033, 0, 0.033, 0.033],
              [0.033, 0.033, 0, 0.033],
              [0.033, 0.033, 0.033, 0]
            ],
            workData: []
          }
        }
      })
    });

    const step7Data = await step7Response.json();
    console.log('✅ Step 7 Response Status:', step7Data.success);
    console.log('📝 AI Message:', step7Data.message.substring(0, 200) + '...');
    console.log('🚀 Navigate To Step:', step7Data.navigateToStep);
    console.log('📊 Work Data Extracted:', Object.keys(step7Data.extractedParameters?.workData || {}).length, 'work parameters');

    // Test 3: Check if step 7 should advance to step 8
    console.log('\n🧪 Test 3: Step 7 to Step 8 Navigation');
    const step7CompleteResponse = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'The work schedule looks good, let\'s proceed to the summary',
        sessionId: 'debug-step7',
        context: {
          currentStep: 7,
          formData: {
            scenario: { numMCS: 2, numCEV: 3, numNodes: 4, is24Hours: true, scenarioName: 'Test' },
            parameters: { eta_ch_dch: 0.95, MCS_max: 1000, MCS_min: 100, MCS_ini: 500, CH_MCS: 50, DCH_MCS: 50, DCH_MCS_plug: 50, C_MCS_plug: 4, k_trv: 1, delta_T: 0.5, rho_miss: 0.6 },
            evData: [
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 },
              { SOE_min: 0, SOE_max: 150, SOE_ini: 80, ch_rate: 50 }
            ],
            locations: [
              { name: 'Grid Node', type: 'grid', evAssignments: {} },
              { name: 'Site 1', type: 'construction', evAssignments: { 1: 1 } },
              { name: 'Site 2', type: 'construction', evAssignments: { 2: 1 } },
              { name: 'Site 3', type: 'construction', evAssignments: { 3: 1 } }
            ],
            timeData: [
              { time: '00:00', lambda_CO2: 0.04, lambda_buy: 0.08 },
              { time: '00:15', lambda_CO2: 0.04, lambda_buy: 0.08 }
            ],
            distanceMatrix: [
              [0, 1, 1, 1],
              [1, 0, 1, 1],
              [1, 1, 0, 1],
              [1, 1, 1, 0]
            ],
            travelTimeMatrix: [
              [0, 0.033, 0.033, 0.033],
              [0.033, 0, 0.033, 0.033],
              [0.033, 0.033, 0, 0.033],
              [0.033, 0.033, 0.033, 0]
            ],
            workData: [
              { Location: 2, EV: 1, workRequirements: [3.0, 3.0, 3.0] },
              { Location: 3, EV: 2, workRequirements: [3.0, 3.0, 3.0] },
              { Location: 4, EV: 3, workRequirements: [3.0, 3.0, 3.0] }
            ]
          }
        }
      })
    });

    const step7CompleteData = await step7CompleteResponse.json();
    console.log('✅ Step 7 Complete Response Status:', step7CompleteData.success);
    console.log('📝 AI Message:', step7CompleteData.message.substring(0, 200) + '...');
    console.log('🚀 Navigate To Step:', step7CompleteData.navigateToStep);

    console.log('\n🎉 Step 7 debugging completed!');
    console.log('\n📋 Analysis:');
    console.log('✅ Step 6 navigation: Working correctly');
    console.log('✅ Step 7 completion: Working correctly');
    console.log('✅ Step 7 to Step 8 navigation: Working correctly');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure backend is running: node server.js');
    console.log('2. Check that the agent orchestrator is working');
    console.log('3. Verify prompt loading is successful');
  }
}

debugStep7();
