const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('./config/openai');
const promptManager = require('./services/promptManager');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

async function testUserScenario() {
  const userMessage = "I need to optimize charging for 3 electric excavators at 2 construction sites";
  
  console.log('🧪 Testing User Scenario with Intelligent Flow');
  console.log('=' .repeat(80));
  console.log(`📝 User Message: "${userMessage}"`);
  console.log('-'.repeat(60));

  try {
    // Step 1: Message Analysis
    console.log('\n🧠 Step 1: Message Analysis');
    const analysisPrompt = `
You are a Message Analysis Agent for MCS-CEV optimization. Analyze the user message and determine the optimal processing flow.

## Message to Analyze:
"${userMessage}"

## Current Context:
- Current Step: 1
- Has Extracted Parameters: false
- Has Validation Results: false
- Conversation History Length: 0

## Flow Types:
1. **simple_question**: User asks for help, explanation, or general questions
2. **parameter_extraction**: User provides new scenario/parameter information
3. **parameter_modification**: User modifies existing parameters
4. **recommendation_request**: User asks for recommendations or suggestions
5. **validation_request**: User asks for validation or verification
6. **full_analysis**: Complex request requiring all agents

## Analysis Rules:
- If message contains "help", "explain", "what is", "how to" → simple_question
- If message contains "validate", "check", "verify" → validation_request
- If message contains "recommend", "suggest" (but NOT complex scenario) → recommendation_request
- If message contains numbers + "MCS", "CEV", "nodes", "excavators" + multiple parameters → full_analysis
- If message contains numbers, "MCS", "CEV", "nodes", "excavators" → parameter_extraction
- If message modifies existing parameters → parameter_modification
- If complex request with multiple aspects (numbers + multiple parameters + "optimize") → full_analysis

Return ONLY a JSON object:
{
  "flowType": "<flow_type>",
  "confidence": <0-1>,
  "reasoning": "<explanation>",
  "requiresUnderstanding": <boolean>,
  "requiresValidation": <boolean>,
  "requiresRecommendation": <boolean>
}
`;

    const analysisResponse = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content);
    console.log('✅ Analysis Result:', JSON.stringify(analysisResult, null, 2));
    
    // Step 2: Simulate the routing based on analysis
    console.log('\n🔄 Step 2: Intelligent Routing Simulation');
    let understandingResult = {};
    let validationResult = {};
    let recommendationResult = {};
    
    switch (analysisResult.flowType) {
      case 'parameter_extraction':
        console.log('🔄 Route: Parameter Extraction');
        console.log('  → Understanding Agent');
        understandingResult = await simulateUnderstandingAgent(userMessage);
        console.log('  → Validation Agent');
        validationResult = await simulateValidationAgent(understandingResult);
        break;
        
      case 'full_analysis':
        console.log('🔄 Route: Full Analysis');
        console.log('  → Understanding Agent');
        understandingResult = await simulateUnderstandingAgent(userMessage);
        console.log('  → Validation Agent');
        validationResult = await simulateValidationAgent(understandingResult);
        console.log('  → Recommendation Agent');
        recommendationResult = await simulateRecommendationAgent(userMessage, understandingResult, validationResult);
        break;
        
      default:
        console.log(`🔄 Route: ${analysisResult.flowType}`);
    }
    
    // Step 3: Conversation Manager
    console.log('\n💬 Step 3: Conversation Manager');
    const conversationResult = await simulateConversationManager(userMessage, understandingResult, validationResult, recommendationResult);
    console.log('✅ Final Response:', conversationResult);
    
    // Summary
    console.log('\n🎯 Summary:');
    console.log(`✅ Flow Type: ${analysisResult.flowType}`);
    console.log(`✅ Confidence: ${analysisResult.confidence}`);
    console.log(`✅ Reasoning: ${analysisResult.reasoning}`);
    console.log(`✅ Agents Used: ${getAgentsUsed(analysisResult.flowType)}`);
    console.log(`✅ Performance: ${getPerformanceRating(analysisResult.flowType)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function simulateUnderstandingAgent(message) {
  const prompt = promptManager.getUnderstandingAgentPrompt(message, {
    currentContext: {},
    conversationHistory: [],
    workflowState: { currentStep: 1 }
  });
  
  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: message }
    ],
    max_tokens: 1000,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

async function simulateValidationAgent(understandingResult) {
  const prompt = promptManager.getValidationAgentPrompt(
    understandingResult, 
    "I need to optimize charging for 3 electric excavators at 2 construction sites", 
    {},
    { currentStep: 1 }
  );
  
  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Validate these parameters: ${JSON.stringify(understandingResult)}` }
    ],
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

async function simulateRecommendationAgent(message, understandingResult, validationResult) {
  const prompt = promptManager.getRecommendationAgentPrompt(
    message,
    understandingResult,
    validationResult,
    { currentStep: 1 }
  );
  
  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: message }
    ],
    max_tokens: 600,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

async function simulateConversationManager(message, understandingResult, validationResult, recommendationResult) {
  const prompt = promptManager.getConversationPrompt({
    extractedParameters: understandingResult,
    validationResult: validationResult,
    recommendationResult: recommendationResult,
    workflowState: { currentStep: 1 },
    conversationHistory: []
  });
  
  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: message }
    ],
    max_tokens: OPENAI_CONFIG.maxTokens,
    temperature: OPENAI_CONFIG.temperature,
  });

  return response.choices[0].message.content;
}

function getAgentsUsed(flowType) {
  const agentMap = {
    'simple_question': 'Conversation Manager only',
    'parameter_extraction': 'Understanding + Validation + Conversation',
    'recommendation_request': 'Recommendation + Conversation',
    'validation_request': 'Validation + Conversation',
    'full_analysis': 'Understanding + Validation + Recommendation + Conversation'
  };
  return agentMap[flowType] || 'Unknown';
}

function getPerformanceRating(flowType) {
  const performanceMap = {
    'simple_question': '⚡ Maximum (1 agent)',
    'parameter_extraction': '🚀 Fast (3 agents)',
    'recommendation_request': '⚡ Fast (2 agents)',
    'validation_request': '⚡ Fast (2 agents)',
    'full_analysis': '🐌 Standard (4 agents)'
  };
  return performanceMap[flowType] || 'Unknown';
}

// Run the test
testUserScenario();
