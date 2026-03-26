console.log('🧪 Testing Complete Scenario - Step 7 Fix');

async function testCompleteScenario() {
  try {
    console.log('\n🚀 Testing the complete scenario from user feedback...');

    // Step 1: Scenario Configuration
    console.log('\n📋 Step 1: Scenario Configuration');
    const step1Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation with scenario name "Construction Site Optimization"',
        sessionId: 'test-complete-scenario'
      })
    });

    const step1Data = await step1Response.json();
    console.log('✅ Step 1 Status:', step1Data.success);
    console.log('🚀 Navigate To Step:', step1Data.navigateToStep);
    console.log('📝 AI Message:', step1Data.message.substring(0, 150) + '...');

    // Step 2: Model Parameters
    console.log('\n📋 Step 2: Model Parameters');
    const step2Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'default parameters are okay for me',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 2 }
      })
    });

    const step2Data = await step2Response.json();
    console.log('✅ Step 2 Status:', step2Data.success);
    console.log('🚀 Navigate To Step:', step2Data.navigateToStep);

    // Step 3: EV Configuration
    console.log('\n📋 Step 3: EV Configuration');
    const step3Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Configure the EVs with battery capacity of 150 kWh each',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 3 }
      })
    });

    const step3Data = await step3Response.json();
    console.log('✅ Step 3 Status:', step3Data.success);
    console.log('🚀 Navigate To Step:', step3Data.navigateToStep);

    // Step 4: Location Data
    console.log('\n📋 Step 4: Location Data');
    const step4Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'default locations',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 4 }
      })
    });

    const step4Data = await step4Response.json();
    console.log('✅ Step 4 Status:', step4Data.success);
    console.log('🚀 Navigate To Step:', step4Data.navigateToStep);

    // Step 5: Time Data
    console.log('\n📋 Step 5: Time Data');
    const step5Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'default, caiso values',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 5 }
      })
    });

    const step5Data = await step5Response.json();
    console.log('✅ Step 5 Status:', step5Data.success);
    console.log('🚀 Navigate To Step:', step5Data.navigateToStep);

    // Step 6: Distance Matrices
    console.log('\n📋 Step 6: Distance Matrices');
    const step6Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Set up distance matrix with all distances equal to 1 km',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 6 }
      })
    });

    const step6Data = await step6Response.json();
    console.log('✅ Step 6 Status:', step6Data.success);
    console.log('🚀 Navigate To Step:', step6Data.navigateToStep);
    console.log('📝 AI Message:', step6Data.message.substring(0, 200) + '...');

    // Step 7: Work Data (THE CRITICAL STEP)
    console.log('\n📋 Step 7: Work Data (Critical Test)');
    const step7Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Set up work schedule from 8 AM to 5 PM with lunch break 12-1 PM, work power 3 kW, break power 0.5 kW',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 7 }
      })
    });

    const step7Data = await step7Response.json();
    console.log('✅ Step 7 Status:', step7Data.success);
    console.log('🚀 Navigate To Step:', step7Data.navigateToStep);
    console.log('📝 AI Message:', step7Data.message.substring(0, 200) + '...');

    // Step 8: Summary
    console.log('\n📋 Step 8: Summary');
    const step8Response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Everything looks good, generate the files',
        sessionId: 'test-complete-scenario',
        context: { currentStep: 8 }
      })
    });

    const step8Data = await step8Response.json();
    console.log('✅ Step 8 Status:', step8Data.success);
    console.log('🚀 Navigate To Step:', step8Data.navigateToStep);

    console.log('\n🎉 Complete Scenario Test Results:');
    console.log('✅ Step 1 → Step 2:', step1Data.navigateToStep === 2 ? 'PASS' : 'FAIL');
    console.log('✅ Step 2 → Step 3:', step2Data.navigateToStep === 3 ? 'PASS' : 'FAIL');
    console.log('✅ Step 3 → Step 4:', step3Data.navigateToStep === 4 ? 'PASS' : 'FAIL');
    console.log('✅ Step 4 → Step 5:', step4Data.navigateToStep === 5 ? 'PASS' : 'FAIL');
    console.log('✅ Step 5 → Step 6:', step5Data.navigateToStep === 6 ? 'PASS' : 'FAIL');
    console.log('✅ Step 6 → Step 7:', step6Data.navigateToStep === 7 ? 'PASS' : 'FAIL');
    console.log('✅ Step 7 → Step 8:', step7Data.navigateToStep === 8 ? 'PASS' : 'FAIL');
    console.log('✅ Step 8 → Stay:', step8Data.navigateToStep === 8 ? 'PASS' : 'FAIL');

    const allStepsPassed = [
      step1Data.navigateToStep === 2,
      step2Data.navigateToStep === 3,
      step3Data.navigateToStep === 4,
      step4Data.navigateToStep === 5,
      step5Data.navigateToStep === 6,
      step6Data.navigateToStep === 7,
      step7Data.navigateToStep === 8,
      step8Data.navigateToStep === 8
    ].every(passed => passed);

    console.log('\n🎯 Overall Result:', allStepsPassed ? '✅ ALL STEPS WORKING' : '❌ ISSUES DETECTED');
    
    if (allStepsPassed) {
      console.log('🎉 The system is now working correctly! No more loops!');
    } else {
      console.log('🔧 Some steps need attention. Check the navigation logic.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteScenario();
