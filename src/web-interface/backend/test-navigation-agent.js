#!/usr/bin/env node

/**
 * Test Script for Navigation Agent
 * Tests automatic navigation between steps
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3002';
const TEST_SESSION_ID = 'test-navigation-' + Date.now();

// Test conversation flow
const testConversation = [
  {
    step: 1,
    message: "Necesito configurar un escenario con 2 MCS, 3 CEVs y 4 nodos para 24 horas de operación",
    expectedStep: 2,
    description: "Step 1: Scenario configuration"
  },
  {
    step: 2,
    message: "Configura la eficiencia de carga al 90% y capacidad MCS de 800 kWh",
    expectedStep: 3,
    description: "Step 2: Model parameters"
  },
  {
    step: 3,
    message: "Configura 3 excavadoras eléctricas con baterías de 150 kWh y tasa de carga de 50 kW",
    expectedStep: 4,
    description: "Step 3: EV data"
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

async function testNavigationAgent() {
  logSection('Testing Navigation Agent');
  
  const results = [];
  
  for (const conversation of testConversation) {
    log(`\n🔄 ${conversation.description}`, 'info');
    log(`📝 User: "${conversation.message}"`, 'info');
    
    const result = await sendMessage(conversation.message, TEST_SESSION_ID);
    
    if (result.success) {
      const data = result.data;
      
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
        expectedStep: conversation.expectedStep
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
    
    // Add delay between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

async function analyzeResults(results) {
  logSection('Navigation Agent Test Results');
  
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
  });
  
  // Analyze navigation pattern
  console.log('\n🧭 Navigation Pattern Analysis:');
  
  const navigationPattern = results.map(r => r.currentStep).join(' → ');
  log(`Navigation Flow: ${navigationPattern}`, 'info');
  
  const expectedPattern = results.map(r => r.expectedStep).join(' → ');
  log(`Expected Flow: ${expectedPattern}`, 'info');
  
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
    successfulAdvances: successfulAdvances.length
  };
}

// Main test execution
async function runNavigationAgentTest() {
  logSection('Starting Navigation Agent Test');
  
  // Test 1: Navigation Agent
  const navigationResults = await testNavigationAgent();
  
  // Test 2: Analyze Results
  const analysis = await analyzeResults(navigationResults);
  
  // Final Report
  logSection('Final Navigation Agent Test Report');
  
  if (analysis.successRate >= 80) {
    log('🎉 Navigation Agent is working excellently!', 'success');
  } else if (analysis.successRate >= 60) {
    log('⚠️ Navigation Agent is working but needs improvements.', 'warning');
  } else {
    log('❌ Navigation Agent has significant issues that need attention.', 'error');
  }
  
  log(`📈 Success Rate: ${analysis.successRate}%`, analysis.successRate >= 80 ? 'success' : 'info');
  log(`🔄 Successful Steps: ${analysis.successfulSteps}/${analysis.totalSteps}`, 'info');
  log(`🧭 Navigation Pattern: ${analysis.navigationPattern}`, 'info');
  
  return {
    analysis,
    navigationResults
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runNavigationAgentTest()
    .then(report => {
      console.log('\n' + '='.repeat(60));
      log('Navigation Agent test completed successfully!', 'success');
      console.log('='.repeat(60));
      process.exit(report.analysis.successRate >= 80 ? 0 : 1);
    })
    .catch(error => {
      log(`Navigation Agent test failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runNavigationAgentTest,
  testNavigationAgent,
  analyzeResults
};

