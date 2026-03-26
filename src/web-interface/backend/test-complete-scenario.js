const enhancedOpenAIService = require('./services/enhancedOpenAIService');

async function testCompleteScenario() {
  console.log('🧪 Testing Complete Scenario with All Parameters\n');
  
  const testMessage = `I need to configure a complete MCS-CEV optimization scenario with the following specifications:

Scenario: 2 Mobile Charging Stations, 3 Construction Electric Vehicles, 4 nodes (1 grid + 3 construction sites), 24-hour operation

Model Parameters: Charging efficiency 90%, MCS capacity 800 kWh max, 150 kWh min, initial 400 kWh, charging rate 60 kW, discharging rate 60 kW, plug power 60 kW, 4 plugs per MCS, travel energy factor 1.2 kWh/mile, time interval 0.5 hours, missed work penalty 0.7

Electric Vehicles: 
- EV1: SOE min 15%, max 95%, initial 85%, charging rate 55 kW
- EV2: SOE min 20%, max 90%, initial 80%, charging rate 50 kW  
- EV3: SOE min 18%, max 92%, initial 82%, charging rate 52 kW

Locations: Grid Node, Construction Site A, Construction Site B, Construction Site C. Assign EV1 to Site A, EV2 to Site B, EV3 to Site C.

Time Data: 24-hour operation with 96 periods, peak hours 6-10 AM and 4-8 PM with higher prices and CO2 emissions.

Distances: Grid to Site A: 5km, Grid to Site B: 8km, Grid to Site C: 6km, Site A to Site B: 12km, Site A to Site C: 10km, Site B to Site C: 15km.

Work Schedules: 
- EV1: Work 7 AM to 5 PM, 40 kW work power, 5 kW break power
- EV2: Work 8 AM to 6 PM, 35 kW work power, 5 kW break power
- EV3: Work 6 AM to 4 PM, 45 kW work power, 5 kW break power`;

  const testContext = {
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
  };
  
  try {
    console.log('📝 Test message length:', testMessage.length, 'characters');
    console.log('📋 Test context:', JSON.stringify(testContext, null, 2));
    
    console.log('\n🔄 Processing complete scenario with enhanced flow...');
    
    const result = await enhancedOpenAIService.processMessage(
      testMessage, 
      'test-session-complete', 
      testContext
    );
    
    console.log('\n✅ Complete scenario test successful!');
    console.log('📝 Response message:', result.message.substring(0, 200) + '...');
    console.log('🔧 Actions:', result.actions);
    console.log('📝 Form Updates:', result.formUpdates);
    console.log('🧭 Navigate To Step:', result.navigateToStep);
    
    if (result.extractedParameters) {
      console.log('\n📊 Extracted Parameters Summary:');
      console.log('   Scenario:', result.extractedParameters.scenario ? '✅ Found' : '❌ Missing');
      console.log('   Parameters:', result.extractedParameters.parameters ? '✅ Found' : '❌ Missing');
      console.log('   EV Data:', result.extractedParameters.evData && result.extractedParameters.evData.length > 0 ? '✅ Found' : '❌ Missing');
      console.log('   Locations:', result.extractedParameters.locations && result.extractedParameters.locations.length > 0 ? '✅ Found' : '❌ Missing');
      console.log('   Time Data:', result.extractedParameters.timeData ? '✅ Found' : '❌ Missing');
      console.log('   Distance Matrix:', result.extractedParameters.distanceMatrix ? '✅ Found' : '❌ Missing');
      console.log('   Work Schedules:', result.extractedParameters.workSchedules && result.extractedParameters.workSchedules.length > 0 ? '✅ Found' : '❌ Missing');
      console.log('   Extraction Confidence:', result.extractedParameters.extraction_confidence);
    }
    
    if (result.validationResult) {
      console.log('\n✅ Validation Result Summary:');
      console.log('   Is Valid:', result.validationResult.is_valid);
      console.log('   Validation Score:', result.validationResult.validation_score);
      console.log('   Completeness:', result.validationResult.completeness);
      console.log('   Range Validation:', result.validationResult.range_validation.passed ? '✅ Passed' : '❌ Failed');
      console.log('   Consistency Check:', result.validationResult.consistency_check.passed ? '✅ Passed' : '❌ Failed');
      console.log('   Missing Parameters:', result.validationResult.missing_parameters.length);
      console.log('   Suggestions:', result.validationResult.suggestions.length);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Complete scenario test failed!');
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

async function testStepByStep() {
  console.log('\n🔍 Testing Step-by-Step Parameter Extraction\n');
  
  const steps = [
    {
      name: 'Scenario Configuration',
      message: 'I need 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation',
      expectedParams: ['scenario']
    },
    {
      name: 'Model Parameters',
      message: 'Set charging efficiency to 90%, MCS capacity 800 kWh max, 150 kWh min, initial 400 kWh',
      expectedParams: ['parameters']
    },
    {
      name: 'EV Data',
      message: 'EV1: SOE min 15%, max 95%, initial 85%, charging rate 55 kW. EV2: SOE min 20%, max 90%, initial 80%, charging rate 50 kW',
      expectedParams: ['evData']
    },
    {
      name: 'Location Data',
      message: 'Grid Node, Construction Site A, Construction Site B, Construction Site C. Assign EV1 to Site A, EV2 to Site B, EV3 to Site C',
      expectedParams: ['locations']
    },
    {
      name: 'Time Data',
      message: '24-hour operation with 96 periods, peak hours 6-10 AM and 4-8 PM with higher prices',
      expectedParams: ['timeData']
    },
    {
      name: 'Distance Matrix',
      message: 'Grid to Site A: 5km, Grid to Site B: 8km, Grid to Site C: 6km, Site A to Site B: 12km',
      expectedParams: ['distanceMatrix']
    },
    {
      name: 'Work Schedules',
      message: 'EV1: Work 7 AM to 5 PM, 40 kW work power. EV2: Work 8 AM to 6 PM, 35 kW work power',
      expectedParams: ['workSchedules']
    }
  ];
  
  for (const step of steps) {
    console.log(`\n📋 Testing: ${step.name}`);
    console.log(`📝 Message: ${step.message}`);
    
    try {
      const result = await enhancedOpenAIService.processMessage(
        step.message,
        `test-session-${step.name.toLowerCase().replace(/\s+/g, '-')}`,
        { currentStep: 1 }
      );
      
      const extractedParams = result.extractedParameters;
      let foundParams = 0;
      
      for (const expectedParam of step.expectedParams) {
        if (extractedParams[expectedParam] && 
            (Array.isArray(extractedParams[expectedParam]) ? extractedParams[expectedParam].length > 0 : 
             typeof extractedParams[expectedParam] === 'object' ? Object.keys(extractedParams[expectedParam]).length > 0 : 
             extractedParams[expectedParam])) {
          foundParams++;
        }
      }
      
      console.log(`✅ ${step.name}: ${foundParams}/${step.expectedParams.length} parameters found`);
      console.log(`   Confidence: ${extractedParams.extraction_confidence}`);
      
    } catch (error) {
      console.error(`❌ ${step.name} failed:`, error.message);
    }
  }
}

async function runCompleteTests() {
  console.log('🚀 Starting Complete Scenario Tests\n');
  
  const completeTest = await testCompleteScenario();
  const stepByStepTest = await testStepByStep();
  
  console.log('\n🏁 Complete Test Results:');
  console.log('   Complete Scenario Test:', completeTest ? '✅ PASSED' : '❌ FAILED');
  console.log('   Step-by-Step Test:', stepByStepTest ? '✅ PASSED' : '❌ FAILED');
  
  if (completeTest && stepByStepTest) {
    console.log('\n🎉 All complete tests passed! Enhanced prompt system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runCompleteTests().catch(console.error);
}

module.exports = { testCompleteScenario, testStepByStep };
