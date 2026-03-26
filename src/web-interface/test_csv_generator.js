// Test script for CSV generator
import { generateCSVFiles } from './src/utils/csvGenerator.js';

// Test data that mimics what the interface would generate
const testFormData = {
  scenario: {
    numMCS: 1,
    numCEV: 2,
    numNodes: 3,
    is24Hours: true,
    scenarioName: '1MCS-2CEV-3nodes-24hours'
  },
  parameters: {
    eta_ch_dch: 0.95,
    MCS_max: 1000,
    MCS_min: 100,
    MCS_ini: 500,
    CH_MCS: 50,
    DCH_MCS: 50,
    C_MCS_plug: 50,
    num_plugs: 4,
    delta_T: 0.5
  },
  evData: [
    { id: 1, SOE_min: 20, SOE_max: 100, SOE_ini: 80, ch_rate: 50 },
    { id: 2, SOE_min: 20, SOE_max: 100, SOE_ini: 80, ch_rate: 50 }
  ],
  locations: [
    { name: 'Grid Node', type: 'grid', evAssignments: { 1: 0, 2: 0 } },
    { name: 'Construction Site 1', type: 'construction', evAssignments: { 1: 1, 2: 0 } },
    { name: 'Construction Site 2', type: 'construction', evAssignments: { 1: 0, 2: 1 } }
  ],
  timeData: Array.from({ length: 96 }, (_, i) => ({
    time: `t${i + 1}`,
    electricityPrice: 0.1 + Math.random() * 0.1,
    co2Intensity: 0.05 + Math.random() * 0.03
  })),
  workData: [
    {
      location: 2,
      ev: 1,
      workRequirements: Array.from({ length: 96 }, () => 2.5)
    },
    {
      location: 3,
      ev: 2,
      workRequirements: Array.from({ length: 96 }, () => 2.5)
    }
  ]
};

// Test the CSV generation
try {
  console.log('Testing CSV generation...');
  const csvFiles = generateCSVFiles(testFormData);
  
  console.log('Generated files:');
  Object.keys(csvFiles).forEach(filename => {
    console.log(`- ${filename}: ${csvFiles[filename].split('\n').length} lines`);
  });
  
  // Check specific files
  console.log('\nChecking place.csv:');
  const placeCSV = csvFiles['place.csv'];
  console.log(placeCSV);
  
  console.log('\nChecking work.csv (first few lines):');
  const workCSV = csvFiles['work.csv'];
  const workLines = workCSV.split('\n').slice(0, 5);
  console.log(workLines.join('\n'));
  
  console.log('\n✅ CSV generation test completed successfully!');
} catch (error) {
  console.error('❌ Error in CSV generation:', error);
}
