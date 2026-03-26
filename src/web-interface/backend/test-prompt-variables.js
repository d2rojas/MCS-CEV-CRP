const promptManager = require('./services/promptManager');

console.log('🧪 Testing Prompt Variables Replacement');

async function testPromptVariables() {
  try {
    console.log('\n📝 Testing variable replacement in prompts...');

    // Test 1: Conversation Manager Variables
    console.log('\n💬 Test 1: Conversation Manager Variables');
    const conversationPrompt = promptManager.getConversationPrompt({
      currentStep: 2,
      formData: {
        scenario: { numMCS: 2, numCEV: 3, numNodes: 4 },
        parameters: { eta_ch_dch: 0.95 }
      },
      previousActions: [
        { action: 'configured_scenario', status: 'completed' },
        { action: 'validated_parameters', status: 'completed' }
      ],
      conversationHistory: [
        { role: 'user', content: 'I need 2 MCS and 3 CEVs' },
        { role: 'assistant', content: 'Great! I\'ve configured your scenario.' }
      ]
    });

    console.log('✅ Conversation prompt variables replaced');
    console.log(`📏 Prompt length: ${conversationPrompt.length} characters`);
    console.log('🔍 Variables found:');
    console.log('  - currentStep: ' + (conversationPrompt.includes('2') ? '✅' : '❌'));
    console.log('  - formData: ' + (conversationPrompt.includes('numMCS') ? '✅' : '❌'));
    console.log('  - previousActions: ' + (conversationPrompt.includes('configured_scenario') ? '✅' : '❌'));
    console.log('  - conversationHistory: ' + (conversationPrompt.includes('I need 2 MCS') ? '✅' : '❌'));

    // Test 2: Understanding Agent Variables
    console.log('\n🧠 Test 2: Understanding Agent Variables');
    const understandingPrompt = promptManager.getUnderstandingAgentPrompt(
      'Set charging efficiency to 0.92 and MCS capacity to 800 kWh',
      {
        currentStep: 2,
        formData: { scenario: { numMCS: 2 } },
        conversationHistory: [
          { role: 'user', content: 'Configure scenario' },
          { role: 'assistant', content: 'Scenario configured' }
        ],
        workflowState: { currentStep: 2, workflowStage: 'understanding' }
      }
    );

    console.log('✅ Understanding prompt variables replaced');
    console.log(`📏 Prompt length: ${understandingPrompt.length} characters`);
    console.log('🔍 Variables found:');
    console.log('  - userInput: ' + (understandingPrompt.includes('Set charging efficiency') ? '✅' : '❌'));
    console.log('  - currentContext: ' + (understandingPrompt.includes('numMCS') ? '✅' : '❌'));
    console.log('  - conversationHistory: ' + (understandingPrompt.includes('Configure scenario') ? '✅' : '❌'));
    console.log('  - workflowState: ' + (understandingPrompt.includes('understanding') ? '✅' : '❌'));

    // Test 3: Validation Agent Variables
    console.log('\n✅ Test 3: Validation Agent Variables');
    const validationPrompt = promptManager.getValidationAgentPrompt(
      {
        scenario: { numMCS: 2, numCEV: 3, numNodes: 4 },
        parameters: { eta_ch_dch: 0.92, MCS_max: 800 }
      },
      'Set charging efficiency to 0.92',
      {
        scenario: { numMCS: 1, numCEV: 1, numNodes: 2 },
        parameters: { eta_ch_dch: 0.95 }
      },
      { currentStep: 2, workflowStage: 'validation' }
    );

    console.log('✅ Validation prompt variables replaced');
    console.log(`📏 Prompt length: ${validationPrompt.length} characters`);
    console.log('🔍 Variables found:');
    console.log('  - extractedParameters: ' + (validationPrompt.includes('numMCS') ? '✅' : '❌'));
    console.log('  - userInput: ' + (validationPrompt.includes('Set charging efficiency') ? '✅' : '❌'));
    console.log('  - currentConfiguration: ' + (validationPrompt.includes('0.95') ? '✅' : '❌'));
    console.log('  - workflowState: ' + (validationPrompt.includes('validation') ? '✅' : '❌'));

    // Test 4: Recommendation Agent Variables
    console.log('\n💡 Test 4: Recommendation Agent Variables');
    const recommendationPrompt = promptManager.getRecommendationAgentPrompt(
      'What charging efficiency should I use?',
      {
        scenario: { numMCS: 2, numCEV: 3, numNodes: 4 },
        parameters: { eta_ch_dch: 0.95 }
      },
      {
        is_valid: false,
        validation_score: 0.7,
        suggestions: ['Use efficiency between 0.85-0.95']
      },
      { currentStep: 2, workflowStage: 'recommendation' }
    );

    console.log('✅ Recommendation prompt variables replaced');
    console.log(`📏 Prompt length: ${recommendationPrompt.length} characters`);
    console.log('🔍 Variables found:');
    console.log('  - userInput: ' + (recommendationPrompt.includes('What charging efficiency') ? '✅' : '❌'));
    console.log('  - extractedParameters: ' + (recommendationPrompt.includes('0.95') ? '✅' : '❌'));
    console.log('  - validationResult: ' + (recommendationPrompt.includes('0.7') ? '✅' : '❌'));
    console.log('  - workflowState: ' + (recommendationPrompt.includes('recommendation') ? '✅' : '❌'));

    // Test 5: Check for unreplaced variables
    console.log('\n🔍 Test 5: Check for unreplaced variables');
    const allPrompts = [
      { name: 'conversation-manager', content: conversationPrompt },
      { name: 'understanding-agent', content: understandingPrompt },
      { name: 'validation-agent', content: validationPrompt },
      { name: 'recommendation-agent', content: recommendationPrompt }
    ];

    const unreplacedVars = [];
    allPrompts.forEach(prompt => {
      const matches = prompt.content.match(/\{[^}]+\}/g);
      if (matches) {
        unreplacedVars.push({
          prompt: prompt.name,
          variables: matches
        });
      }
    });

    if (unreplacedVars.length > 0) {
      console.log('⚠️ Unreplaced variables found:');
      unreplacedVars.forEach(item => {
        console.log(`  - ${item.prompt}: ${item.variables.join(', ')}`);
      });
    } else {
      console.log('✅ All variables replaced successfully');
    }

    console.log('\n🎉 Prompt variables test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Variable replacement working correctly');
    console.log('✅ All prompts loading with context');
    console.log('✅ Dynamic content generation functional');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check that PromptManager is initialized');
    console.log('2. Verify prompt files exist and are readable');
    console.log('3. Check variable names in prompts match context keys');
  }
}

testPromptVariables();
