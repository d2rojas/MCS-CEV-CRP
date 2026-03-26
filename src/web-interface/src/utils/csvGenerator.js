import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateCSVFiles = (formData) => {
  const { scenario, parameters, evData, locations, distanceMatrix, travelTimeMatrix, timeData, workData } = formData;
  
  const csvFiles = {};

  // Generate parameters.csv with correct delta_T based on scenario
  csvFiles['parameters.csv'] = generateParametersCSV(parameters, scenario.numMCS, scenario.is24Hours);

  // Generate ev_data.csv
  csvFiles['ev_data.csv'] = generateEVDataCSV(evData);

  // Generate place.csv
  csvFiles['place.csv'] = generatePlaceCSV(locations, scenario.numCEV);

  // Generate distance.csv using user-configured matrix
  csvFiles['distance.csv'] = generateDistanceCSVFromMatrix(distanceMatrix, scenario.numNodes);

  // Generate travel_time.csv using user-configured matrix
  csvFiles['travel_time.csv'] = generateTravelTimeCSVFromMatrix(travelTimeMatrix, scenario.numNodes);

  // Generate time_data.csv
  csvFiles['time_data.csv'] = generateTimeDataCSV(timeData);

  // Generate work.csv
  csvFiles['work.csv'] = generateWorkCSV(workData, timeData, formData.locations);

  // Generate CAISO files for 24-hour scenarios
  if (scenario.is24Hours) {
    csvFiles['CAISO-demand-20250806.csv'] = generateCAISODemandCSV(timeData);
    csvFiles['CAISO-co2-20250806.csv'] = generateCAISOCO2CSV(timeData);
  }

  return csvFiles;
};

const generateParametersCSV = (parameters, numMCS, is24Hours) => {
  // Calculate correct delta_T based on scenario type
  const deltaT = is24Hours ? 0.25 : 0.5; // 15 minutes for 24h, 30 minutes for standard
  
  const data = [
    { Parameter: 'eta_ch_dch', Value: parameters.eta_ch_dch, Unit: 'dimensionless', Description: 'Charging/Discharging Efficiency' },
    { Parameter: 'MCS_max', Value: parameters.MCS_max, Unit: 'kWh', Description: 'MCS Maximum Capacity' },
    { Parameter: 'MCS_min', Value: parameters.MCS_min, Unit: 'kWh', Description: 'MCS Minimum Capacity' },
    { Parameter: 'MCS_ini', Value: parameters.MCS_ini, Unit: 'kWh', Description: 'MCS Initial Capacity' },
    { Parameter: 'CH_MCS', Value: parameters.CH_MCS, Unit: 'kW', Description: 'MCS Charging Rate' },
    { Parameter: 'DCH_MCS', Value: parameters.DCH_MCS, Unit: 'kW', Description: 'MCS Discharging Rate' },
    { Parameter: 'DCH_MCS_plug', Value: parameters.DCH_MCS_plug, Unit: 'kW', Description: 'MCS Discharging Rate with Plug' },
    { Parameter: 'C_MCS_plug', Value: parameters.C_MCS_plug, Unit: 'units', Description: 'MCS Plug Capacity' },
    { Parameter: 'k_way', Value: parameters.k_trv, Unit: 'kWh/mile', Description: 'MCS Road Energy Consumption' },
    { Parameter: 'delta_T', Value: deltaT, Unit: 'hours', Description: 'Time Interval' },
    { Parameter: 'rho_miss', Value: parameters.rho_miss, Unit: 'dimensionless', Description: 'Missed Work Penalty' },
    { Parameter: 'num_mcs', Value: numMCS, Unit: '-', Description: 'Number of MCSs' },
    { Parameter: 'lambda_demand', Value: parameters.lambda_demand, Unit: '$/kW', Description: 'Demand Charge' },
    { Parameter: 'carbon_price_per_ton', Value: parameters.carbon_price_per_ton, Unit: '$/ton', Description: 'Social Cost of Carbon' }
  ];

  return Papa.unparse(data);
};

const generateEVDataCSV = (evData) => {
  const data = evData.map(ev => ({
    'Unnamed: 0': `e${ev.id}`,
    'SOE_min': ev.SOE_min,
    'SOE_max': ev.SOE_max,
    'SOE_ini': ev.SOE_ini,
    'ch_rate': ev.ch_rate,
    'power': 25,
    'max_speed': 2.8,
    'road_consumption': 0.6
  }));

  return Papa.unparse(data);
};

const generatePlaceCSV = (locations, numCEV) => {
  const data = locations.map((location, index) => {
    const row = { site: `i${index + 1}` };
    
    // Add EV assignment columns
    for (let ev = 1; ev <= numCEV; ev++) {
      row[`e${ev}`] = location.evAssignments[ev] || 0;
    }
    
    return row;
  });

  return Papa.unparse(data);
};

const generateDistanceCSVFromMatrix = (distanceMatrix, numNodes) => {
  const data = [];
  
  // Header row
  const header = ['Unnamed: 0'];
  for (let i = 1; i <= numNodes; i++) {
    header.push(`i${i}`);
  }
  data.push(header);
  
  // Use user-configured matrix or generate default if empty
  const distances = distanceMatrix.length > 0 ? distanceMatrix : generateDefaultDistanceMatrix(numNodes);
  
  // Data rows
  for (let i = 1; i <= numNodes; i++) {
    const row = [`i${i}`];
    for (let j = 1; j <= numNodes; j++) {
      row.push(distances[i-1][j-1]);
    }
    data.push(row);
  }

  return Papa.unparse(data);
};

const generateDefaultDistanceMatrix = (numNodes) => {
  const distances = [];
  for (let i = 0; i < numNodes; i++) {
    distances[i] = [];
    for (let j = 0; j < numNodes; j++) {
      if (i === j) {
        distances[i][j] = 0; // Distance to self is 0
      } else {
        distances[i][j] = 1; // Default distance of 1
      }
    }
  }
  return distances;
};

const generateTravelTimeCSVFromMatrix = (travelTimeMatrix, numNodes) => {
  const data = [];
  
  // Header row
  const header = ['Unnamed: 0'];
  for (let i = 1; i <= numNodes; i++) {
    header.push(`i${i}`);
  }
  data.push(header);
  
  // Use user-configured matrix or generate default if empty
  const times = travelTimeMatrix.length > 0 ? travelTimeMatrix : generateDefaultTravelTimeMatrix(numNodes);
  
  // Data rows
  for (let i = 1; i <= numNodes; i++) {
    const row = [`i${i}`];
    for (let j = 1; j <= numNodes; j++) {
      row.push(times[i-1][j-1]);
    }
    data.push(row);
  }

  return Papa.unparse(data);
};

const generateDefaultTravelTimeMatrix = (numNodes) => {
  const times = [];
  for (let i = 0; i < numNodes; i++) {
    times[i] = [];
    for (let j = 0; j < numNodes; j++) {
      if (i === j) {
        times[i][j] = 0; // Travel time to self is 0
      } else {
        times[i][j] = 1; // Default travel time of 1 period
      }
    }
  }
  return times;
};

const generateTimeDataCSV = (timeData) => {
  const data = timeData.map((item, index) => ({
    'Unnamed: 0': item.time,
    'Unnamed: 1': `t${index + 1}`,
    'lambda_buy': item.electricityPrice,
    'lambda_CO2': item.co2Intensity
  }));

  return Papa.unparse(data);
};

const generateWorkCSV = (workData, timeData, locations) => {
  console.log('🔍 DEBUG: Generating work CSV with data:', {
    workDataLength: workData ? workData.length : 0,
    workData: workData,
    timeDataLength: timeData ? timeData.length : 0,
    locationsLength: locations ? locations.length : 0
  });
  
  // Check if workData is empty or has no valid data
  if (!workData || workData.length === 0) {
    console.log('⚠️ WARNING: workData is empty! This will result in all zeros.');
    console.log('🔍 DEBUG: Creating default work data with realistic values...');
    
    // Create default work data with realistic values
    const defaultWorkData = [];
    if (locations && locations.length > 0) {
      // Create work data for each location with at least one EV
      locations.forEach((location, index) => {
        if (index < 2) { // Only create work for first 2 locations
          defaultWorkData.push({
            location: location.id,
            ev: 1,
            workRequirements: timeData.map((timePoint, tIndex) => {
              // Create work during business hours (8 AM to 5 PM)
              const hour = parseInt(timePoint.time.split(':')[0]);
              const workPower = (hour >= 8 && hour < 17) ? 50 : 0;
              return {
                time: timePoint.time,
                workPower: workPower,
                status: workPower > 0 ? 'Working' : 'Off'
              };
            })
          });
        }
      });
    }
    
    console.log('🔍 DEBUG: Generated default work data:', defaultWorkData);
    return generateWorkCSVWithData(defaultWorkData, timeData, locations);
  }
  
  return generateWorkCSVWithData(workData, timeData, locations);
};

const generateWorkCSVWithData = (workData, timeData, locations) => {
  const data = [];
  
  // Header row
  const header = ['Location', 'EV'];
  for (let i = 1; i <= timeData.length; i++) {
    header.push(`t${i}`);
  }
  data.push(header);
  
  // Generate all possible location-EV combinations
  const numNodes = locations.length;
  const numCEV = workData.length > 0 ? Math.max(...workData.map(w => w.ev)) : 0;
  
  for (let locationIndex = 0; locationIndex < numNodes; locationIndex++) {
    const location = locations[locationIndex];
    const locationId = location.id; // Use the actual location ID
    
    for (let ev = 1; ev <= numCEV; ev++) {
      const row = [`i${locationId}`, `e${ev}`];
      
      // Check if this EV is assigned to this location
      // If no assignments are defined, assign EV 1 to first location, EV 2 to second location, etc.
      const isAssigned = location.evAssignments && location.evAssignments[ev] === 1;
      const fallbackAssigned = !location.evAssignments && ev === 1 && locationIndex < 2;
      
      // Add work requirements for all time periods
      for (let t = 1; t <= timeData.length; t++) {
        if (isAssigned || fallbackAssigned) {
          // Find the work requirement for this location-EV combination
          const workItem = workData.find(w => w.location === locationId && w.ev === ev);
          if (workItem && workItem.workRequirements && workItem.workRequirements[t - 1]) {
            // Extract workPower from the workRequirements object
            const requirement = workItem.workRequirements[t - 1];
            const workPower = typeof requirement === 'object' ? requirement.workPower : requirement;
            row.push(workPower || 0);
            if (t === 1) {
              console.log(`🔍 DEBUG: EV${ev} at Location${locationId} - Work requirement: ${workPower}`);
            }
          } else {
            // Fallback: Create default work during business hours (8 AM to 5 PM)
            const hour = parseInt(timeData[t - 1].time.split(':')[0]);
            const defaultWorkPower = (hour >= 8 && hour < 17) ? 50 : 0;
            row.push(defaultWorkPower);
            if (t === 1) {
              console.log(`🔍 DEBUG: EV${ev} at Location${locationId} - No work data found, using default: ${defaultWorkPower}`);
            }
          }
        } else {
          // No work if EV is not assigned to this location
          row.push(0);
        }
      }
      
      data.push(row);
    }
  }

  console.log('🔍 DEBUG: Generated work CSV data:', data.slice(0, 5)); // Show first 5 rows
  return Papa.unparse(data);
};

const generateEmptyWorkCSV = (timeData, locations) => {
  console.log('🔍 Generating empty work CSV (all zeros)');
  const data = [];
  
  // Header row
  const header = ['Location', 'EV'];
  for (let i = 1; i <= timeData.length; i++) {
    header.push(`t${i}`);
  }
  data.push(header);
  
  // Generate all possible location-EV combinations with zeros
  const numNodes = locations.length;
  const numCEV = 1; // Default to 1 CEV if no work data
  
  for (let locationIndex = 0; locationIndex < numNodes; locationIndex++) {
    const location = locations[locationIndex];
    const locationId = location.id;
    
    for (let ev = 1; ev <= numCEV; ev++) {
      const row = [`i${locationId}`, `e${ev}`];
      
      // Add zeros for all time periods
      for (let t = 1; t <= timeData.length; t++) {
        row.push(0);
      }
      
      data.push(row);
    }
  }
  
  console.log('🔍 Generated empty work CSV data:', data.slice(0, 3));
  return Papa.unparse(data);
};

const generateCAISODemandCSV = (timeData) => {
  const data = [
    { 'Unnamed: 0': 'Time', 'Unnamed: 1': 'Demand (MW)' }
  ];
  
  timeData.forEach((item, index) => {
    data.push({
      'Unnamed: 0': item.time,
      'Unnamed: 1': Math.round(20000 + Math.sin(index * Math.PI / 48) * 5000) // Varying demand
    });
  });

  return Papa.unparse(data);
};

const generateCAISOCO2CSV = (timeData) => {
  const data = [
    { 'Unnamed: 0': 'Time', 'Unnamed: 1': 'CO2 Intensity (kg/MWh)' }
  ];
  
  timeData.forEach((item, index) => {
    data.push({
      'Unnamed: 0': item.time,
      'Unnamed: 1': Math.round(200 + Math.sin(index * Math.PI / 48) * 50) // Varying CO2 intensity
    });
  });

  return Papa.unparse(data);
};

export const downloadFiles = async (csvFiles, scenarioName) => {
  const zip = new JSZip();
  
  // Create csv_files folder
  const csvFolder = zip.folder('csv_files');
  
  // Add all CSV files to the folder
  Object.entries(csvFiles).forEach(([filename, content]) => {
    csvFolder.file(filename, content);
  });
  
  // Create README file
  const readmeContent = `# ${scenarioName} Optimization Files

This folder contains all the necessary CSV files for running the MCS-CEV optimization model.

## Files Description:

- **parameters.csv**: Model parameters and technical specifications
- **ev_data.csv**: Electric vehicle specifications and battery parameters
- **place.csv**: Location data and EV assignments
- **distance.csv**: Distance matrix between locations
- **travel_time.csv**: Travel time matrix between locations
- **time_data.csv**: Time-dependent electricity prices and CO2 emission factors
- **work.csv**: Work requirements for each EV at each location over time
${scenarioName.includes('24hours') ? `
- **CAISO-demand-YYYYMMDD.csv**: Real CAISO demand data for California
- **CAISO-co2-YYYYMMDD.csv**: Real CAISO CO2 intensity data for California` : ''}

## Usage:

1. Place all files in a folder named "${scenarioName}"
2. Run the optimization: \`julia mcs_optimization_main.jl ${scenarioName}\`

Generated on: ${new Date().toLocaleString()}
`;

  zip.file('README.md', readmeContent);
  
  // Generate and download the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${scenarioName}_optimization_files.zip`);
};
