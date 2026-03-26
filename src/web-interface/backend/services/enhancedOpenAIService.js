const OpenAI = require('openai');
const { OPENAI_CONFIG } = require('../config/openai');
const promptManager = require('./promptManager');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

class EnhancedOpenAIService {
  constructor() {
    this.conversationHistory = new Map(); // Store conversation history by session
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (!this.initialized) {
      await promptManager.initialize();
      this.initialized = true;
    }
  }

  /**
   * Process a chat message using the enhanced prompt flow
   * @param {string} message - User message
   * @param {string} sessionId - Session identifier
   * @param {Object} context - Additional context (form data, current step, etc.)
   * @returns {Object} Response with message and actions
   */
  async processMessage(message, sessionId, context = {}) {
    try {
      // Initialize service if not already done
      await this.initialize();
      
      console.log(`🔄 Processing message for session ${sessionId}: ${message}`);
      
      // Get or create conversation history for this session
      let conversationHistory = this.conversationHistory.get(sessionId) || [];
      
      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: message
      });

      // Step 1: Extract parameters from user input
      console.log('📊 Step 1: Extracting parameters...');
      const extractedParameters = await this.extractParameters(message, context);
      
      // Step 2: Validate extracted parameters
      console.log('✅ Step 2: Validating parameters...');
      const validationResult = await this.validateParameters(extractedParameters, message, context);
      
      // Step 3: Generate conversational response
      console.log('💬 Step 3: Generating response...');
      const conversationResponse = await this.generateConversationResponse(
        message, 
        extractedParameters, 
        validationResult, 
        context,
        sessionId
      );

      // Add AI response to history
      conversationHistory.push({
        role: 'assistant',
        content: conversationResponse.message
      });

      // Limit conversation history length
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }

      // Update conversation history
      this.conversationHistory.set(sessionId, conversationHistory);

      // Prepare response with all results
      const response = {
        message: conversationResponse.message,
        actions: this.buildActions(extractedParameters, validationResult),
        formUpdates: this.buildFormUpdates(extractedParameters, validationResult),
        navigateToStep: conversationResponse.navigateToStep,
        conversationState: 'completed',
        extractedParameters: extractedParameters,
        validationResult: validationResult
      };

      console.log('✅ Message processing completed successfully');
      return response;

    } catch (error) {
      console.error('❌ Enhanced OpenAI Service Error:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Step 1: Extract parameters from user input
   */
  async extractParameters(userInput, context) {
    try {
      const prompt = promptManager.getParameterExtractorPrompt(userInput, context);
      
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const extractedData = JSON.parse(response.choices[0].message.content);
      console.log('📊 Extracted parameters:', JSON.stringify(extractedData, null, 2));
      
      return extractedData;
      
    } catch (error) {
      console.error('❌ Parameter extraction failed:', error);
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
   * Step 2: Validate extracted parameters
   */
  async validateParameters(extractedParameters, userInput, context) {
    try {
      const prompt = promptManager.getParameterValidatorPrompt(
        extractedParameters, 
        userInput, 
        context.formData || {}
      );
      
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `Validate these parameters: ${JSON.stringify(extractedParameters)}`
          }
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const validationData = JSON.parse(response.choices[0].message.content);
      console.log('✅ Validation result:', JSON.stringify(validationData, null, 2));
      
      return validationData;
      
    } catch (error) {
      console.error('❌ Parameter validation failed:', error);
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
   * Step 3: Generate conversational response
   */
  async generateConversationResponse(message, extractedParameters, validationResult, context, sessionId) {
    try {
      // Get conversation history for this session
      const conversationHistory = this.conversationHistory.get(sessionId) || [];
      
      const prompt = promptManager.getConversationPrompt({
        ...context,
        extractedParameters,
        validationResult,
        conversationHistory: conversationHistory.slice(-6) // Last 6 messages for context
      });
      
      // Build messages array with conversation history
      const messages = [
        {
          role: 'system',
          content: prompt
        }
      ];
      
      // Add conversation history (last 4 exchanges for context)
      const recentHistory = conversationHistory.slice(-8); // Last 8 messages (4 exchanges)
      messages.push(...recentHistory);
      
      // Add current user message
      messages.push({
        role: 'user',
        content: message
      });
      
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: messages,
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature,
      });

      const aiResponse = response.choices[0].message.content;
      
      return {
        message: aiResponse,
        navigateToStep: this.determineNextStep(extractedParameters, validationResult, context)
      };
      
    } catch (error) {
      console.error('❌ Conversation generation failed:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        navigateToStep: null
      };
    }
  }

  /**
   * Build actions based on extracted parameters and validation
   */
  buildActions(extractedParameters, validationResult) {
    const actions = [];
    
    if (extractedParameters.scenario && Object.keys(extractedParameters.scenario).length > 0) {
      actions.push({
        description: `Extracted scenario configuration`,
        status: 'completed',
        details: extractedParameters.scenario
      });
    }
    
    if (extractedParameters.parameters && Object.keys(extractedParameters.parameters).length > 0) {
      actions.push({
        description: `Extracted model parameters`,
        status: 'completed',
        details: extractedParameters.parameters
      });
    }
    
    if (validationResult.is_valid) {
      actions.push({
        description: `Parameters validated successfully`,
        status: 'completed'
      });
    } else {
      actions.push({
        description: `Validation issues detected`,
        status: 'warning',
        details: validationResult.suggestions
      });
    }
    
    return actions;
  }

  /**
   * Build form updates based on extracted parameters
   */
  buildFormUpdates(extractedParameters, validationResult) {
    const updates = [];
    
    if (validationResult.is_valid && extractedParameters.scenario) {
      updates.push({
        section: 'scenario',
        data: extractedParameters.scenario
      });
    }
    
    if (validationResult.is_valid && extractedParameters.parameters) {
      updates.push({
        section: 'parameters',
        data: extractedParameters.parameters
      });
    }
    
    return updates;
  }

  /**
   * Determine next step based on parameters and validation
   */
  determineNextStep(extractedParameters, validationResult, context) {
    try {
      const currentStep = context.currentStep || 1;
      
      console.log(`🔍 EnhancedOpenAI: Determining next step from current step ${currentStep}`);
      console.log(`📊 Validation result:`, validationResult);
      console.log(`🔍 Extracted parameters:`, extractedParameters);

      // Check if we have new extracted parameters that indicate completion
      const hasNewData = extractedParameters && Object.keys(extractedParameters).length > 0;
      
      // Determine step completion based on extracted parameters and current step
      let shouldAdvance = false;
      let nextStep = currentStep;
      
      if (hasNewData) {
        // Step 1: Scenario Configuration
        if (currentStep === 1 && extractedParameters.scenario) {
          const scenario = extractedParameters.scenario;
          if (scenario.numMCS && scenario.numCEV && scenario.numNodes && scenario.scenarioName) {
            shouldAdvance = true;
            nextStep = 2;
            console.log(`✅ Step 1 complete: Scenario configured with ${scenario.numMCS} MCS, ${scenario.numCEV} CEVs, ${scenario.numNodes} nodes`);
          }
        }
        
        // Step 2: Model Parameters
        else if (currentStep === 2 && extractedParameters.parameters) {
          const parameters = extractedParameters.parameters;
          const requiredParams = ['eta_ch_dch', 'MCS_max', 'MCS_min', 'MCS_ini', 'CH_MCS', 'DCH_MCS'];
          if (requiredParams.every(param => parameters[param] !== undefined)) {
            shouldAdvance = true;
            nextStep = 3;
            console.log(`✅ Step 2 complete: Model parameters configured`);
          }
        }
        
        // Step 3: EV Data
        else if (currentStep === 3 && extractedParameters.evData) {
          const evData = extractedParameters.evData;
          if (evData.length > 0 && evData.every(ev => ev.SOE_min && ev.SOE_max && ev.ch_rate)) {
            shouldAdvance = true;
            nextStep = 4;
            console.log(`✅ Step 3 complete: EV data configured for ${evData.length} vehicles`);
          }
        }
        
        // Step 4: Location Data
        else if (currentStep === 4 && extractedParameters.locations) {
          const locations = extractedParameters.locations;
          if (locations.length > 0) {
            shouldAdvance = true;
            nextStep = 5;
            console.log(`✅ Step 4 complete: Location data configured for ${locations.length} locations`);
          }
        }
        
        // Step 5: Time Data
        else if (currentStep === 5 && extractedParameters.timeData) {
          const timeData = extractedParameters.timeData;
          if (timeData.priceRanges && timeData.priceRanges.length > 0) {
            shouldAdvance = true;
            nextStep = 6;
            console.log(`✅ Step 5 complete: Time data configured`);
          }
        }
        
        // Step 6: Matrix Data
        else if (currentStep === 6 && (extractedParameters.distanceMatrix || extractedParameters.travelTimeMatrix)) {
          shouldAdvance = true;
          nextStep = 7;
          console.log(`✅ Step 6 complete: Matrix data configured`);
        }
        
        // Step 7: Work Data
        else if (currentStep === 7 && extractedParameters.workSchedules) {
          const workSchedules = extractedParameters.workSchedules;
          if (workSchedules.length > 0) {
            shouldAdvance = true;
            nextStep = 8;
            console.log(`✅ Step 7 complete: Work schedules configured`);
          }
        }
        
        // Step 8: File Generation
        else if (currentStep === 8) {
          // Stay on step 8 for file generation
          shouldAdvance = false;
          nextStep = 8;
          console.log(`✅ Step 8: Ready for file generation`);
        }
      }
      
      // Update context with new step
      if (shouldAdvance) {
        context.currentStep = nextStep;
        console.log(`🚀 Auto-advancing from step ${currentStep} to step ${nextStep}`);
      } else {
        console.log(`⏸️ Staying on step ${currentStep} - step not complete or no new data`);
      }
      
      return nextStep;

    } catch (error) {
      console.error('❌ Error determining next step:', error);
      return context.currentStep || 1;
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

  /**
   * Get prompt statistics
   */
  getPromptStats() {
    return promptManager.getPromptStats();
  }
}

module.exports = new EnhancedOpenAIService();
