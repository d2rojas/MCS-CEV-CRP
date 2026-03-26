// Validation utilities for the optimization interface

export const validateScenarioData = (formData) => {
  const errors = [];
  
  // Validate scenario configuration
  if (!formData.scenario.scenarioName) {
    errors.push("Scenario name is required");
  }
  
  if (formData.scenario.numMCS < 1 || formData.scenario.numMCS > 10) {
    errors.push("Number of MCS must be between 1 and 10");
  }
  
  if (formData.scenario.numCEV < 1 || formData.scenario.numCEV > 20) {
    errors.push("Number of CEVs must be between 1 and 20");
  }
  
  if (formData.scenario.numNodes < 2 || formData.scenario.numNodes > 20) {
    errors.push("Number of nodes must be between 2 and 20");
  }
  
  return errors;
};

export const validateParameters = (parameters) => {
  const errors = [];
  
  if (parameters.eta_ch_dch <= 0 || parameters.eta_ch_dch > 1) {
    errors.push("Charging/Discharging efficiency must be between 0 and 1");
  }
  
  if (parameters.MCS_max <= parameters.MCS_min) {
    errors.push("MCS maximum capacity must be greater than minimum capacity");
  }
  
  if (parameters.MCS_ini < parameters.MCS_min || parameters.MCS_ini > parameters.MCS_max) {
    errors.push("MCS initial capacity must be between minimum and maximum");
  }
  
  if (parameters.CH_MCS <= 0) {
    errors.push("MCS charging rate must be positive");
  }
  
  if (parameters.DCH_MCS <= 0) {
    errors.push("MCS discharging rate must be positive");
  }
  
  if (parameters.delta_T <= 0) {
    errors.push("Time interval must be positive");
  }
  
  return errors;
};

export const validateEVData = (evData) => {
  const errors = [];
  
  evData.forEach((ev, index) => {
    if (ev.SOE_min < 0 || ev.SOE_min > 100) {
      errors.push(`EV ${index + 1}: Minimum SOE must be between 0 and 100`);
    }
    
    if (ev.SOE_max < 0 || ev.SOE_max > 100) {
      errors.push(`EV ${index + 1}: Maximum SOE must be between 0 and 100`);
    }
    
    if (ev.SOE_ini < ev.SOE_min || ev.SOE_ini > ev.SOE_max) {
      errors.push(`EV ${index + 1}: Initial SOE must be between minimum and maximum`);
    }
    
    if (ev.ch_rate <= 0) {
      errors.push(`EV ${index + 1}: Charging rate must be positive`);
    }
  });
  
  return errors;
};

export const validateLocationData = (locations, numCEV) => {
  const errors = [];
  
  // Check that grid node has no EVs assigned
  const gridNode = locations.find(loc => loc.type === 'grid');
  if (gridNode) {
    for (let ev = 1; ev <= numCEV; ev++) {
      if (gridNode.evAssignments[ev] === 1) {
        errors.push("Grid nodes cannot have EVs assigned");
        break;
      }
    }
  }
  
  // Check that each EV is assigned to exactly one construction site
  for (let ev = 1; ev <= numCEV; ev++) {
    const assignments = locations
      .filter(loc => loc.type === 'construction')
      .filter(loc => loc.evAssignments[ev] === 1);
    
    if (assignments.length === 0) {
      errors.push(`EV ${ev} must be assigned to at least one construction site`);
    } else if (assignments.length > 1) {
      errors.push(`EV ${ev} can only be assigned to one construction site`);
    }
  }
  
  return errors;
};

export const validateTimeData = (timeData) => {
  const errors = [];
  
  if (timeData.length === 0) {
    errors.push("Time data is required");
    return errors;
  }
  
  timeData.forEach((item, index) => {
    if (item.electricityPrice < 0) {
      errors.push(`Period ${index + 1}: Electricity price cannot be negative`);
    }
    
    if (item.co2Intensity < 0) {
      errors.push(`Period ${index + 1}: CO2 intensity cannot be negative`);
    }
  });
  
  return errors;
};

export const validateWorkData = (workData, timeData) => {
  const errors = [];
  
  // If workData is empty but we have timeData, it means work data hasn't been generated yet
  // This is normal during the configuration process, so we don't show an error
  if (!workData || workData.length === 0) {
    if (timeData && timeData.length > 0) {
      return errors; // No error - work data will be generated when user configures it
    } else {
      errors.push("Work data is required");
      return errors;
    }
  }
  
  // Validate each work item
  workData.forEach((workItem, index) => {
    if (!workItem) {
      errors.push(`Work item ${index + 1}: Invalid work item data`);
      return;
    }
    
    // Check if workItem has required properties
    if (typeof workItem.location === 'undefined' || typeof workItem.ev === 'undefined') {
      errors.push(`Work item ${index + 1}: Missing required properties (location, ev)`);
      return;
    }
    
    // Validate work requirements
    if (workItem.workRequirements) {
      if (!Array.isArray(workItem.workRequirements)) {
        errors.push(`Work item ${index + 1}: Work requirements must be an array`);
        return;
      }
      
      workItem.workRequirements.forEach((requirement, periodIndex) => {
        if (!requirement) {
          errors.push(`Work item ${index + 1}, period ${periodIndex + 1}: Invalid requirement data`);
          return;
        }
        
        // Handle both object format (new) and number format (old)
        let workPower;
        if (typeof requirement === 'object' && requirement !== null) {
          workPower = requirement.workPower;
        } else if (typeof requirement === 'number') {
          workPower = requirement;
        } else {
          errors.push(`Work item ${index + 1}, period ${periodIndex + 1}: Invalid requirement format`);
          return;
        }
        
        // Validate work power value
        if (typeof workPower !== 'number' || isNaN(workPower)) {
          errors.push(`Work item ${index + 1}, period ${periodIndex + 1}: Work power must be a valid number`);
        } else if (workPower < 0) {
          errors.push(`Work item ${index + 1}, period ${periodIndex + 1}: Work requirement cannot be negative`);
        }
      });
    } else {
      errors.push(`Work item ${index + 1}: Missing work requirements`);
    }
  });
  
  return errors;
};

export const validateAllData = (formData) => {
  const errors = [];
  
  // Scenario validation
  errors.push(...validateScenarioData(formData));
  
  // Parameters validation
  errors.push(...validateParameters(formData.parameters));
  
  // EV data validation
  errors.push(...validateEVData(formData.evData));
  
  // Location data validation
  errors.push(...validateLocationData(formData.locations, formData.scenario.numCEV));
  
  // Time data validation
  errors.push(...validateTimeData(formData.timeData));
  
  // Work data validation
  errors.push(...validateWorkData(formData.workData, formData.timeData));
  
  return errors;
};

// Matrix validation utilities
export const validateSymmetricMatrix = (matrix, name) => {
  const errors = [];
  
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] !== matrix[j][i]) {
        errors.push(`${name} matrix is not symmetric at position [${i+1},${j+1}]`);
      }
    }
  }
  
  return errors;
};

export const validateDistanceMatrix = (distances) => {
  const errors = [];
  
  // Check symmetry
  errors.push(...validateSymmetricMatrix(distances, "Distance"));
  
  // Check diagonal is zero
  for (let i = 0; i < distances.length; i++) {
    if (distances[i][i] !== 0) {
      errors.push(`Distance matrix diagonal must be zero at position [${i+1},${i+1}]`);
    }
  }
  
  // Check non-negative values
  for (let i = 0; i < distances.length; i++) {
    for (let j = 0; j < distances[i].length; j++) {
      if (distances[i][j] < 0) {
        errors.push(`Distance matrix cannot have negative values at position [${i+1},${j+1}]`);
      }
    }
  }
  
  return errors;
};

export const validateTravelTimeMatrix = (times) => {
  const errors = [];
  
  // Check symmetry
  errors.push(...validateSymmetricMatrix(times, "Travel time"));
  
  // Check diagonal is zero
  for (let i = 0; i < times.length; i++) {
    if (times[i][i] !== 0) {
      errors.push(`Travel time matrix diagonal must be zero at position [${i+1},${i+1}]`);
    }
  }
  
  // Check non-negative values
  for (let i = 0; i < times.length; i++) {
    for (let j = 0; j < times[i].length; j++) {
      if (times[i][j] < 0) {
        errors.push(`Travel time matrix cannot have negative values at position [${i+1},${j+1}]`);
      }
    }
  }
  
  return errors;
};
