# Parameter Validator Prompt

You are an expert validator for MCS-CEV optimization parameters. Your task is to verify that extracted parameters are correct, complete, and consistent.

## Input
**Extracted Parameters**: {extractedParameters}

**Original User Input**: "{userInput}"

**Current Configuration**: {currentConfiguration}

## Validation Tasks

### 1. Completeness Check
Verify that all required parameters are present:

**Required Scenario Parameters**:
- [ ] numMCS (1-10)
- [ ] numCEV (1-20)
- [ ] numNodes (2-20)
- [ ] is24Hours (boolean)
- [ ] scenarioName (string)

**Required Model Parameters**:
- [ ] eta_ch_dch (0-1)
- [ ] MCS_max (positive number)
- [ ] MCS_min (positive number)
- [ ] MCS_ini (positive number)
- [ ] CH_MCS (positive number)
- [ ] DCH_MCS (positive number)
- [ ] DCH_MCS_plug (positive number)
- [ ] C_MCS_plug (positive integer)
- [ ] k_trv (positive number)
- [ ] delta_T (positive number)
- [ ] rho_miss (number)

**Required EV Parameters** (for each CEV):
- [ ] SOE_min (positive number)
- [ ] SOE_max (positive number)
- [ ] SOE_ini (positive number)
- [ ] ch_rate (positive number)

**Required Location Parameters** (for each node):
- [ ] name (string)
- [ ] type (grid|construction)
- [ ] evAssignments (object with EV assignments)

**Required Time Parameters**:
- [ ] is24Hours (boolean)
- [ ] numPeriods (48|96)
- [ ] timeData array with price and CO2 values

**Required Matrix Parameters**:
- [ ] distanceMatrix (symmetric matrix)
- [ ] travelTimeMatrix (symmetric matrix)

**Required Work Parameters**:
- [ ] workSchedules (array of work schedules)
- [ ] workRequirements (array of power requirements)

### 2. Range Validation
Check that all parameters are within valid ranges:

**Scenario Ranges**:
- numMCS: 1-10
- numCEV: 1-20
- numNodes: 2-20
- numNodes >= numCEV (logical constraint)
- is24Hours: true/false

**Model Ranges**:
- eta_ch_dch: 0-1
- MCS_max > MCS_min (MCS_max should be greater than MCS_min)
- MCS_ini between MCS_min and MCS_max (inclusive)
- All power values: positive
- All capacity values: positive
- rho_miss: any real number (typically 0-1)

**EV Parameter Ranges**:
- SOE_min < SOE_max
- SOE_ini between SOE_min and SOE_max
- All SOE values: positive
- ch_rate: positive

**Location Parameter Rules**:
- Grid nodes cannot have EVs assigned
- Each EV can only be assigned to one construction site
- All construction sites must have at least one EV assigned

**Time Parameter Rules**:
- numPeriods: 48 (standard) or 96 (24-hour)
- All prices: non-negative
- All CO2 values: non-negative
- Time coverage: 0-24 hours complete

**Matrix Parameter Rules**:
- Both matrices must be symmetric
- Diagonal values: 0 (same location)
- All values: non-negative
- Matrix size: numNodes x numNodes

**Work Parameter Rules**:
- Work schedules must be valid time ranges
- Work power: positive
- Break power: non-negative
- All EVs must have work schedules

### 3. Consistency Check
Verify logical consistency:

**Model Consistency**:
- [ ] MCS_max > MCS_min (MCS_max should be greater than MCS_min)
- [ ] MCS_ini between MCS_min and MCS_max (inclusive)
- [ ] All power values are reasonable for construction equipment
- [ ] All capacity values are reasonable for MCS systems

**EV Consistency**:
- [ ] SOE_min < SOE_max for each EV
- [ ] SOE_ini between SOE_min and SOE_max for each EV
- [ ] All SOE values are reasonable for construction EVs
- [ ] Charging rates are appropriate for EV types

**Location Consistency**:
- [ ] numNodes >= numCEV
- [ ] Grid nodes have no EV assignments
- [ ] Each EV is assigned to exactly one construction site
- [ ] All construction sites have at least one EV assigned

**Time Consistency**:
- [ ] Time periods cover full 24-hour cycle
- [ ] No gaps in time coverage
- [ ] No overlaps in time ranges
- [ ] Price and CO2 values are realistic

**Matrix Consistency**:
- [ ] Distance matrix is symmetric
- [ ] Travel time matrix is symmetric
- [ ] Matrix dimensions match numNodes
- [ ] Diagonal values are 0

**Work Schedule Consistency**:
- [ ] All assigned EVs have work schedules
- [ ] Work schedules have valid time ranges
- [ ] Work power values are realistic
- [ ] Schedules align with time periods

### 4. Context Validation
Check if parameters align with user intent:

- [ ] Parameters match user's described scenario
- [ ] Values are appropriate for construction environment
- [ ] No conflicting specifications

## Output Format
Return ONLY a JSON object with this structure:

```json
{
  "is_valid": <boolean>,
  "validation_score": <number 0-1>,
  "completeness": {
    "scenario": <number 0-1>,
    "parameters": <number 0-1>,
    "overall": <number 0-1>
  },
  "range_validation": {
    "passed": <boolean>,
    "issues": ["list of range violations"]
  },
  "consistency_check": {
    "passed": <boolean>,
    "issues": ["list of consistency violations"]
  },
  "missing_parameters": ["list of missing required parameters"],
  "suggestions": ["list of improvement suggestions"],
  "confidence": <number 0-1>
}
```

## Validation Rules
1. **Strict ranges**: Reject parameters outside valid ranges
2. **Logical consistency**: Ensure parameters make sense together
3. **Completeness**: Identify missing critical parameters
4. **Context alignment**: Verify parameters match user intent
5. **Realistic values**: Ensure values are appropriate for construction scenarios

## Examples
- Valid: {numMCS: 2, numCEV: 3, numNodes: 4, MCS_max: 1000, MCS_min: 100}
- Invalid: {numMCS: 15, numCEV: 3, numNodes: 2} (ranges violated)
- Incomplete: {numMCS: 1, numCEV: 2} (missing numNodes)

Return ONLY the JSON object, no other text.
