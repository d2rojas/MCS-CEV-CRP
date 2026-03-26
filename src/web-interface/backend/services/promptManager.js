const fs = require('fs-extra');
const path = require('path');

class PromptManager {
  constructor() {
    this.promptsDir = path.join(__dirname, '..', 'prompts');
    this.prompts = {};
    this.loaded = false;
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the prompt manager (load prompts)
   */
  initialize() {
    if (!this.loaded) {
      this.loadPromptsSync();
      this.loaded = true;
    }
  }

  /**
   * Load all prompt files from the prompts directory (synchronous)
   */
  loadPromptsSync() {
    try {
      console.log(`📁 Loading prompts from: ${this.promptsDir}`);
      
      // Check if directory exists
      if (!fs.existsSync(this.promptsDir)) {
        console.error(`❌ Prompts directory does not exist: ${this.promptsDir}`);
        return;
      }
      
      const files = fs.readdirSync(this.promptsDir);
      console.log(`📂 Found files in prompts directory: ${files.join(', ')}`);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const promptName = file.replace('.md', '');
          const promptPath = path.join(this.promptsDir, file);
          
          try {
            const promptContent = fs.readFileSync(promptPath, 'utf8');
            this.prompts[promptName] = promptContent;
            console.log(`📝 Loaded prompt: ${promptName}`);
          } catch (readError) {
            console.error(`❌ Error reading prompt file ${file}:`, readError);
          }
        }
      }
      
      console.log(`✅ Loaded ${Object.keys(this.prompts).length} prompts: ${Object.keys(this.prompts).join(', ')}`);
    } catch (error) {
      console.error('❌ Error loading prompts:', error);
    }
  }

  /**
   * Load all prompt files from the prompts directory (async version for compatibility)
   */
  async loadPrompts() {
    this.loadPromptsSync();
  }

  /**
   * Get a prompt by name
   * @param {string} promptName - Name of the prompt file (without .md extension)
   * @returns {string} Prompt content
   */
  getPrompt(promptName) {
    if (!this.prompts[promptName]) {
      throw new Error(`Prompt '${promptName}' not found. Available prompts: ${Object.keys(this.prompts).join(', ')}`);
    }
    return this.prompts[promptName];
  }

  /**
   * Get conversation manager prompt with context
   * @param {Object} context - Current conversation context
   * @returns {string} Formatted prompt
   */
  getConversationPrompt(context = {}) {
    let prompt = this.getPrompt('conversation-manager');
    
    // Replace placeholders with actual values
    prompt = prompt.replace('{currentStep}', context.currentStep || 'Not set');
    prompt = prompt.replace('{currentConfiguration}', JSON.stringify(context.formData || {}, null, 2));
    prompt = prompt.replace('{previousActions}', JSON.stringify(context.previousActions || [], null, 2));
    
    // Add agent results to the context
    if (context.extractedParameters) {
      prompt = prompt.replace('{extractedParameters}', JSON.stringify(context.extractedParameters, null, 2));
    } else {
      prompt = prompt.replace('{extractedParameters}', 'No parameters extracted');
    }
    
    if (context.validationResult) {
      prompt = prompt.replace('{validationResult}', JSON.stringify(context.validationResult, null, 2));
    } else {
      prompt = prompt.replace('{validationResult}', 'No validation performed');
    }
    
    if (context.recommendationResult) {
      prompt = prompt.replace('{recommendationResult}', JSON.stringify(context.recommendationResult, null, 2));
    } else {
      prompt = prompt.replace('{recommendationResult}', 'No recommendations provided');
    }
    
    // Format conversation history
    let conversationHistoryText = 'No previous conversation.';
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      conversationHistoryText = context.conversationHistory.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      }).join('\n');
    }
    prompt = prompt.replace('{conversationHistory}', conversationHistoryText);
    
    return prompt;
  }

  /**
   * Get understanding agent prompt with context
   * @param {string} userInput - User's input message
   * @param {Object} context - Current context
   * @returns {string} Formatted prompt
   */
  getUnderstandingAgentPrompt(userInput, context = {}) {
    let prompt = this.getPrompt('understanding-agent');
    
    // Replace placeholders with actual values
    prompt = prompt.replace('{userInput}', userInput);
    prompt = prompt.replace('{currentContext}', JSON.stringify(context, null, 2));
    
    // Format conversation history
    let conversationHistoryText = 'No previous conversation.';
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      conversationHistoryText = context.conversationHistory.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      }).join('\n');
    }
    prompt = prompt.replace('{conversationHistory}', conversationHistoryText);
    
    // Format workflow state
    let workflowStateText = 'No workflow state.';
    if (context.workflowState) {
      workflowStateText = JSON.stringify(context.workflowState, null, 2);
    }
    prompt = prompt.replace('{workflowState}', workflowStateText);
    
    return prompt;
  }

  /**
   * Get validation agent prompt with context
   * @param {Object} extractedParameters - Parameters extracted from user input
   * @param {string} userInput - Original user input
   * @param {Object} currentConfiguration - Current configuration
   * @param {Object} workflowState - Current workflow state
   * @returns {string} Formatted prompt
   */
  getValidationAgentPrompt(extractedParameters, userInput, currentConfiguration = {}, workflowState = {}) {
    let prompt = this.getPrompt('validation-agent');
    
    // Replace placeholders with actual values
    prompt = prompt.replace('{extractedParameters}', JSON.stringify(extractedParameters, null, 2));
    prompt = prompt.replace('{userInput}', userInput);
    prompt = prompt.replace('{currentConfiguration}', JSON.stringify(currentConfiguration, null, 2));
    prompt = prompt.replace('{workflowState}', JSON.stringify(workflowState, null, 2));
    
    return prompt;
  }

  /**
   * Get recommendation agent prompt with context
   * @param {string} userInput - User's input message
   * @param {Object} extractedParameters - Extracted parameters
   * @param {Object} validationResult - Validation results
   * @param {Object} workflowState - Current workflow state
   * @returns {string} Formatted prompt
   */
  getRecommendationAgentPrompt(userInput, extractedParameters, validationResult, workflowState = {}) {
    let prompt = this.getPrompt('recommendation-agent');
    
    // Replace placeholders with actual values
    prompt = prompt.replace('{userInput}', userInput);
    prompt = prompt.replace('{extractedParameters}', JSON.stringify(extractedParameters, null, 2));
    prompt = prompt.replace('{validationResult}', JSON.stringify(validationResult, null, 2));
    prompt = prompt.replace('{workflowState}', JSON.stringify(workflowState, null, 2));
    
    return prompt;
  }

  /**
   * Get all available prompt names
   * @returns {Array} List of prompt names
   */
  getAvailablePrompts() {
    return Object.keys(this.prompts);
  }

  /**
   * Reload prompts from files
   */
  async reloadPrompts() {
    console.log('🔄 Reloading prompts...');
    this.prompts = {};
    await this.loadPrompts();
  }

  /**
   * Get prompt statistics
   * @returns {Object} Statistics about loaded prompts
   */
  getPromptStats() {
    const stats = {
      totalPrompts: Object.keys(this.prompts).length,
      promptNames: Object.keys(this.prompts),
      totalSize: 0
    };

    for (const [name, content] of Object.entries(this.prompts)) {
      stats.totalSize += content.length;
    }

    return stats;
  }
}

// Create singleton instance
const promptManager = new PromptManager();

module.exports = promptManager;
