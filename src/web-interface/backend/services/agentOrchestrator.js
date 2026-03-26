const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('../config/openai');
const promptManager = require('./promptManager');
const navigationAgent = require('./navigationAgent');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

class AgentOrchestrator {
  constructor() {
    this.conversationHistory = new Map();
    this.workflowState = new Map(); // Track workflow state per session
  }

  /**
   * Main orchestration method - Intelligent flow with decision making
   */
  async processMessage(message, sessionId, context = {}) {
    try {
      console.log(`🔄 Orchestrating intelligent message processing for session ${sessionId}`);
      
      // Initialize workflow state for this session
      if (!this.workflowState.has(sessionId)) {
        this.workflowState.set(sessionId, {
          sessionId: sessionId,
          currentStep: 1,
          extractedParameters: {},
          validationResults: {},
          recommendations: {},
          conversationContext: {},
          workflowStage: 'analysis'
        });
      }

      const workflowState = this.workflowState.get(sessionId);
      
      // Step 1: Message Analysis - Determine the optimal flow
      console.log('🧠 Step 1: Message Analysis');
      const messageAnalysis = await this.analyzeMessage(message, workflowState, sessionId);
      console.log('📊 Message Analysis Result:', messageAnalysis);
      
      // Step 2: ReAct-based Agent Orchestration
      console.log('🎯 Step 2: ReAct-based Agent Orchestration');
      const orchestrationResult = await this.reactOrchestrate(
        message, 
        messageAnalysis, 
        workflowState, 
        sessionId
      );
      
      let understandingResult = orchestrationResult.understanding || workflowState.extractedParameters;
      let validationResult = orchestrationResult.validation || workflowState.validationResults;
      let recommendationResult = orchestrationResult.recommendation || workflowState.recommendations;
      
      // CRITICAL FIX: Force validation if parameters were extracted but validation wasn't run
      if (understandingResult && Object.keys(understandingResult).length > 0 && 
          (!validationResult || Object.keys(validationResult).length === 0)) {
        console.log('🔧 CRITICAL FIX: Parameters extracted but validation not run. Forcing validation...');
        validationResult = await this.validationAgent(understandingResult, message, {}, workflowState);
        console.log('✅ Forced validation result:', validationResult);
      }
      
      // Step 3: Conversation Manager (Always last - generates response)
      console.log('💬 Step 3: Conversation Manager');
      const conversationResult = await this.conversationManager(
        message, 
        understandingResult, 
        validationResult, 
        recommendationResult, 
        workflowState, 
        sessionId
      );
      
      // Update conversation history
      this.updateConversationHistory(sessionId, message, conversationResult.message);
      
      // Update workflow state
      workflowState.conversationContext = context;
      workflowState.lastFlowType = messageAnalysis.flowType;
      workflowState.reactChain = messageAnalysis.reactChain;
      workflowState.orchestrationChain = orchestrationResult.orchestrationChain;
      this.workflowState.set(sessionId, workflowState);
      
      return {
        message: conversationResult.message,
        actions: this.buildActions(understandingResult, validationResult, recommendationResult),
        formUpdates: this.buildFormUpdates(understandingResult, validationResult),
        navigateToStep: conversationResult.navigateToStep,
        extractedParameters: understandingResult,
        validationResult: validationResult,
        recommendations: recommendationResult,
        workflowState: workflowState,
        flowAnalysis: messageAnalysis,
        reactChain: messageAnalysis.reactChain,
        orchestrationChain: orchestrationResult.orchestrationChain
      };

    } catch (error) {
      console.error('❌ Intelligent Agent Orchestrator Error:', error);
      throw new Error(`Intelligent orchestration error: ${error.message}`);
    }
  }

  /**
   * ReAct-based Agent Orchestration with Chain of Thought reasoning
   */
  async reactOrchestrate(message, messageAnalysis, workflowState, sessionId) {
    try {
      const reactOrchestrationPrompt = `
You are orchestrating the MCS-CEV multi-agent system using ReAct (Reasoning + Acting) methodology. Coordinate the agents based on the message analysis and execute them in the optimal sequence.

## ReAct Orchestration Format:
Use this format for each agent execution:

**Thought**: [Your reasoning about what needs to be done]
**Action**: [Which agent to execute and why]
**Observation**: [Result of the agent execution]
**Thought**: [Analysis of the result and next steps]
**Action**: [Next agent to execute]
**Observation**: [Next result]

## Available Agents:
1. **Understanding Agent**: Extracts parameters from natural language
2. **Validation Agent**: Validates extracted parameters
3. **Recommendation Agent**: Provides recommendations and suggestions
4. **Conversation Manager**: Generates natural responses

## Message Analysis:
${JSON.stringify(messageAnalysis, null, 2)}

## Current Workflow State:
${JSON.stringify(workflowState, null, 2)}

## Orchestration Rules:
- Execute agents based on messageAnalysis.requiresUnderstanding, requiresValidation, requiresRecommendation
- Understanding Agent should run first if required
- Validation Agent should run after Understanding Agent if required
- Recommendation Agent should run after Validation Agent if required
- Always provide detailed reasoning for each decision

## Agent Execution Sequence:
${messageAnalysis.requiresUnderstanding ? '1. Understanding Agent' : ''}
${messageAnalysis.requiresValidation ? '2. Validation Agent' : ''}
${messageAnalysis.requiresRecommendation ? '3. Recommendation Agent' : ''}
4. Conversation Manager (always last)

Now, let me orchestrate the agents step by step:

**Thought**: I need to coordinate the agents based on the message analysis
**Action**: Determine the optimal agent execution sequence
**Observation**: [Agent sequence decision]

${messageAnalysis.requiresUnderstanding ? `
**Thought**: Understanding Agent is required, so I'll execute it first
**Action**: Execute Understanding Agent to extract parameters
**Observation**: [Understanding Agent result]
` : ''}

${messageAnalysis.requiresValidation ? `
**Thought**: Validation Agent is required, so I'll execute it next
**Action**: Execute Validation Agent to validate parameters
**Observation**: [Validation Agent result]
` : ''}

${messageAnalysis.requiresRecommendation ? `
**Thought**: Recommendation Agent is required, so I'll execute it next
**Action**: Execute Recommendation Agent to provide suggestions
**Observation**: [Recommendation Agent result]
` : ''}

**Thought**: All required agents have been executed, ready for conversation manager
**Action**: Prepare results for Conversation Manager
**Observation**: [Final orchestration summary]

Return ONLY a JSON object with the results from all executed agents:
{
  "understanding": { /* Understanding Agent result or null */ },
  "validation": { /* Validation Agent result or null */ },
  "recommendation": { /* Recommendation Agent result or null */ },
  "orchestrationChain": [
    {
      "step": 1,
      "thought": "I need to coordinate the agents based on the message analysis",
      "action": "Determine the optimal agent execution sequence",
      "observation": "[Agent sequence decision]"
    }
    ${messageAnalysis.requiresUnderstanding ? `,
    {
      "step": 2,
      "thought": "Understanding Agent is required, so I'll execute it first",
      "action": "Execute Understanding Agent to extract parameters",
      "observation": "[Understanding Agent result]"
    }` : ''}
    ${messageAnalysis.requiresValidation ? `,
    {
      "step": ${messageAnalysis.requiresUnderstanding ? 3 : 2},
      "thought": "Validation Agent is required, so I'll execute it next",
      "action": "Execute Validation Agent to validate parameters",
      "observation": "[Validation Agent result]"
    }` : ''}
    ${messageAnalysis.requiresRecommendation ? `,
    {
      "step": ${messageAnalysis.requiresUnderstanding && messageAnalysis.requiresValidation ? 4 : messageAnalysis.requiresUnderstanding || messageAnalysis.requiresValidation ? 3 : 2},
      "thought": "Recommendation Agent is required, so I'll execute it next",
      "action": "Execute Recommendation Agent to provide suggestions",
      "observation": "[Recommendation Agent result]"
    }` : ''}
  ]
}
`;

      console.log('🎯 Starting ReAct Orchestration...');
      
      // Execute agents based on requirements
      let understandingResult = null;
      let validationResult = null;
      let recommendationResult = null;
      const orchestrationChain = [];

      // Step 1: Understanding Agent (if required)
      if (messageAnalysis.requiresUnderstanding) {
        console.log('🧠 ReAct Step 1: Executing Understanding Agent');
        orchestrationChain.push({
          step: 1,
          thought: "Understanding Agent is required, so I'll execute it first",
          action: "Execute Understanding Agent to extract parameters",
          observation: "Starting parameter extraction"
        });

        understandingResult = await this.understandingAgent(message, {}, workflowState, sessionId);
        workflowState.extractedParameters = understandingResult;
        
        orchestrationChain[orchestrationChain.length - 1].observation = `Understanding Agent completed: ${JSON.stringify(understandingResult.scenario || {})}`;
        console.log('✅ Understanding Agent completed');
      }

      // Step 2: Validation Agent (if required)
      if (messageAnalysis.requiresValidation) {
        console.log('✅ ReAct Step 2: Executing Validation Agent');
        orchestrationChain.push({
          step: orchestrationChain.length + 1,
          thought: "Validation Agent is required, so I'll execute it next",
          action: "Execute Validation Agent to validate parameters",
          observation: "Starting parameter validation"
        });

        validationResult = await this.validationAgent(understandingResult || {}, message, {}, workflowState);
        workflowState.validationResults = validationResult;
        
        orchestrationChain[orchestrationChain.length - 1].observation = `Validation Agent completed: ${validationResult.is_valid ? 'Valid' : 'Invalid'}`;
        console.log('✅ Validation Agent completed');
      }

      // Step 3: Recommendation Agent (if required)
      if (messageAnalysis.requiresRecommendation) {
        console.log('💡 ReAct Step 3: Executing Recommendation Agent');
        orchestrationChain.push({
          step: orchestrationChain.length + 1,
          thought: "Recommendation Agent is required, so I'll execute it next",
          action: "Execute Recommendation Agent to provide suggestions",
          observation: "Starting recommendation generation"
        });

        recommendationResult = await this.recommendationAgent(message, understandingResult || {}, validationResult || {}, workflowState);
        workflowState.recommendations = recommendationResult;
        
        orchestrationChain[orchestrationChain.length - 1].observation = `Recommendation Agent completed: ${recommendationResult.recommendations?.length || 0} recommendations`;
        console.log('✅ Recommendation Agent completed');
      }

      // Final step: Prepare for Conversation Manager
      orchestrationChain.push({
        step: orchestrationChain.length + 1,
        thought: "All required agents have been executed, ready for conversation manager",
        action: "Prepare results for Conversation Manager",
        observation: "Orchestration complete, ready for final response generation"
      });

      const result = {
        understanding: understandingResult,
        validation: validationResult,
        recommendation: recommendationResult,
        orchestrationChain: orchestrationChain
      };

      console.log('🎯 ReAct Orchestration Result:', JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ ReAct Orchestration Error:', error);
      // Fallback to traditional orchestration
      return await this.traditionalOrchestrate(message, messageAnalysis, workflowState, sessionId);
    }
  }

  /**
   * Traditional orchestration (fallback method)
   */
  async traditionalOrchestrate(message, messageAnalysis, workflowState, sessionId) {
    console.log('🔄 Fallback to traditional orchestration');
    
    let understandingResult = workflowState.extractedParameters;
    let validationResult = workflowState.validationResults;
    let recommendationResult = workflowState.recommendations;
    
    // Execute agents based on flow type (original logic)
    switch (messageAnalysis.flowType) {
      case 'simple_question':
        console.log('🔄 Route: Simple Question → Conversation Manager');
        break;
        
      case 'parameter_extraction':
        console.log('🔄 Route: Parameter Extraction → Understanding → Validation → Conversation');
        understandingResult = await this.understandingAgent(message, {}, workflowState, sessionId);
        workflowState.extractedParameters = understandingResult;
        validationResult = await this.validationAgent(understandingResult, message, {}, workflowState);
        workflowState.validationResults = validationResult;
        break;
        
      case 'parameter_modification':
        console.log('🔄 Route: Parameter Modification → Validation → Recommendation → Conversation');
        validationResult = await this.validationAgent(understandingResult, message, {}, workflowState);
        workflowState.validationResults = validationResult;
        if (this.shouldProvideRecommendations(message, understandingResult, validationResult)) {
          recommendationResult = await this.recommendationAgent(message, understandingResult, validationResult, workflowState);
          workflowState.recommendations = recommendationResult;
        }
        break;
        
      case 'recommendation_request':
        console.log('🔄 Route: Recommendation Request → Recommendation → Conversation');
        recommendationResult = await this.recommendationAgent(message, understandingResult, validationResult, workflowState);
        workflowState.recommendations = recommendationResult;
        break;
        
      case 'validation_request':
        console.log('🔄 Route: Validation Request → Validation → Conversation');
        validationResult = await this.validationAgent(understandingResult, message, {}, workflowState);
        workflowState.validationResults = validationResult;
        break;
        
      case 'full_analysis':
      default:
        console.log('🔄 Route: Full Analysis → Understanding → Validation → Recommendation → Conversation');
        understandingResult = await this.understandingAgent(message, {}, workflowState, sessionId);
        workflowState.extractedParameters = understandingResult;
        validationResult = await this.validationAgent(understandingResult, message, {}, workflowState);
        workflowState.validationResults = validationResult;
        if (this.shouldProvideRecommendations(message, understandingResult, validationResult)) {
          recommendationResult = await this.recommendationAgent(message, understandingResult, validationResult, workflowState);
          workflowState.recommendations = recommendationResult;
        }
    }
    
    return {
      understanding: understandingResult,
      validation: validationResult,
      recommendation: recommendationResult,
      orchestrationChain: [
        {
          step: 1,
          thought: "Fallback to traditional orchestration",
          action: "Execute agents using original switch logic",
          observation: "Traditional orchestration completed"
        }
      ]
    };
  }

  /**
   * Understanding Agent - Extracts and understands parameters
   */
  async understandingAgent(message, context, workflowState, sessionId) {
    try {
      const prompt = promptManager.getUnderstandingAgentPrompt(message, {
        ...context,
        conversationHistory: this.getConversationHistory(sessionId),
        workflowState: workflowState
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

      const result = JSON.parse(response.choices[0].message.content);
      console.log('🧠 Understanding Agent Result:', JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ Understanding Agent Error:', error);
      return {
        scenario: {},
        parameters: {},
        extraction_confidence: 0,
        missing_critical_info: ['Failed to extract parameters'],
        suggestions: ['Please try rephrasing your request']
      };
    }
  }

  /**
   * Validation Agent - Validates extracted parameters
   */
  async validationAgent(extractedParameters, message, context, workflowState) {
    try {
      const prompt = promptManager.getValidationAgentPrompt(
        extractedParameters, 
        message, 
        context.formData || {},
        workflowState
      );
      
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Validate these parameters: ${JSON.stringify(extractedParameters)}` }
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('✅ Validation Agent Result:', JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ Validation Agent Error:', error);
      return {
        is_valid: false,
        validation_score: 0,
        completeness: { scenario: 0, parameters: 0, overall: 0 },
        range_validation: { passed: false, issues: ['Validation failed'] },
        consistency_check: { passed: false, issues: ['Validation failed'] },
        missing_parameters: ['All parameters'],
        suggestions: ['Please provide complete configuration'],
        confidence: 0
      };
    }
  }

  /**
   * Recommendation Agent - Provides contextual recommendations
   */
  async recommendationAgent(message, extractedParameters, validationResult, workflowState) {
    try {
      // Only provide recommendations if user asks for them or if validation fails
      const needsRecommendation = message.toLowerCase().includes('recommend') || 
                                 message.toLowerCase().includes('suggest') ||
                                 !validationResult.is_valid;
      
      if (!needsRecommendation) {
        return { recommendations: [], confidence: 1.0 };
      }

      const prompt = promptManager.getRecommendationAgentPrompt(
        message,
        extractedParameters,
        validationResult,
        workflowState
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

      const result = JSON.parse(response.choices[0].message.content);
      console.log('💡 Recommendation Agent Result:', JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ Recommendation Agent Error:', error);
      return { recommendations: [], confidence: 0.0 };
    }
  }

  /**
   * Conversation Manager - Generates natural responses
   */
  async conversationManager(message, extractedParameters, validationResult, recommendationResult, workflowState, sessionId) {
    try {
      const prompt = promptManager.getConversationPrompt({
        extractedParameters,
        validationResult,
        recommendationResult,
        workflowState,
        conversationHistory: this.getConversationHistory(sessionId)
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

      const aiResponse = response.choices[0].message.content;
      
      console.log(`🎯 Conversation Manager: About to call determineNextStep`);
      console.log(`🎯 Conversation Manager: extractedParameters:`, extractedParameters);
      console.log(`🎯 Conversation Manager: validationResult:`, validationResult);
      console.log(`🎯 Conversation Manager: workflowState:`, workflowState);
      
      let nextStep = 1; // Default fallback
      try {
        console.log(`🎯 Conversation Manager: Calling determineNextStep...`);
        nextStep = this.determineNextStep(extractedParameters, validationResult, workflowState);
        console.log(`🎯 Conversation Manager: Determined next step: ${nextStep}`);
      } catch (error) {
        console.error(`🎯 Conversation Manager: Error in determineNextStep:`, error);
        nextStep = 1; // Fallback
      }
      
      return {
        message: aiResponse,
        navigateToStep: nextStep
      };
      
    } catch (error) {
      console.error('❌ Conversation Manager Error:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        navigateToStep: null
      };
    }
  }

  /**
   * Analyze message to determine optimal processing flow using ReAct + CoT
   */
  async analyzeMessage(message, workflowState, sessionId) {
    try {
      const reactCotPrompt = `
You are an Intelligent Agent Orchestrator for MCS-CEV optimization. Use Chain of Thought reasoning combined with ReAct (Reasoning + Acting) to analyze user messages and determine the optimal processing flow.

## Chain of Thought + ReAct Format:
Let me think through this step by step:

**Step 1: Message Content Analysis**
Thought: I need to understand what the user is trying to communicate
Action: Examine the message content, keywords, and intent
Observation: [What I observe about the message content]

**Step 2: Context Assessment**
Thought: I need to understand the current workflow state and context
Action: Analyze current step, existing parameters, and conversation history
Observation: [What I observe about the current context]

**Step 3: Flow Type Classification**
Thought: Based on content and context, I need to determine the optimal flow type
Action: Classify the message into the appropriate flow category
Observation: [Result of classification with reasoning]

**Step 4: Agent Requirements Analysis**
Thought: I need to determine which agents are required for this flow
Action: Decide which agents to activate based on flow type and complexity
Observation: [Agent activation decision with justification]

## Message to Analyze:
"${message}"

## Current Context:
- Current Step: ${workflowState.currentStep}
- Has Extracted Parameters: ${Object.keys(workflowState.extractedParameters).length > 0}
- Has Validation Results: ${Object.keys(workflowState.validationResults).length > 0}
- Conversation History Length: ${this.getConversationHistory(sessionId).length}
- Workflow Stage: ${workflowState.workflowStage}

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
- **CRITICAL**: If message contains ANY numbers that could be parameters (CEV count, node count, MCS count) → ALWAYS requires validation
- **CRITICAL**: If message mentions "vehicles", "sites", "campus", "construction" with numbers → ALWAYS requires validation
- **CRITICAL**: Any scenario configuration message → ALWAYS requires validation

## Agent Requirements by Flow Type:
- **simple_question**: Only Conversation Manager
- **parameter_extraction**: Understanding → Validation → Conversation Manager
- **parameter_modification**: Validation → Recommendation (if needed) → Conversation Manager
- **recommendation_request**: Recommendation → Conversation Manager
- **validation_request**: Validation → Conversation Manager
- **full_analysis**: Understanding → Validation → Recommendation → Conversation Manager
- **CRITICAL**: If ANY parameters are extracted → ALWAYS run Validation Agent
- **CRITICAL**: If Understanding Agent extracts scenario parameters → ALWAYS run Validation Agent
- **CRITICAL**: If numbers are mentioned in context of MCS/CEV/nodes → ALWAYS run Validation Agent

Now, let me analyze this step by step:

**Step 1: Message Content Analysis**
Thought: I need to understand what the user is trying to communicate
Action: Examine the message content, keywords, and intent
Observation: [Analyze the message content]

**Step 2: Context Assessment**
Thought: I need to understand the current workflow state and context
Action: Analyze current step, existing parameters, and conversation history
Observation: [Analyze the current context]

**Step 3: Flow Type Classification**
Thought: Based on content and context, I need to determine the optimal flow type
Action: Classify the message into the appropriate flow category
Observation: [Classify with reasoning]

**Step 4: Agent Requirements Analysis**
Thought: I need to determine which agents are required for this flow
Action: Decide which agents to activate based on flow type and complexity
Observation: [Decide agent requirements]

Return ONLY a JSON object:
{
  "flowType": "<flow_type>",
  "confidence": <0-1>,
  "reasoning": "<detailed step-by-step reasoning>",
  "requiresUnderstanding": <boolean>,
  "requiresValidation": <boolean>",
  "requiresRecommendation": <boolean>",
  "reactChain": [
    {
      "step": 1,
      "thought": "I need to understand what the user is trying to communicate",
      "action": "Examine the message content, keywords, and intent",
      "observation": "[What I observed about the message content]"
    },
    {
      "step": 2,
      "thought": "I need to understand the current workflow state and context",
      "action": "Analyze current step, existing parameters, and conversation history",
      "observation": "[What I observed about the current context]"
    },
    {
      "step": 3,
      "thought": "Based on content and context, I need to determine the optimal flow type",
      "action": "Classify the message into the appropriate flow category",
      "observation": "[Classification result with reasoning]"
    },
    {
      "step": 4,
      "thought": "I need to determine which agents are required for this flow",
      "action": "Decide which agents to activate based on flow type and complexity",
      "observation": "[Agent activation decision with justification]"
    }
  ]
}
`;

      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: reactCotPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('🧠 ReAct + CoT Message Analysis:', JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ ReAct + CoT Message Analysis Error:', error);
      return {
        flowType: 'full_analysis',
        confidence: 0.5,
        reasoning: 'Fallback to full analysis due to error',
        requiresUnderstanding: true,
        requiresValidation: true,
        requiresRecommendation: true,
        reactChain: [
          {
            step: 1,
            thought: "Error occurred during analysis",
            action: "Fallback to default flow",
            observation: "Using full_analysis as safe default"
          }
        ]
      };
    }
  }

  /**
   * Build actions based on all agent results
   */
  buildActions(understandingResult, validationResult, recommendationResult) {
    const actions = [];
    
    if (understandingResult.scenario && Object.keys(understandingResult.scenario).length > 0) {
      actions.push({
        description: `Understanding Agent: Extracted scenario configuration`,
        status: 'completed',
        details: understandingResult.scenario
      });
    }
    
    if (validationResult.is_valid) {
      actions.push({
        description: `Validation Agent: Parameters validated successfully`,
        status: 'completed'
      });
    } else {
      actions.push({
        description: `Validation Agent: Issues detected`,
        status: 'warning',
        details: validationResult.suggestions
      });
    }
    
    if (recommendationResult.recommendations && recommendationResult.recommendations.length > 0) {
      actions.push({
        description: `Recommendation Agent: Provided ${recommendationResult.recommendations.length} recommendations`,
        status: 'completed',
        details: recommendationResult.recommendations
      });
    }
    
    return actions;
  }

  /**
   * Build form updates based on agent results
   */
  buildFormUpdates(understandingResult, validationResult) {
    const updates = [];
    
    if (validationResult.is_valid && understandingResult.scenario) {
      updates.push({
        section: 'scenario',
        data: understandingResult.scenario
      });
    }
    
    if (validationResult.is_valid && understandingResult.parameters) {
      updates.push({
        section: 'parameters',
        data: understandingResult.parameters
      });
    }
    
    return updates;
  }

  /**
   * Determine the next step based on current data and validation
   * Uses the specialized Navigation Agent for better step management
   */
  determineNextStep(extractedParameters, validationResult, workflowState) {
    try {
      const sessionId = workflowState.sessionId || 'default-session';
      
      console.log(`🔍 AgentOrchestrator: Using Navigation Agent for step determination`);
      console.log(`📊 Validation result:`, validationResult);
      console.log(`🔍 Extracted parameters:`, Object.keys(extractedParameters || {}));
      
      // Use Navigation Agent to determine next step
      const nextStep = navigationAgent.determineNextStep(sessionId, extractedParameters, validationResult);
      
      // Update workflow state with new step
      workflowState.currentStep = nextStep;
      
      console.log(`🎯 AgentOrchestrator: Navigation Agent determined step: ${nextStep}`);
      
      return nextStep;

    } catch (error) {
      console.error('❌ Error determining next step:', error);
      return workflowState.currentStep || 1;
    }
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(sessionId, userMessage, aiResponse) {
    let history = this.conversationHistory.get(sessionId) || [];
    
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: aiResponse });
    
    // Limit history length
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    this.conversationHistory.set(sessionId, history);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Clear conversation and workflow state
   */
  clearSession(sessionId) {
    this.conversationHistory.delete(sessionId);
    this.workflowState.delete(sessionId);
  }

  /**
   * Get workflow state
   */
  getWorkflowState(sessionId) {
    return this.workflowState.get(sessionId);
  }

  /**
   * Check if current step is complete and valid
   */
  checkStepCompleteness(currentStep, formData, extractedParameters, validationResult) {
    const result = {
      isComplete: false,
      isValid: false,
      missingFields: [],
      issues: []
    };

    switch (currentStep) {
      case 1: // Scenario Configuration
        const scenario = formData.scenario || {};
        result.isComplete = this.isScenarioComplete(scenario);
        result.isValid = validationResult?.is_valid || false;
        result.missingFields = this.getMissingScenarioFields(scenario);
        break;

      case 2: // Model Parameters
        const parameters = formData.parameters || {};
        result.isComplete = this.isParametersComplete(parameters);
        result.isValid = validationResult?.is_valid || false;
        result.missingFields = this.getMissingParameterFields(parameters);
        break;

      case 3: // Electric Vehicle Data
        const evData = formData.evData || [];
        const numCEV = formData.scenario?.numCEV || 0;
        result.isComplete = evData.length >= numCEV && numCEV > 0;
        result.isValid = this.validateEVData(evData);
        result.missingFields = this.getMissingEVFields(evData, numCEV);
        break;

      case 4: // Location Data
        const locations = formData.locations || [];
        const numNodes = formData.scenario?.numNodes || 0;
        result.isComplete = locations.length >= numNodes && numNodes > 0;
        result.isValid = this.validateLocationData(locations, formData.scenario);
        result.missingFields = this.getMissingLocationFields(locations, numNodes);
        break;

      case 5: // Time Data
        const timeData = formData.timeData || [];
        result.isComplete = timeData.length > 0;
        result.isValid = this.validateTimeData(timeData);
        result.missingFields = this.getMissingTimeFields(timeData);
        break;

      case 6: // Matrix Data
        const distanceMatrix = formData.distanceMatrix || [];
        const travelTimeMatrix = formData.travelTimeMatrix || [];
        const numNodesForMatrix = formData.scenario?.numNodes || 0;
        result.isComplete = distanceMatrix.length > 0 && travelTimeMatrix.length > 0;
        result.isValid = this.validateMatrixData(distanceMatrix, travelTimeMatrix, numNodesForMatrix);
        result.missingFields = this.getMissingMatrixFields(distanceMatrix, travelTimeMatrix);
        break;

      case 7: // Work Data
        const workData = formData.workData || [];
        result.isComplete = workData.length > 0;
        result.isValid = this.validateWorkData(workData);
        result.missingFields = this.getMissingWorkFields(workData);
        break;

      default:
        result.isComplete = true;
        result.isValid = true;
    }

    return result;
  }

  /**
   * Get the next step based on current step and data completeness
   */
  getNextStep(currentStep, formData) {
    // If we're on step 8 (Summary), stay there
    if (currentStep >= 8) {
      return 8;
    }

    // Auto-advance to next step
    return currentStep + 1;
  }

  /**
   * Check if scenario configuration is complete
   */
  isScenarioComplete(scenario) {
    return scenario.numMCS && 
           scenario.numCEV && 
           scenario.numNodes && 
           scenario.scenarioName &&
           scenario.numMCS > 0 && 
           scenario.numCEV > 0 && 
           scenario.numNodes >= 2;
  }

  /**
   * Check if parameters are complete
   */
  isParametersComplete(parameters) {
    const requiredFields = [
      'eta_ch_dch', 'MCS_max', 'MCS_min', 'MCS_ini', 
      'CH_MCS', 'DCH_MCS', 'DCH_MCS_plug', 'C_MCS_plug',
      'k_trv', 'delta_T', 'rho_miss'
    ];
    
    return requiredFields.every(field => 
      parameters[field] !== undefined && 
      parameters[field] !== null && 
      parameters[field] !== ''
    );
  }

  /**
   * Validate EV data
   */
  validateEVData(evData) {
    return evData.every(ev => 
      ev.SOE_min !== undefined && 
      ev.SOE_max !== undefined && 
      ev.SOE_ini !== undefined && 
      ev.ch_rate !== undefined
    );
  }

  /**
   * Validate location data
   */
  validateLocationData(locations, scenario) {
    if (!scenario) return false;
    
    // Check if all EVs are assigned
    const assignedEVs = new Set();
    locations.forEach(location => {
      if (location.evAssignments) {
        Object.entries(location.evAssignments).forEach(([ev, assigned]) => {
          if (assigned === 1) assignedEVs.add(parseInt(ev));
        });
      }
    });

    return assignedEVs.size === scenario.numCEV;
  }

  /**
   * Validate time data
   */
  validateTimeData(timeData) {
    return timeData.length > 0 && timeData.every(period => 
      period.time !== undefined && 
      period.lambda_CO2 !== undefined && 
      period.lambda_buy !== undefined
    );
  }

  /**
   * Validate matrix data
   */
  validateMatrixData(distanceMatrix, travelTimeMatrix, numNodes) {
    return distanceMatrix.length > 0 && 
           travelTimeMatrix.length > 0 && 
           distanceMatrix.length === numNodes && 
           travelTimeMatrix.length === numNodes;
  }

  /**
   * Validate work data
   */
  validateWorkData(workData) {
    return workData.length > 0 && workData.every(work => 
      work.Location !== undefined && 
      work.EV !== undefined
    );
  }

  /**
   * Get missing scenario fields
   */
  getMissingScenarioFields(scenario) {
    const missing = [];
    if (!scenario.numMCS) missing.push('numMCS');
    if (!scenario.numCEV) missing.push('numCEV');
    if (!scenario.numNodes) missing.push('numNodes');
    if (!scenario.scenarioName) missing.push('scenarioName');
    return missing;
  }

  /**
   * Get missing parameter fields
   */
  getMissingParameterFields(parameters) {
    const requiredFields = [
      'eta_ch_dch', 'MCS_max', 'MCS_min', 'MCS_ini', 
      'CH_MCS', 'DCH_MCS', 'DCH_MCS_plug', 'C_MCS_plug',
      'k_trv', 'delta_T', 'rho_miss'
    ];
    
    return requiredFields.filter(field => 
      parameters[field] === undefined || 
      parameters[field] === null || 
      parameters[field] === ''
    );
  }

  /**
   * Get missing EV fields
   */
  getMissingEVFields(evData, numCEV) {
    const missing = [];
    if (evData.length < numCEV) {
      missing.push(`${numCEV - evData.length} more EVs needed`);
    }
    return missing;
  }

  /**
   * Get missing location fields
   */
  getMissingLocationFields(locations, numNodes) {
    const missing = [];
    if (locations.length < numNodes) {
      missing.push(`${numNodes - locations.length} more locations needed`);
    }
    return missing;
  }

  /**
   * Get missing time fields
   */
  getMissingTimeFields(timeData) {
    const missing = [];
    if (timeData.length === 0) {
      missing.push('Time data configuration');
    }
    return missing;
  }

  /**
   * Get missing matrix fields
   */
  getMissingMatrixFields(distanceMatrix, travelTimeMatrix) {
    const missing = [];
    if (distanceMatrix.length === 0) missing.push('Distance matrix');
    if (travelTimeMatrix.length === 0) missing.push('Travel time matrix');
    return missing;
  }

  /**
   * Get missing work fields
   */
  getMissingWorkFields(workData) {
    const missing = [];
    if (workData.length === 0) {
      missing.push('Work schedule configuration');
    }
    return missing;
  }

  /**
   * Determine if recommendations should be provided
   */
  shouldProvideRecommendations(message, extractedParameters, validationResult) {
    const messageLower = message.toLowerCase();
    return (
      messageLower.includes('recommend') || 
      messageLower.includes('suggest') || 
      !validationResult.is_valid || 
      (extractedParameters && Object.keys(extractedParameters).length > 0)
    );
  }
}

module.exports = new AgentOrchestrator();
