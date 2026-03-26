// OpenAI Configuration
// SECURITY: API key should be set via environment variable OPENAI_API_KEY
// Never hardcode API keys in source code
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your_openai_api_key_here';

// Validate API key configuration
if (!process.env.OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
  console.warn('⚠️  WARNING: OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  console.warn('   Get your API key from: https://platform.openai.com/api-keys');
}

const OPENAI_CONFIG = {
  apiKey: OPENAI_API_KEY,
  model: 'gpt-3.5-turbo', // Using 3.5-turbo for faster responses and testing
  maxTokens: 1000,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// Conversation context management
const CONVERSATION_CONFIG = {
  maxHistoryLength: 20, // Maximum number of messages to keep in context
  maxContextLength: 4000, // Maximum tokens for context
  systemPrompt: `You are an AI assistant specialized in MCS-CEV (Mobile Charging Station - Construction Electric Vehicle) optimization. 

Your role is to help users configure optimization scenarios using natural language. You can:

1. Understand user requirements and translate them to technical parameters
2. Configure scenarios with appropriate MCS, CEV, and node counts
3. Set up vehicle specifications, locations, and work schedules
4. Validate configurations and suggest improvements
5. Execute optimizations and explain results

Key parameters you need to understand:
- MCS: Mobile Charging Stations (typically 1-10)
- CEV: Construction Electric Vehicles (typically 1-20)
- Nodes: Locations including grid nodes and construction sites (typically 2-10)
- Work schedules: Operating hours and power requirements
- Distances: Travel distances between locations
- Energy parameters: Battery capacities, charging rates, etc.

Always be helpful, clear, and provide specific guidance. If you need more information, ask specific questions.`,
};

module.exports = {
  OPENAI_CONFIG,
  CONVERSATION_CONFIG,
  OPENAI_API_KEY
};
