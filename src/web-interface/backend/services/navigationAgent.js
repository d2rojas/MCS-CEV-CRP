/**
 * Navigation Agent - Specialized agent for managing step navigation and form state
 * Handles automatic navigation between configuration steps
 */

class NavigationAgent {
  constructor() {
    this.formStates = new Map(); // Track form state per session
    this.stepCompleteness = new Map(); // Track step completeness per session
  }

  /**
   * Initialize or get form state for a session
   */
  getFormState(sessionId) {
    if (!this.formStates.has(sessionId)) {
      this.formStates.set(sessionId, {
        step: 1,
        scenario: {},
        parameters: {},
        evData: [],
        locations: [],
        timeData: {},
        distanceMatrix: [],
        travelTimeMatrix: [],
        workSchedules: [],
        lastUpdate: new Date()
      });
    }
    return this.formStates.get(sessionId);
  }

  /**
   * Update form state with new extracted parameters
   */
  updateFormState(sessionId, extractedParameters) {
    const formState = this.getFormState(sessionId);
    
    // Update form state with new parameters
    if (extractedParameters.scenario) {
      formState.scenario = { ...formState.scenario, ...extractedParameters.scenario };
    }
    if (extractedParameters.parameters) {
      formState.parameters = { ...formState.parameters, ...extractedParameters.parameters };
    }
    if (extractedParameters.evData) {
      formState.evData = extractedParameters.evData;
    }
    if (extractedParameters.locations) {
      formState.locations = extractedParameters.locations;
    }
    if (extractedParameters.timeData) {
      formState.timeData = extractedParameters.timeData;
    }
    if (extractedParameters.distanceMatrix) {
      formState.distanceMatrix = extractedParameters.distanceMatrix;
    }
    if (extractedParameters.travelTimeMatrix) {
      formState.travelTimeMatrix = extractedParameters.travelTimeMatrix;
    }
    if (extractedParameters.workSchedules) {
      formState.workSchedules = extractedParameters.workSchedules;
    }
    
    formState.lastUpdate = new Date();
    this.formStates.set(sessionId, formState);
    
    console.log(`📋 Navigation Agent: Updated form state for session ${sessionId}:`, {
      step: formState.step,
      scenario: Object.keys(formState.scenario),
      parameters: Object.keys(formState.parameters),
      evData: formState.evData.length,
      locations: formState.locations.length
    });
  }

  /**
   * Check if current step is complete
   */
  isStepComplete(sessionId, currentStep) {
    const formState = this.getFormState(sessionId);
    
    switch (currentStep) {
      case 1: // Scenario Configuration
        return this.isScenarioComplete(formState.scenario);
      
      case 2: // Model Parameters
        return this.isParametersComplete(formState.parameters);
      
      case 3: // EV Data
        return this.isEVDataComplete(formState.evData, formState.scenario.numCEV);
      
      case 4: // Location Data
        return this.isLocationDataComplete(formState.locations, formState.scenario.numNodes);
      
      case 5: // Time Data
        return this.isTimeDataComplete(formState.timeData);
      
      case 6: // Matrix Data
        return this.isMatrixDataComplete(formState.distanceMatrix, formState.travelTimeMatrix);
      
      case 7: // Work Data
        return this.isWorkDataComplete(formState.workSchedules);
      
      case 8: // File Generation
        return true; // Always complete for file generation
      
      default:
        return false;
    }
  }

  /**
   * Determine next step based on current state and extracted parameters
   */
  determineNextStep(sessionId, extractedParameters, validationResult) {
    const formState = this.getFormState(sessionId);
    const currentStep = formState.step;
    
    console.log(`🧭 Navigation Agent: Determining next step for session ${sessionId}`);
    console.log(`🧭 Current step: ${currentStep}`);
    console.log(`🧭 Extracted parameters:`, Object.keys(extractedParameters || {}));
    
    // Update form state with new parameters
    if (extractedParameters && Object.keys(extractedParameters).length > 0) {
      this.updateFormState(sessionId, extractedParameters);
    }
    
    // Check if current step is complete
    const isCurrentStepComplete = this.isStepComplete(sessionId, currentStep);
    console.log(`🧭 Step ${currentStep} complete: ${isCurrentStepComplete}`);
    
    // Smart Navigation Logic
    if (this.shouldAdvanceToNextStep(sessionId, currentStep, extractedParameters, validationResult)) {
      const nextStep = Math.min(currentStep + 1, 8);
      formState.step = nextStep;
      this.formStates.set(sessionId, formState);
      
      console.log(`🚀 Navigation Agent: Smart advancing from step ${currentStep} to step ${nextStep}`);
      return nextStep;
    }
    
    // If validation has critical errors, stay on current step
    if (validationResult && validationResult.is_valid === false && this.hasCriticalErrors(validationResult)) {
      console.log(`⚠️ Navigation Agent: Staying on step ${currentStep} due to critical validation errors`);
      return currentStep;
    }
    
    // If current step is complete and validation is acceptable, advance
    if (isCurrentStepComplete && this.isValidationAcceptable(validationResult)) {
      const nextStep = Math.min(currentStep + 1, 8);
      formState.step = nextStep;
      this.formStates.set(sessionId, formState);
      
      console.log(`🚀 Navigation Agent: Advancing from step ${currentStep} to step ${nextStep}`);
      return nextStep;
    }
    
    // If no new data provided, stay on current step
    if (!extractedParameters || Object.keys(extractedParameters).length === 0) {
      console.log(`⏸️ Navigation Agent: Staying on step ${currentStep} - no new data`);
      return currentStep;
    }
    
    // If current step is not complete, stay on current step
    console.log(`⏸️ Navigation Agent: Staying on step ${currentStep} - step not complete`);
    return currentStep;
  }

  /**
   * Smart navigation logic - determines if we should advance based on context
   */
  shouldAdvanceToNextStep(sessionId, currentStep, extractedParameters, validationResult) {
    // If user explicitly wants to move to next step
    if (extractedParameters && extractedParameters.userIntent === 'advance') {
      return true;
    }
    
    // If we have substantial data for the next step, advance
    if (this.hasSubstantialDataForNextStep(sessionId, currentStep, extractedParameters)) {
      return true;
    }
    
    // If current step is mostly complete (80%+), advance
    if (this.isStepMostlyComplete(sessionId, currentStep)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if validation is acceptable (allows minor warnings)
   */
  isValidationAcceptable(validationResult) {
    if (!validationResult) return true;
    
    // Accept if validation passed or has only minor warnings
    if (validationResult.is_valid === true) return true;
    if (validationResult.is_valid === false && validationResult.validation_score >= 0.7) return true;
    
    return false;
  }

  /**
   * Check if there are critical validation errors
   */
  hasCriticalErrors(validationResult) {
    if (!validationResult) return false;
    
    // Consider critical if validation score is very low
    return validationResult.validation_score < 0.5;
  }

  /**
   * Check if we have substantial data for the next step
   */
  hasSubstantialDataForNextStep(sessionId, currentStep, extractedParameters) {
    const formState = this.getFormState(sessionId);
    
    switch (currentStep) {
      case 1: // Scenario -> Parameters
        return extractedParameters.parameters && Object.keys(extractedParameters.parameters).length >= 3;
      
      case 2: // Parameters -> EV Data
        return extractedParameters.evData && extractedParameters.evData.length > 0;
      
      case 3: // EV Data -> Locations
        return extractedParameters.locations && extractedParameters.locations.length > 0;
      
      case 4: // Locations -> Time Data
        return extractedParameters.timeData && Object.keys(extractedParameters.timeData).length >= 2;
      
      case 5: // Time Data -> Matrix
        return extractedParameters.distanceMatrix && Object.keys(extractedParameters.distanceMatrix).length > 0;
      
      case 6: // Matrix -> Work Data
        return extractedParameters.workSchedules && extractedParameters.workSchedules.length > 0;
      
      default:
        return false;
    }
  }

  /**
   * Check if step is mostly complete (80%+)
   */
  isStepMostlyComplete(sessionId, currentStep) {
    const formState = this.getFormState(sessionId);
    
    switch (currentStep) {
      case 1: // Scenario
        const scenarioFields = Object.keys(formState.scenario).length;
        return scenarioFields >= 3; // At least 3 out of 4 required fields
      
      case 2: // Parameters
        const paramFields = Object.keys(formState.parameters).length;
        return paramFields >= 5; // At least 5 out of 6 required fields
      
      case 3: // EV Data
        return formState.evData && formState.evData.length >= Math.floor(formState.scenario.numCEV * 0.8);
      
      case 4: // Locations
        return formState.locations && formState.locations.length >= Math.floor(formState.scenario.numNodes * 0.8);
      
      default:
        return false;
    }
  }

  /**
   * Check if scenario configuration is complete
   */
  isScenarioComplete(scenario) {
    const required = ['numMCS', 'numCEV', 'numNodes', 'scenarioName'];
    const isComplete = required.every(field => 
      scenario[field] !== undefined && 
      scenario[field] !== null && 
      scenario[field] !== ''
    );
    
    console.log(`🧭 Scenario completeness check:`, {
      required,
      present: required.filter(field => scenario[field]),
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if model parameters are complete
   */
  isParametersComplete(parameters) {
    const required = ['eta_ch_dch', 'MCS_max', 'MCS_min', 'MCS_ini', 'CH_MCS', 'DCH_MCS'];
    const isComplete = required.every(field => 
      parameters[field] !== undefined && 
      parameters[field] !== null && 
      parameters[field] !== ''
    );
    
    console.log(`🧭 Parameters completeness check:`, {
      required,
      present: required.filter(field => parameters[field]),
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if EV data is complete
   */
  isEVDataComplete(evData, numCEV) {
    const isComplete = evData && evData.length >= numCEV && 
      evData.every(ev => ev.SOE_min && ev.SOE_max && ev.ch_rate);
    
    console.log(`🧭 EV data completeness check:`, {
      required: numCEV,
      present: evData ? evData.length : 0,
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if location data is complete
   */
  isLocationDataComplete(locations, numNodes) {
    const isComplete = locations && locations.length >= numNodes;
    
    console.log(`🧭 Location data completeness check:`, {
      required: numNodes,
      present: locations ? locations.length : 0,
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if time data is complete
   */
  isTimeDataComplete(timeData) {
    const isComplete = timeData && timeData.priceRanges && timeData.priceRanges.length > 0;
    
    console.log(`🧭 Time data completeness check:`, {
      hasTimeData: !!timeData,
      hasPriceRanges: timeData && !!timeData.priceRanges,
      priceRangesCount: timeData && timeData.priceRanges ? timeData.priceRanges.length : 0,
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if matrix data is complete
   */
  isMatrixDataComplete(distanceMatrix, travelTimeMatrix) {
    const isComplete = distanceMatrix && travelTimeMatrix && 
      distanceMatrix.length > 0 && travelTimeMatrix.length > 0;
    
    console.log(`🧭 Matrix data completeness check:`, {
      hasDistanceMatrix: !!distanceMatrix,
      hasTravelTimeMatrix: !!travelTimeMatrix,
      distanceMatrixLength: distanceMatrix ? distanceMatrix.length : 0,
      travelTimeMatrixLength: travelTimeMatrix ? travelTimeMatrix.length : 0,
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Check if work data is complete
   */
  isWorkDataComplete(workSchedules) {
    const isComplete = workSchedules && workSchedules.length > 0;
    
    console.log(`🧭 Work data completeness check:`, {
      hasWorkSchedules: !!workSchedules,
      workSchedulesCount: workSchedules ? workSchedules.length : 0,
      isComplete
    });
    
    return isComplete;
  }

  /**
   * Get current form state for a session
   */
  getCurrentFormState(sessionId) {
    return this.getFormState(sessionId);
  }

  /**
   * Clear form state for a session
   */
  clearFormState(sessionId) {
    this.formStates.delete(sessionId);
    this.stepCompleteness.delete(sessionId);
    console.log(`🧭 Navigation Agent: Cleared form state for session ${sessionId}`);
  }

  /**
   * Get step completion status for all steps
   */
  getStepCompletionStatus(sessionId) {
    const formState = this.getFormState(sessionId);
    const status = {};
    
    for (let step = 1; step <= 8; step++) {
      status[step] = this.isStepComplete(sessionId, step);
    }
    
    return status;
  }
}

module.exports = new NavigationAgent();

