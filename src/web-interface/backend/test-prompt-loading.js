const promptManager = require('./services/promptManager');

console.log('🚀 Testing Prompt Manager Loading');

// Test prompt loading
console.log('\n📝 Testing prompt loading...');
console.log('Available prompts:', Object.keys(promptManager.prompts));

// Test getting specific prompts
const promptNames = ['conversation-manager', 'understanding-agent', 'validation-agent', 'recommendation-agent'];

console.log('\n🧪 Testing prompt retrieval...');
for (const promptName of promptNames) {
  try {
    const prompt = promptManager.getPrompt(promptName);
    console.log(`✅ Successfully loaded: ${promptName} (${prompt.length} characters)`);
  } catch (error) {
    console.log(`❌ Failed to load: ${promptName} - ${error.message}`);
  }
}

// Test prompt formatting
console.log('\n🔧 Testing prompt formatting...');
try {
  const conversationPrompt = promptManager.getConversationPrompt({
    currentStep: 1,
    formData: { scenario: { numMCS: 1 } },
    conversationHistory: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ]
  });
  console.log('✅ Conversation prompt formatted successfully');
  console.log(`📝 Prompt length: ${conversationPrompt.length} characters`);
} catch (error) {
  console.log('❌ Failed to format conversation prompt:', error.message);
}

console.log('\n🏁 Prompt loading test completed!');
