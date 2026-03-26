const OpenAI = require('openai');
const { OPENAI_CONFIG, CONVERSATION_CONFIG } = require('../config/openai');
const LLMParser = require('./parsers/llmParser');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

// Initialize LLM Parser
const llmParser = new LLMParser(openai);

class OpenAIService {
  constructor() {
    this.conversationHistory = new Map(); // Store conversation history by session
  }

  /**
   * Process a chat message and return AI response
   * @param {string} message - User message
   * @param {string} sessionId - Session identifier
   * @param {Object} context - Additional context (form data, current step, etc.)
   * @returns {Object} Response with message and actions
   */
  async processMessage(message, sessionId, context = {}) {
    try {
      // Get or create conversation history for this session
      let conversationHistory = this.conversationHistory.get(sessionId) || [];
      
      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: message
      });

      // Prepare messages for OpenAI API
      const messages = this.prepareMessages(conversationHistory, context);
      
      console.log('Calling OpenAI API with model:', OPENAI_CONFIG.model);
      console.log('Number of messages:', messages.length);
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: messages,
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature,
        top_p: OPENAI_CONFIG.topP,
        frequency_penalty: OPENAI_CONFIG.frequencyPenalty,
        presence_penalty: OPENAI_CONFIG.presencePenalty,
      });

      console.log('OpenAI API response received');
      const aiResponse = response.choices[0].message.content;
      console.log('AI Response:', aiResponse.substring(0, 100) + '...');
      
      // Add AI response to history
      conversationHistory.push({
        role: 'assistant',
        content: aiResponse
      });

      // Limit conversation history length
      if (conversationHistory.length > CONVERSATION_CONFIG.maxHistoryLength) {
        conversationHistory = conversationHistory.slice(-CONVERSATION_CONFIG.maxHistoryLength);
      }

      // Update conversation history
      this.conversationHistory.set(sessionId, conversationHistory);

      // Parse response for actions and form updates
      const parsedResponse = await this.parseResponse(aiResponse, {
        ...context,
        lastUserMessage: message
      });

      return {
        message: parsedResponse.message,
        actions: parsedResponse.actions,
        formUpdates: parsedResponse.formUpdates,
        navigateToStep: parsedResponse.navigateToStep,
        conversationState: parsedResponse.conversationState
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Provide a more helpful error message
      if (error.code === 'insufficient_quota') {
        throw new Error('API quota exceeded. Please check your OpenAI account.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid API key. Please check your OpenAI configuration.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else {
        throw new Error(`AI service error: ${error.message}`);
      }
    }
  }

  /**
   * Prepare messages for OpenAI API with system prompt and context
   */
  prepareMessages(conversationHistory, context) {
    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context)
      }
    ];

    // Add conversation history
    messages.push(...conversationHistory);

    return messages;
  }

  /**
   * Build system prompt with current context
   */
  buildSystemPrompt(context) {
    let systemPrompt = CONVERSATION_CONFIG.systemPrompt;

    // Add current form state context
    if (context.formData) {
      systemPrompt += `\n\nCurrent Configuration:
- MCS Count: ${context.formData.scenario?.numMCS || 'Not set'}
- CEV Count: ${context.formData.scenario?.numCEV || 'Not set'}
- Nodes Count: ${context.formData.scenario?.numNodes || 'Not set'}
- Current Step: ${context.currentStep || 0}
- 24-hour simulation: ${context.formData.scenario?.is24Hours ? 'Yes' : 'No'}`;
    }

    // Add step-specific instructions
    if (context.currentStep) {
      systemPrompt += `\n\nCurrent Step Context:
${this.getStepInstructions(context.currentStep)}`;
    }

    return systemPrompt;
  }

  /**
   * Get step-specific instructions for the AI
   */
  getStepInstructions(step) {
    const stepInstructions = {
      0: 'User is on the welcome screen. Help them get started with scenario configuration.',
      1: 'User is configuring the basic scenario (MCS, CEV, nodes count). Help them set appropriate values.',
      2: 'User is setting model parameters. Provide guidance on technical parameters like efficiency, capacities, and rates.',
      3: 'User is configuring electric vehicle data. Help with battery specifications and charging rates.',
      4: 'User is setting up locations and assigning EVs to construction sites. Ensure proper assignments.',
      5: 'User is configuring time-dependent data (electricity prices, CO2 factors). Help with realistic values.',
      6: 'User is setting up distance and travel time matrices. Ensure symmetry and realistic values.',
      7: 'User is configuring work requirements and schedules. Help with realistic work patterns.',
      8: 'User is reviewing the configuration. Help validate and suggest improvements.',
      9: 'User is running optimization. Help with execution and result interpretation.'
    };

    return stepInstructions[step] || 'Continue helping the user with their current task.';
  }

  /**
   * Parse AI response to extract actions and form updates
   */
  async parseResponse(aiResponse, context) {
    try {
      // Try to parse the user's input for configuration data
      const userInput = context.lastUserMessage || '';
      let formUpdates = null;
      let actions = [];
      
      if (userInput && userInput.trim()) {
        console.log('Attempting to parse user input:', userInput);
        
        // Try to parse scenario configuration
        try {
          const scenarioData = await llmParser.parseScenarioConfiguration(userInput, context.formData || {});
          console.log('Scenario parsing result:', scenarioData);
          
          if (scenarioData && scenarioData.confidence > 0.7) {
            formUpdates = {
              section: 'scenario',
              data: {
                numMCS: scenarioData.numMCS,
                numCEV: scenarioData.numCEV,
                numNodes: scenarioData.numNodes,
                is24Hours: scenarioData.is24Hours,
                scenarioName: scenarioData.scenarioName
              }
            };
            
            actions.push({
              description: `Configured scenario: ${scenarioData.numMCS} MCS, ${scenarioData.numCEV} CEV, ${scenarioData.numNodes} nodes`,
              status: 'completed'
            });
          }
        } catch (error) {
          console.log('Could not parse as scenario config:', error.message);
        }

        // Try to parse model parameters
        try {
          const paramData = await llmParser.parseModelParameters(userInput, context.formData || {});
          console.log('Parameters parsing result:', paramData);
          
          if (paramData && paramData.confidence > 0.7) {
            formUpdates = {
              section: 'parameters',
              data: {
                eta_ch_dch: paramData.eta_ch_dch,
                MCS_max: paramData.MCS_max,
                MCS_min: paramData.MCS_min,
                MCS_ini: paramData.MCS_ini,
                CH_MCS: paramData.CH_MCS,
                DCH_MCS: paramData.DCH_MCS,
                DCH_MCS_plug: paramData.DCH_MCS_plug,
                C_MCS_plug: paramData.C_MCS_plug,
                k_trv: paramData.k_trv,
                delta_T: paramData.delta_T,
                rho_miss: paramData.rho_miss
              }
            };
            
            actions.push({
              description: 'Updated model parameters with technical specifications',
              status: 'completed'
            });
          }
        } catch (error) {
          console.log('Could not parse as model parameters:', error.message);
        }
      }

      return {
        message: aiResponse,
        actions: actions.length > 0 ? actions : [
          {
            description: 'Response processed successfully',
            status: 'completed'
          }
        ],
        formUpdates: formUpdates,
        navigateToStep: null,
        conversationState: 'completed'
      };
      
    } catch (error) {
      console.error('Error parsing response:', error);
      return {
        message: aiResponse,
        actions: [
          {
            description: 'Response processed successfully',
            status: 'completed'
          }
        ],
        formUpdates: null,
        navigateToStep: null,
        conversationState: 'completed'
      };
    }
  }

  /**
   * Clear conversation history for a session
   */
  clearConversation(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }
}

module.exports = new OpenAIService();
