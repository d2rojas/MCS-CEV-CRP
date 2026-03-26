#!/usr/bin/env node

/**
 * Test Script for Real User Flow Simulation
 * Simulates actual user interaction with state maintenance
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3002';
const TEST_SESSION_ID = 'test-real-user-' + Date.now();

// Simulated user conversation flow
const userConversation = [
  {
    step: 1,
    message: "I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation",
    expectedStep: 2,
    description: "Step 1: Basic scenario configuration"
  },
  {
    step: 2,
    message: "Set charging efficiency to 90% and MCS capacity to 800 kWh",
    expectedStep: 3,
    description: "Step 2: Model parameters"
  },
  {
    step: 3,
    message: "Configure 3 electric excavators with 150 kWh batteries and 50 kW charging rate",
    expectedStep: 4,
    description: "Step 3: EV data configuration"
  },
  {
    step: 4,
    message: "Assign 2 EVs to construction site A and 1 EV to construction site B",
    expectedStep: 5,
    description: "Step 4: Location assignment"
  },
  {
    step: 5,
    message: "Set electricity price to $0.12/kWh during day and $0.08/kWh at night",
    expectedStep: 6,
    description: "Step 5: Time data configuration"
  },
  {
    step: 6,
    message: "Set all distances between locations to 2 km",
    expectedStep: 7,
    description: "Step 6: Distance matrix"
  },
  {
    step: 7,
    message: "Configure work hours from 8 AM to 5 PM with 3 kW power requirement",
    expectedStep: 8,
    description: "Step 7: Work schedule"
  },
  {
    step: 8,
    message: "Generate the optimization files",
    expectedStep: 8,
    description: "Step 8: File generation"
  }
];

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`🧪 ${title}`, 'info');
  console.log('='.repeat(60));
}

function logTestResult(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'success' : 'error';
  log(`${status} - ${testName}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test functions
async function testBackendHealth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`);
    return response.status === 200 && response.data.status === 'OK';
  } catch (error) {
    return false;
  }
}

async function sendMessage(message, sessionId) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/chat`, {
      message: message,
      sessionId: sessionId
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function simulateUserFlow() {
  logSection('Simulating Real User Flow');
  
  const results = [];
  let currentFormData = {};
  
  for (const conversation of userConversation) {
    log(`\n🔄 ${conversation.description}`, 'info');
    log(`📝 User: "${conversation.message}"`, 'info');
    
    const result = await sendMessage(conversation.message, TEST_SESSION_ID);
    
    if (result.success) {
      const data = result.data;
      
      // Extract form updates and merge with current form data
      if (data.formUpdates) {
        currentFormData = { ...currentFormData, ...data.formUpdates };
        log(`📋 Form updated with: ${Object.keys(data.formUpdates).join(', ')}`, 'info');
      }
      
      // Check navigation
      const navigationPassed = data.navigateToStep === conversation.expectedStep;
      logTestResult(`Navigation to Step ${conversation.expectedStep}`, navigationPassed, 
        `Expected: ${conversation.expectedStep}, Got: ${data.navigateToStep}`);
      
      // Check agent involvement
      const agentInvolvement = {
        understanding: !!data.extractedParameters,
        validation: !!data.validationResult,
        recommendation: !!data.recommendations,
        conversation: !!data.message
      };
      
      log(`🧠 Agents involved: ${Object.keys(agentInvolvement).filter(k => agentInvolvement[k]).join(', ')}`, 'info');
      
      // Check ReAct + CoT
      const reactCotPassed = data.reactChain && data.orchestrationChain;
      logTestResult('ReAct + CoT Implementation', reactCotPassed);
      
      // Display AI response (truncated)
      const responsePreview = data.message.length > 100 ? 
        data.message.substring(0, 100) + '...' : data.message;
      log(`🤖 AI: "${responsePreview}"`, 'info');
      
      results.push({
        step: conversation.step,
        description: conversation.description,
        navigationPassed,
        agentInvolvement,
        reactCotPassed,
        currentStep: data.navigateToStep,
        expectedStep: conversation.expectedStep,
        formDataKeys: Object.keys(currentFormData)
      });
      
    } else {
      logTestResult(conversation.description, false, `Error: ${result.error}`);
      results.push({
        step: conversation.step,
        description: conversation.description,
        navigationPassed: false,
        error: result.error
      });
    }
    
    // Add delay between messages to simulate real user interaction
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

async function analyzeResults(results) {
  logSection('Flow Analysis Results');
  
  const totalSteps = results.length;
  const successfulSteps = results.filter(r => r.navigationPassed).length;
  const successRate = (successfulSteps / totalSteps * 100).toFixed(1);
  
  log(`Overall Success Rate: ${successRate}% (${successfulSteps}/${totalSteps})`, 
      successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error');
  
  console.log('\n📊 Step-by-Step Results:');
  
  results.forEach(result => {
    const status = result.navigationPassed ? '✅' : '❌';
    const stepInfo = result.error ? 
      `  ${status} Step ${result.step}: ${result.description} - ERROR: ${result.error}` :
      `  ${status} Step ${result.step}: ${result.description} (${result.currentStep} → ${result.expectedStep})`;
    
    console.log(stepInfo);
    
    if (result.agentInvolvement) {
      const agents = Object.keys(result.agentInvolvement).filter(k => result.agentInvolvement[k]);
      console.log(`     🧠 Agents: ${agents.join(', ')}`);
    }
    
    if (result.formDataKeys && result.formDataKeys.length > 0) {
      console.log(`     📋 Form Data: ${result.formDataKeys.join(', ')}`);
    }
  });
  
  // Analyze navigation patterns
  console.log('\n🧭 Navigation Pattern Analysis:');
  
  const navigationPattern = results.map(r => r.currentStep).join(' → ');
  log(`Navigation Flow: ${navigationPattern}`, 'info');
  
  const expectedPattern = results.map(r => r.expectedStep).join(' → ');
  log(`Expected Flow: ${expectedPattern}`, 'info');
  
  // Check for stuck steps
  const stuckSteps = results.filter(r => r.currentStep === r.step && r.currentStep !== r.expectedStep);
  if (stuckSteps.length > 0) {
    log(`⚠️ Steps that got stuck: ${stuckSteps.map(s => s.step).join(', ')}`, 'warning');
  }
  
  // Check for successful advances
  const successfulAdvances = results.filter(r => r.navigationPassed);
  if (successfulAdvances.length > 0) {
    log(`✅ Successful advances: ${successfulAdvances.map(s => s.step).join(', ')}`, 'success');
  }
  
  return {
    totalSteps,
    successfulSteps,
    successRate: parseFloat(successRate),
    navigationPattern,
    expectedPattern,
    stuckSteps: stuckSteps.length,
    successfulAdvances: successfulAdvances.length
  };
}

async function testAgentPerformance() {
  logSection('Agent Performance Analysis');
  
  const performanceTests = [];
  
  // Test 1: Response time for complex message
  const startTime = Date.now();
  const result = await sendMessage("I need to configure a complex scenario with 5 MCS, 10 CEVs, and 8 nodes for 24-hour operation with specific charging requirements", TEST_SESSION_ID);
  const responseTime = Date.now() - startTime;
  
  const responseTimePassed = responseTime < 15000; // Less than 15 seconds for complex request
  logTestResult('Complex Request Response Time', responseTimePassed, `${responseTime}ms`);
  performanceTests.push({
    test: 'Complex Request Response Time',
    passed: responseTimePassed,
    value: responseTime
  });
  
  // Test 2: Agent coordination
  if (result.success) {
    const data = result.data;
    const agentCoordination = data.reactChain && data.orchestrationChain && 
                             data.extractedParameters && data.validationResult && data.message;
    
    logTestResult('Agent Coordination', agentCoordination, 
      `Understanding: ${!!data.extractedParameters}, Validation: ${!!data.validationResult}, Conversation: ${!!data.message}`);
    performanceTests.push({
      test: 'Agent Coordination',
      passed: agentCoordination,
      value: 'All agents coordinated'
    });
  }
  
  return performanceTests;
}

// Main test execution
async function runRealUserFlowTest() {
  logSection('Starting Real User Flow Simulation');
  
  // Test 1: Backend Health
  log('Testing Backend Health...', 'info');
  const healthCheck = await testBackendHealth();
  logTestResult('Backend Health', healthCheck);
  
  if (!healthCheck) {
    log('❌ Backend is not responding. Please ensure the server is running on port 3002.', 'error');
    process.exit(1);
  }
  
  // Test 2: Simulate Real User Flow
  const flowResults = await simulateUserFlow();
  
  // Test 3: Analyze Results
  const analysis = await analyzeResults(flowResults);
  
  // Test 4: Performance Analysis
  const performanceResults = await testAgentPerformance();
  
  // Final Report
  logSection('Final Test Report');
  
  if (analysis.successRate >= 80) {
    log('🎉 Real user flow simulation shows excellent system performance!', 'success');
  } else if (analysis.successRate >= 60) {
    log('⚠️ Real user flow simulation shows good performance with room for improvement.', 'warning');
  } else {
    log('❌ Real user flow simulation reveals significant issues that need attention.', 'error');
  }
  
  log(`📈 Overall Success Rate: ${analysis.successRate}%`, analysis.successRate >= 80 ? 'success' : 'info');
  log(`🔄 Successful Steps: ${analysis.successfulSteps}/${analysis.totalSteps}`, 'info');
  log(`🧭 Navigation Pattern: ${analysis.navigationPattern}`, 'info');
  log(`⚠️ Stuck Steps: ${analysis.stuckSteps}`, analysis.stuckSteps > 0 ? 'warning' : 'info');
  
  console.log('\n📊 Performance Summary:');
  performanceResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.test}: ${result.value}`);
  });
  
  return {
    analysis,
    performanceResults,
    flowResults
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRealUserFlowTest()
    .then(report => {
      console.log('\n' + '='.repeat(60));
      log('Real user flow simulation completed successfully!', 'success');
      console.log('='.repeat(60));
      process.exit(report.analysis.successRate >= 80 ? 0 : 1);
    })
    .catch(error => {
      log(`Real user flow simulation failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runRealUserFlowTest,
  simulateUserFlow,
  analyzeResults
};

