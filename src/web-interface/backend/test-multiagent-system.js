#!/usr/bin/env node

/**
 * Test Script for Multi-Agent System
 * Tests all agents and their interactions
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3002';
const TEST_SESSION_ID = 'test-multiagent-' + Date.now();

// Test scenarios
const testScenarios = [
  {
    name: "Basic Scenario Configuration",
    message: "I need to configure a scenario with 2 MCS, 3 CEVs, and 4 nodes for 24-hour operation",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 2
  },
  {
    name: "Parameter Configuration",
    message: "Set charging efficiency to 90% and MCS capacity to 800 kWh",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 3
  },
  {
    name: "EV Data Configuration",
    message: "Configure 3 electric excavators with 150 kWh batteries and 50 kW charging rate",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 4
  },
  {
    name: "Location Assignment",
    message: "Assign 2 EVs to construction site A and 1 EV to construction site B",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 5
  },
  {
    name: "Time Data Configuration",
    message: "Set electricity price to $0.12/kWh during day and $0.08/kWh at night",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 6
  },
  {
    name: "Distance Matrix",
    message: "Set all distances between locations to 2 km",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 7
  },
  {
    name: "Work Schedule",
    message: "Configure work hours from 8 AM to 5 PM with 3 kW power requirement",
    expectedAgents: ['understanding', 'validation', 'conversation'],
    expectedNavigation: 8
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

async function testAgentOrchestration(scenario) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/chat`, {
      message: scenario.message,
      sessionId: TEST_SESSION_ID
    });

    const result = response.data;
    
    // Check if all expected agents were involved
    const agentInvolvement = {
      understanding: !!result.extractedParameters,
      validation: !!result.validationResult,
      recommendation: !!result.recommendations,
      conversation: !!result.message
    };

    // Verify agent results
    const agentChecks = {
      understanding: result.extractedParameters && Object.keys(result.extractedParameters).length > 0,
      validation: result.validationResult && typeof result.validationResult.is_valid === 'boolean',
      conversation: result.message && result.message.length > 0
    };

    // Check navigation
    const navigationCheck = result.navigateToStep === scenario.expectedNavigation;

    // Check ReAct + CoT implementation
    const reactCotCheck = result.reactChain && result.orchestrationChain;

    return {
      success: true,
      agentInvolvement,
      agentChecks,
      navigationCheck,
      reactCotCheck,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testCompleteWorkflow() {
  logSection('Testing Complete Workflow');
  
  const workflowResults = [];
  
  for (const scenario of testScenarios) {
    log(`Testing: ${scenario.name}`, 'info');
    
    const result = await testAgentOrchestration(scenario);
    
    if (result.success) {
      // Check agent involvement
      const agentInvolvementPassed = scenario.expectedAgents.every(agent => 
        result.agentInvolvement[agent]
      );
      
      // Check agent functionality
      const agentChecksPassed = Object.values(result.agentChecks).every(check => check);
      
      // Check navigation
      const navigationPassed = result.navigationCheck;
      
      // Check ReAct + CoT
      const reactCotPassed = result.reactCotCheck;
      
      const overallPassed = agentInvolvementPassed && agentChecksPassed && navigationPassed && reactCotPassed;
      
      logTestResult(scenario.name, overallPassed);
      
      if (!overallPassed) {
        logTestResult('  Agent Involvement', agentInvolvementPassed, 
          `Expected: ${scenario.expectedAgents.join(', ')}, Got: ${Object.keys(result.agentInvolvement).filter(k => result.agentInvolvement[k]).join(', ')}`);
        logTestResult('  Agent Functionality', agentChecksPassed);
        logTestResult('  Navigation', navigationPassed, 
          `Expected: ${scenario.expectedNavigation}, Got: ${result.result.navigateToStep}`);
        logTestResult('  ReAct + CoT', reactCotPassed);
      }
      
      workflowResults.push({
        scenario: scenario.name,
        passed: overallPassed,
        details: {
          agentInvolvement: agentInvolvementPassed,
          agentChecks: agentChecksPassed,
          navigation: navigationPassed,
          reactCot: reactCotPassed
        }
      });
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } else {
      logTestResult(scenario.name, false, `Error: ${result.error}`);
      workflowResults.push({
        scenario: scenario.name,
        passed: false,
        error: result.error
      });
    }
  }
  
  return workflowResults;
}

async function testAgentSpecificFunctionality() {
  logSection('Testing Agent-Specific Functionality');
  
  const specificTests = [
    {
      name: "Understanding Agent - Parameter Extraction",
      message: "I need 3 electric excavators at 2 construction sites with 1 MCS",
      test: (result) => {
        const params = result.extractedParameters;
        return params && 
               params.scenario && 
               params.scenario.numCEV === 3 && 
               params.scenario.numNodes === 3 && 
               params.scenario.numMCS === 1;
      }
    },
    {
      name: "Validation Agent - Range Validation",
      message: "Set MCS capacity to 50 kWh and charging efficiency to 150%",
      test: (result) => {
        const validation = result.validationResult;
        return validation && 
               validation.range_validation && 
               validation.range_validation.issues && 
               validation.range_validation.issues.length > 0;
      }
    },
    {
      name: "Recommendation Agent - Parameter Suggestions",
      message: "What's the optimal MCS capacity for 5 electric excavators?",
      test: (result) => {
        return result.recommendations && 
               result.recommendations.length > 0 &&
               result.recommendations.some(rec => rec.type === 'parameter' && rec.parameter === 'MCS_max');
      }
    },
    {
      name: "Conversation Manager - Natural Response",
      message: "Hello, I need help configuring my optimization scenario",
      test: (result) => {
        return result.message && 
               result.message.length > 50 && 
               result.message.includes('help') || result.message.includes('configure');
      }
    }
  ];
  
  const specificResults = [];
  
  for (const test of specificTests) {
    log(`Testing: ${test.name}`, 'info');
    
    const result = await testAgentOrchestration({
      message: test.message,
      expectedAgents: ['understanding', 'validation', 'conversation'],
      expectedNavigation: 1
    });
    
    if (result.success) {
      const passed = test.test(result.result);
      logTestResult(test.name, passed);
      specificResults.push({
        test: test.name,
        passed
      });
    } else {
      logTestResult(test.name, false, `Error: ${result.error}`);
      specificResults.push({
        test: test.name,
        passed: false,
        error: result.error
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return specificResults;
}

async function testPerformance() {
  logSection('Testing Performance');
  
  const performanceTests = [];
  
  // Test response time
  const startTime = Date.now();
  const result = await testAgentOrchestration(testScenarios[0]);
  const responseTime = Date.now() - startTime;
  
  const responseTimePassed = responseTime < 10000; // Less than 10 seconds
  logTestResult('Response Time', responseTimePassed, `${responseTime}ms`);
  performanceTests.push({
    test: 'Response Time',
    passed: responseTimePassed,
    value: responseTime
  });
  
  // Test token usage (if available)
  if (result.success && result.result.workflowState) {
    const tokenUsage = result.result.workflowState.tokenUsage || 'N/A';
    logTestResult('Token Usage', true, `${tokenUsage} tokens`);
    performanceTests.push({
      test: 'Token Usage',
      passed: true,
      value: tokenUsage
    });
  }
  
  return performanceTests;
}

async function generateTestReport(workflowResults, specificResults, performanceResults) {
  logSection('Test Report Summary');
  
  const totalTests = workflowResults.length + specificResults.length + performanceResults.length;
  const passedTests = workflowResults.filter(r => r.passed).length + 
                     specificResults.filter(r => r.passed).length + 
                     performanceResults.filter(r => r.passed).length;
  
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  log(`Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`, 
      successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error');
  
  console.log('\n📊 Detailed Results:');
  
  console.log('\n🔄 Workflow Tests:');
  workflowResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.scenario}`);
  });
  
  console.log('\n🧠 Agent-Specific Tests:');
  specificResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.test}`);
  });
  
  console.log('\n⚡ Performance Tests:');
  performanceResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.test}: ${result.value}`);
  });
  
  return {
    totalTests,
    passedTests,
    successRate: parseFloat(successRate),
    workflowResults,
    specificResults,
    performanceResults
  };
}

// Main test execution
async function runAllTests() {
  logSection('Starting Multi-Agent System Tests');
  
  // Test 1: Backend Health
  log('Testing Backend Health...', 'info');
  const healthCheck = await testBackendHealth();
  logTestResult('Backend Health', healthCheck);
  
  if (!healthCheck) {
    log('❌ Backend is not responding. Please ensure the server is running on port 3002.', 'error');
    process.exit(1);
  }
  
  // Test 2: Complete Workflow
  const workflowResults = await testCompleteWorkflow();
  
  // Test 3: Agent-Specific Functionality
  const specificResults = await testAgentSpecificFunctionality();
  
  // Test 4: Performance
  const performanceResults = await testPerformance();
  
  // Generate Report
  const report = await generateTestReport(workflowResults, specificResults, performanceResults);
  
  // Final Status
  logSection('Test Execution Complete');
  
  if (report.successRate >= 80) {
    log('🎉 Multi-Agent System is working excellently!', 'success');
  } else if (report.successRate >= 60) {
    log('⚠️  Multi-Agent System is working but needs improvements.', 'warning');
  } else {
    log('❌ Multi-Agent System has significant issues that need to be addressed.', 'error');
  }
  
  log(`📈 Success Rate: ${report.successRate}%`, report.successRate >= 80 ? 'success' : 'info');
  log(`🔄 Workflow Tests: ${workflowResults.filter(r => r.passed).length}/${workflowResults.length}`, 'info');
  log(`🧠 Agent Tests: ${specificResults.filter(r => r.passed).length}/${specificResults.length}`, 'info');
  log(`⚡ Performance Tests: ${performanceResults.filter(r => r.passed).length}/${performanceResults.length}`, 'info');
  
  return report;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(report => {
      console.log('\n' + '='.repeat(60));
      log('Test execution completed successfully!', 'success');
      console.log('='.repeat(60));
      process.exit(report.successRate >= 80 ? 0 : 1);
    })
    .catch(error => {
      log(`Test execution failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testAgentOrchestration,
  testBackendHealth
};

