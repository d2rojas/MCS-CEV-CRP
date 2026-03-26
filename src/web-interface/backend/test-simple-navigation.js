#!/usr/bin/env node

/**
 * Simple Navigation Test
 * Tests navigation step by step
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3002';
const TEST_SESSION_ID = 'test-simple-nav-' + Date.now();

async function testSimpleNavigation() {
  console.log('🧪 Testing Simple Navigation');
  console.log('='.repeat(50));
  
  // Test 1: Basic scenario
  console.log('\n📝 Test 1: Basic scenario configuration');
  const response1 = await axios.post(`${BACKEND_URL}/api/chat`, {
    message: "I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation",
    sessionId: TEST_SESSION_ID
  });
  
  console.log('Response 1:');
  console.log('- navigateToStep:', response1.data.navigateToStep);
  console.log('- extractedParameters:', Object.keys(response1.data.extractedParameters || {}));
  console.log('- validationResult:', response1.data.validationResult?.is_valid);
  
  // Test 2: Model parameters
  console.log('\n📝 Test 2: Model parameters');
  const response2 = await axios.post(`${BACKEND_URL}/api/chat`, {
    message: "Set charging efficiency to 90% and MCS capacity to 800 kWh",
    sessionId: TEST_SESSION_ID
  });
  
  console.log('Response 2:');
  console.log('- navigateToStep:', response2.data.navigateToStep);
  console.log('- extractedParameters:', Object.keys(response2.data.extractedParameters || {}));
  console.log('- validationResult:', response2.data.validationResult?.is_valid);
  
  // Test 3: EV data
  console.log('\n📝 Test 3: EV data');
  const response3 = await axios.post(`${BACKEND_URL}/api/chat`, {
    message: "Configure 3 electric excavators with 150 kWh batteries and 50 kW charging rate",
    sessionId: TEST_SESSION_ID
  });
  
  console.log('Response 3:');
  console.log('- navigateToStep:', response3.data.navigateToStep);
  console.log('- extractedParameters:', Object.keys(response3.data.extractedParameters || {}));
  console.log('- validationResult:', response3.data.validationResult?.is_valid);
  
  console.log('\n📊 Summary:');
  console.log(`Step 1 → Step 2: ${response1.data.navigateToStep === 2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Step 2 → Step 3: ${response2.data.navigateToStep === 3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Step 3 → Step 4: ${response3.data.navigateToStep === 4 ? '✅ PASS' : '❌ FAIL'}`);
}

testSimpleNavigation()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });

