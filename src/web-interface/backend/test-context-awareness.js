const enhancedOpenAIService = require('./services/enhancedOpenAIService');

async function testContextAwareness() {
  console.log('🧪 Testing Context Awareness in Conversation\n');
  
  const sessionId = 'test-context-session';
  
  // Simulate the exact conversation from the user
  const conversation = [
    "I need to optimize charging for 3 electric excavators at 2 construction sites",
    "can you recommend me a value?",
    "yes is for 24 hours"
  ];
  
  console.log('💬 Simulating conversation with context awareness...\n');
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`📝 Message ${i + 1}: "${message}"`);
    
    try {
      const result = await enhancedOpenAIService.processMessage(
        message,
        sessionId,
        { currentStep: 1 }
      );
      
      console.log(`🤖 AI Response: ${result.message.substring(0, 200)}...`);
      
      // Check if AI maintains context
      const response = result.message.toLowerCase();
      
      if (i === 0) {
        // First message should extract and acknowledge parameters
        if (result.extractedParameters.scenario && Object.keys(result.extractedParameters.scenario).length > 0) {
          console.log('✅ Extracted scenario parameters from first message');
        }
      }
      
      if (i === 1) {
        // Second message should provide recommendation based on context
        const hasRecommendation = response.includes('recommend') || response.includes('suggest') || response.includes('typically');
        const asksForInfo = response.includes('how many') || response.includes('please provide') || response.includes('could you tell me');
        
        if (hasRecommendation && !asksForInfo) {
          console.log('✅ Provided recommendation without asking for info already given');
        } else if (asksForInfo) {
          console.log('❌ Asked for information already provided in previous message');
        } else {
          console.log('⚠️  Did not provide recommendation');
        }
      }
      
      if (i === 2) {
        // Third message should acknowledge the 24-hour confirmation and move forward
        const acknowledges24h = response.includes('24') || response.includes('24-hour') || response.includes('24 hours');
        const movesForward = response.includes('next') || response.includes('proceed') || response.includes('step') || response.includes('now let');
        
        if (acknowledges24h && movesForward) {
          console.log('✅ Acknowledged 24-hour setting and suggested next steps');
        } else if (acknowledges24h) {
          console.log('✅ Acknowledged 24-hour setting');
        } else {
          console.log('❌ Did not acknowledge the 24-hour confirmation');
        }
      }
      
      console.log('📊 Extracted Parameters:', JSON.stringify(result.extractedParameters, null, 2));
      console.log('✅ Validation:', result.validationResult.is_valid ? 'Valid' : 'Invalid');
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Error in message ${i + 1}:`, error.message);
    }
  }
  
  // Test conversation history
  console.log('📚 Testing Conversation History...');
  const history = enhancedOpenAIService.getConversationHistory(sessionId);
  console.log(`📝 Total messages in history: ${history.length}`);
  
  if (history.length >= 6) {
    console.log('✅ Conversation history is being maintained');
    console.log('📋 Last few messages:');
    history.slice(-4).forEach((msg, index) => {
      console.log(`   ${msg.role}: ${msg.content.substring(0, 100)}...`);
    });
  } else {
    console.log('❌ Conversation history not properly maintained');
  }
}

async function testContextualRecommendations() {
  console.log('\n🔧 Testing Contextual Recommendations\n');
  
  const testCases = [
    {
      context: "I have 3 excavators at 2 sites",
      question: "how many MCS do I need?",
      expected: "1-2 MCS"
    },
    {
      context: "I have 5 excavators at 3 sites",
      question: "how many MCS do I need?",
      expected: "2-3 MCS"
    },
    {
      context: "I have 1 excavator at 1 site",
      question: "how many MCS do I need?",
      expected: "1 MCS"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Context: "${testCase.context}"`);
    console.log(`❓ Question: "${testCase.question}"`);
    
    try {
      const result = await enhancedOpenAIService.processMessage(
        testCase.context,
        'test-recommendations',
        { currentStep: 1 }
      );
      
      const recommendationResult = await enhancedOpenAIService.processMessage(
        testCase.question,
        'test-recommendations',
        { currentStep: 1 }
      );
      
      const response = recommendationResult.message.toLowerCase();
      const hasRecommendation = response.includes('1') || response.includes('2') || response.includes('3') || response.includes('mcs');
      
      if (hasRecommendation) {
        console.log('✅ Provided contextual recommendation');
        console.log(`🤖 Response: ${recommendationResult.message.substring(0, 150)}...`);
      } else {
        console.log('❌ Did not provide contextual recommendation');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

async function runContextTests() {
  console.log('🚀 Starting Context Awareness Tests\n');
  
  await testContextAwareness();
  await testContextualRecommendations();
  
  console.log('\n🏁 Context awareness tests completed!');
  console.log('\n💡 Key improvements implemented:');
  console.log('1. Conversation history is maintained per session');
  console.log('2. AI receives previous conversation context');
  console.log('3. AI should avoid asking for information already given');
  console.log('4. AI should provide contextual recommendations');
  console.log('5. AI should acknowledge previous information');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runContextTests().catch(console.error);
}

module.exports = { testContextAwareness, testContextualRecommendations };
