import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, ProgressBar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ScenarioConfig from './components/ScenarioConfig';
import ParametersForm from './components/ParametersForm';
import EVDataForm from './components/EVDataForm';
import LocationDataForm from './components/LocationDataForm';
import TimeDataForm from './components/TimeDataForm';
import MatrixDataForm from './components/MatrixDataForm';
import CEVWorkScheduler from './components/CEVWorkScheduler';
import SummaryStep from './components/SummaryStep';
import GeneratedFilesStep from './components/GeneratedFilesStep';
import OptimizationRunner from './components/OptimizationRunner';
import OptimizationProgress from './components/OptimizationProgress';
import ResultsViewer from './components/ResultsViewer';
import ChatPanel from './components/ChatPanel';
import { generateCSVFiles, downloadFiles } from './utils/csvGenerator';
import { validateAllData } from './utils/validators';
import getBackendUrl from './utils/api';

function App() {
  const [currentStep, setCurrentStep] = useState(0); // Start at 0 for welcome screen
  const [currentSection, setCurrentSection] = useState('wizard'); // 'wizard', 'optimization', or 'results'
  const [formData, setFormData] = useState({
    scenario: {
      numMCS: 1,
      numCEV: 1,
      numNodes: 2,
      is24Hours: false,
      scenarioName: ''
    },
    parameters: {
      eta_ch_dch: 0.95,
      MCS_max: 1000.0,
      MCS_min: 100.0,
      MCS_ini: 500.0,
      CH_MCS: 50.0,
      DCH_MCS: 50.0,
      DCH_MCS_plug: 50.0,
      C_MCS_plug: 4,
      k_trv: 1.0,
      delta_T: 0.5,
      rho_miss: 0.6,
      lambda_demand: 0.0,
      carbon_price_per_ton: 50.0
    },
    evData: [],
    locations: [],
    distanceMatrix: [],
    travelTimeMatrix: [],
    timeData: [],
    workData: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState({});
  const [latestJobId, setLatestJobId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [agentActions, setAgentActions] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(true);


  // Helper function to scroll to top of main content
  const scrollToTop = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };



  // Function to select save location
  const selectSaveLocation = () => {
    return new Promise((resolve) => {
      // For now, we'll use a simple prompt since directory selection is limited in web browsers
      const userPath = prompt('Enter the folder path where you want to save the files (or press Cancel to use Downloads):', '~/Downloads/');
      if (userPath && userPath.trim()) {
        resolve(userPath.trim());
      } else {
        resolve('~/Downloads/');
      }
    });
  };



  const updateFormData = (section, data) => {
    console.log(`🔍 DEBUG: Updating form data for section '${section}':`, data);
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  // Chat message handler
  const toggleChat = () => {
    setIsChatVisible(!isChatVisible);
  };

  // Reset chat and form data
  const handleChatReset = () => {
    // Ask for confirmation before resetting
    if (!window.confirm('¿Estás seguro de que quieres reiniciar la conversación? Esto borrará todo el progreso y volverás al paso 1.')) {
      return;
    }
    // Reset chat messages
    setChatMessages([]);
    
    // Reset agent actions
    setAgentActions([]);
    
    // Reset form data to initial state
    setFormData({
      scenario: {
        numMCS: 1,
        numCEV: 1,
        numNodes: 2,
        is24Hours: false,
        scenarioName: ''
      },
      parameters: {
        eta_ch_dch: 0.95,
        MCS_max: 1000.0,
        MCS_min: 100.0,
        MCS_ini: 500.0,
        CH_MCS: 50.0,
        DCH_MCS: 50.0,
        DCH_MCS_plug: 50.0,
        C_MCS_plug: 4,
        k_trv: 1.0,
        delta_T: 0.5,
        rho_miss: 0.6,
        lambda_demand: 0.0,
        carbon_price_per_ton: 50.0
      },
      evData: [],
      locations: [],
      distanceMatrix: [],
      travelTimeMatrix: [],
      timeData: [],
      workData: []
    });

    // Reset to first step
    setCurrentStep(1);
    
    // Reset current section
    setCurrentSection('wizard');
    
    // Clear any messages
    setMessage({ type: '', text: '' });
    
    // Scroll to top
    scrollToTop();
    
    // Show success message
    setMessage({ 
      type: 'success', 
      text: '✅ Conversación reiniciada exitosamente. Puedes comenzar un nuevo escenario desde el paso 1.' 
    });
    
    console.log('🔄 Chat and form data reset successfully');
  };

  const handleChatMessage = async (message) => {
    // Add user message to chat
    setChatMessages(prev => [...prev, { 
      type: 'user', 
      content: message,
      timestamp: new Date()
    }]);
    
    // Show typing indicator
    setIsAgentTyping(true);
    
    try {
      // Call the backend chat API
      const response = await fetch(`${getBackendUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: 'default-session', // We'll implement proper session management later
          context: {
            formData,
            currentStep,
            currentSection
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const agentResponse = {
          type: 'agent',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions || []
        };
        
        setChatMessages(prev => [...prev, agentResponse]);
        setAgentActions(data.actions || []);
        
        // Handle form updates if provided
        if (data.formUpdates) {
          data.formUpdates.forEach(update => {
            updateFormData(update.section, update.data);
          });
        }
        
        // Handle navigation if provided
        if (data.navigateToStep !== null && data.navigateToStep !== undefined) {
          setCurrentStep(data.navigateToStep);
        }
        
      } else {
        throw new Error(data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatMessages(prev => [...prev, { 
        type: 'error', 
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsAgentTyping(false);
    }
  };

  // Check if all EVs are assigned to construction sites
  const checkEVAssignments = () => {
    if (formData.locations.length === 0) return true; // Allow if no locations yet
    
    const unassignedEVs = [];
    for (let ev = 1; ev <= formData.scenario.numCEV; ev++) {
      const isAssigned = formData.locations.some(location => 
        location.evAssignments && location.evAssignments[ev] === 1
      );
      if (!isAssigned) {
        unassignedEVs.push(ev);
      }
    }
    return unassignedEVs.length === 0;
  };

  // Get list of unassigned EVs for better messaging
  const getUnassignedEVsList = () => {
    if (formData.locations.length === 0) return [];
    
    const unassignedEVs = [];
    for (let ev = 1; ev <= formData.scenario.numCEV; ev++) {
      const isAssigned = formData.locations.some(location => 
        location.evAssignments && location.evAssignments[ev] === 1
      );
      if (!isAssigned) {
        unassignedEVs.push(ev);
      }
    }
    return unassignedEVs;
  };

  const nextStep = async () => {
    // Check EV assignments before allowing to proceed from Location Data (step 4)
    if (currentStep === 4 && !checkEVAssignments()) {
      const unassignedEVs = getUnassignedEVsList();
      const evList = unassignedEVs.map(ev => `EV${ev}`).join(', ');
      setMessage({
        type: 'info',
        text: `🚗📍 Almost there! Please assign these vehicles to construction sites: ${evList}. Each CEV needs a work location to continue with the optimization setup!`
      });
      return;
    }

    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
      setMessage({ type: '', text: '' }); // Clear any previous messages
      scrollToTop();
    } else if (currentStep === 8) {
      // Step 8 to 9: Generate CSV files automatically
      await generateFilesAndProceed();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setMessage({ type: '', text: '' }); // Clear any previous messages
      scrollToTop();
    }
  };

  const generateFilesAndProceed = async () => {
    setIsGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate all data before generating files
      const validationErrors = validateAllData(formData);
      
      if (validationErrors.length > 0) {
        setMessage({
          type: 'danger',
          text: `Validation errors found:\n${validationErrors.join('\n')}`
        });
        return;
      }

      setMessage({
        type: 'info',
        text: '📁 Generating CSV files...'
      });

      console.log('🔍 DEBUG: About to generate CSV files with form data:', {
        workDataLength: formData.workData.length,
        workData: formData.workData,
        timeDataLength: formData.timeData.length,
        locationsLength: formData.locations.length
      });
      
      // Additional detailed logging for workData
      if (formData.workData && formData.workData.length > 0) {
        console.log('🔍 DEBUG: workData details:', JSON.stringify(formData.workData, null, 2));
        formData.workData.forEach((work, index) => {
          console.log(`🔍 DEBUG: workData[${index}]:`, {
            location: work.location,
            ev: work.ev,
            workRequirementsLength: work.workRequirements?.length,
            firstFewRequirements: work.workRequirements?.slice(0, 3)
          });
        });
      } else {
        console.log('⚠️ WARNING: workData is empty or undefined!');
      }
      
      const csvFiles = generateCSVFiles(formData);
      
      // Create ZIP structure like downloadFiles does
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Create csv_files folder
      const csvFolder = zip.folder('csv_files');
      
      // Add all CSV files to the folder
      Object.entries(csvFiles).forEach(([filename, content]) => {
        csvFolder.file(filename, content);
      });
      
      // Create README file
      const readmeContent = `# ${formData.scenario.scenarioName} Optimization Files

This folder contains all the necessary CSV files for running the MCS-CEV optimization model.

## Files Description:

- **parameters.csv**: Model parameters and technical specifications
- **ev_data.csv**: Electric vehicle specifications and battery parameters
- **place.csv**: Location data and EV assignments
- **distance.csv**: Distance matrix between locations
- **travel_time.csv**: Travel time matrix between locations
- **time_data.csv**: Time periods with electricity prices and CO2 factors
- **work.csv**: Work schedules and power requirements for each location-EV combination

Generated on: ${new Date().toLocaleString()}
Scenario: ${formData.scenario.scenarioName}
MCS: ${formData.scenario.numMCS}
CEVs: ${formData.scenario.numCEV}
Nodes: ${formData.scenario.numNodes}
`;
      
      csvFolder.file('README.md', readmeContent);
      
      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Store the ZIP blob for optimization
      setGeneratedFiles({ zipBlob: zipBlob, csvFiles: csvFiles });
      
      setMessage({
        type: 'success',
        text: `Files generated successfully! Proceeding to optimization step.`
      });

      // Move to next step
      setCurrentStep(9);
      scrollToTop();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error generating files: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGeneratedFiles = async () => {
    try {
      await downloadFiles(generatedFiles.csvFiles || generatedFiles, formData.scenario.scenarioName);
      setMessage({
        type: 'success',
        text: `Files downloaded successfully!`
      });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error downloading files: ${error.message}`
      });
    }
  };

  const startOptimization = () => {
    console.log('🚀 Starting optimization from GeneratedFilesStep');
    setCurrentStep(10); // Move to OptimizationProgress step
    scrollToTop();
  };

  const generateFiles = async () => {
    setIsGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate all data before generating files
      const validationErrors = validateAllData(formData);
      
      if (validationErrors.length > 0) {
        setMessage({
          type: 'danger',
          text: `Validation errors found:\n${validationErrors.join('\n')}`
        });
        return;
      }

      // Ask user to select save location
      setMessage({
        type: 'info',
        text: '📁 Please select where you want to save the optimization files...'
      });

      const selectedPath = await selectSaveLocation();
      const savePath = selectedPath || '~/Downloads/';

      console.log('🔍 DEBUG: About to generate CSV files with form data:', {
        workDataLength: formData.workData.length,
        workData: formData.workData,
        timeDataLength: formData.timeData.length,
        locationsLength: formData.locations.length
      });
      
      const csvFiles = generateCSVFiles(formData);
      await downloadFiles(csvFiles, formData.scenario.scenarioName, savePath);
      
      setMessage({
        type: 'success',
        text: `Files generated successfully! A ZIP file with all necessary CSV files for scenario "${formData.scenario.scenarioName}" has been downloaded.`
      });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error generating files: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="mb-5">
              <h2 className="display-4 mb-4">🚗⚡ Welcome to MCS-CEV Optimization</h2>
              <p className="lead text-muted mb-4">
                Optimize your mobile charging station operations for construction electric vehicles
              </p>
              <div className="mt-3">
                <span className="badge bg-primary text-white me-2">UCSD Research Project</span>
                <span className="badge bg-warning text-dark me-2">Construction EV Optimization</span>
                <span className="badge bg-info text-white">Mobile Charging Solutions</span>
              </div>
            </div>
            
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="card shadow-sm mb-4 welcome-card">
                  <div className="card-body p-4">
                    <h4 className="card-title mb-3">What is this tool?</h4>
                    <p className="card-text text-muted">
                      This interface helps you configure and generate input files for optimizing mobile charging stations (MCS) 
                      that support construction electric vehicles (CEV). The optimization model determines the best charging 
                      schedules, routes, and energy management strategies to minimize costs while ensuring all work requirements are met.
                    </p>
                  </div>
                </div>

                <div className="card shadow-sm mb-4 welcome-card">
                  <div className="card-body p-4">
                    <h4 className="card-title mb-3">How does it work?</h4>
                    <p className="card-text text-muted">
                      Follow the 8-step process to configure your scenario: define the number of MCS and CEVs, set technical parameters, 
                      configure locations and assignments, specify time-dependent electricity prices, and define work requirements. 
                      The interface will generate all necessary CSV files for the Julia optimization model. Then use the "Run Optimization" 
                      section to execute your optimization and get results in real-time.
                    </p>
                  </div>
                </div>

                <div className="card shadow-sm mb-4 welcome-card">
                  <div className="card-body p-4">
                    <h4 className="card-title mb-3">What will you get?</h4>
                    <p className="card-text text-muted">
                      A complete dataset with optimized charging schedules, energy costs, carbon emissions, and operational strategies 
                      for your mobile charging station fleet. The results help you understand the most cost-effective way to deploy 
                      and operate MCS to support your construction electric vehicles.
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="card bg-gradient-primary text-white shadow-sm welcome-card">
                      <div className="card-body p-3">
                        <h6 className="card-title">Key Benefits</h6>
                        <ul className="list-unstyled small mb-0">
                          <li>✅ Cost optimization with variable electricity prices</li>
                          <li>✅ Carbon emission reduction strategies</li>
                          <li>✅ Work completion guarantee</li>
                          <li>✅ Energy balance management</li>
                          <li>✅ Real-world CAISO data integration</li>
                          <li>✅ Comprehensive operational insights</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-gradient-gold text-dark shadow-sm welcome-card">
                      <div className="card-body p-3">
                        <h6 className="card-title">Process Overview</h6>
                        <ul className="list-unstyled small mb-0">
                          <li>📋 1. Configure scenario parameters</li>
                          <li>⚙️ 2. Set technical specifications</li>
                          <li>🚗 3. Define electric vehicles</li>
                          <li>📍 4. Configure locations</li>
                          <li>⏰ 5. Set time-dependent data</li>
                          <li>🛣️ 6. Define distances & travel times</li>
                          <li>🔧 7. Specify work requirements</li>
                          <li>📊 8. Generate optimization files</li>
                          <li>🚀 9. Run optimization & get results</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => {
                  setCurrentStep(1);
                  scrollToTop();
                }}
                className="px-5 py-3"
              >
                🚀 Start Optimization Process
              </Button>
            </div>
          </div>
        );
      case 1:
        return (
          <ScenarioConfig
            data={formData.scenario}
            onUpdate={(data) => updateFormData('scenario', data)}
          />
        );
      case 2:
        return (
          <ParametersForm
            data={formData.parameters}
            onUpdate={(data) => updateFormData('parameters', data)}
          />
        );
      case 3:
        return (
          <EVDataForm
            data={formData.evData}
            numCEV={formData.scenario.numCEV}
            onUpdate={(data) => updateFormData('evData', data)}
          />
        );
      case 4:
        return (
          <LocationDataForm
            data={formData.locations}
            numNodes={formData.scenario.numNodes}
            numCEV={formData.scenario.numCEV}
            onUpdate={(data) => updateFormData('locations', data)}
          />
        );
      case 5:
        return (
          <TimeDataForm
            data={formData.timeData}
            is24Hours={formData.scenario.is24Hours}
            onUpdate={(data) => updateFormData('timeData', data)}
          />
        );
      case 6:
        return (
          <CEVWorkScheduler
            data={formData.workData}
            numCEV={formData.scenario.numCEV}
            timeData={formData.timeData}
            locationData={formData.locations}
            onUpdate={(data) => updateFormData('workData', data)}
          />
        );
      case 7:
        return (
          <MatrixDataForm
            distanceMatrix={formData.distanceMatrix}
            travelTimeMatrix={formData.travelTimeMatrix}
            numNodes={formData.scenario.numNodes}
            onUpdate={(distanceData, travelTimeData) => {
              updateFormData('distanceMatrix', distanceData);
              updateFormData('travelTimeMatrix', travelTimeData);
            }}
          />
        );
      case 8:
        return (
          <SummaryStep
            formData={formData}
          />
        );
      case 9:
        return (
          <GeneratedFilesStep
            formData={formData}
            generatedFiles={generatedFiles}
            onDownloadFiles={downloadGeneratedFiles}
            isOptimizing={false}
            onStartOptimization={startOptimization}
          />
        );
      case 10:
        return (
          <OptimizationProgress 
            generatedFiles={generatedFiles}
            onOptimizationSuccess={(jobId) => {
              console.log('🎉 Optimization success callback triggered for job:', jobId);
              setLatestJobId(jobId);
              // Don't move to next step automatically - let user click the button
            }}
            onNext={() => {
              console.log('🚀 Moving to step 11 (Results)');
              setCurrentStep(11);
              scrollToTop();
            }}
          />
        );
      case 11:
        return (
          <ResultsViewer latestJobId={latestJobId} isAutoFlow={true} />
        );
      case 12:
        return (
          <ResultsViewer latestJobId={null} isAutoFlow={false} />
        );
      default:
        return null;
    }
  };

  const steps = [
    'Welcome',
    'Scenario Configuration',
    'Model Parameters',
    'Electric Vehicle Data',
    'Location Data',
    'Time Data',
    'CEV Work Scheduling',
    'Distance & Travel Time',
    'Summary & Generate',
    'Generated Files & Optimization',
    'Running Optimization',
    'View Results',
    'Manual Results Upload'
  ];

  const configStepCount = 8; // Steps 1-8 are configuration steps

  return (
    <div className="app-layout">
      {/* Sidebar Menu */}
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <img 
              src="/logo.png" 
              alt="UCSD Logo" 
              className="sidebar-logo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="fallback-sidebar-logo" style={{display: 'none'}}>🏫</div>
            <h5 className="sidebar-title">MCS-CEV Optimization</h5>
            <p className="sidebar-subtitle">Advanced Framework for Mobile Charging Station Operations</p>
          </div>
          
          <nav className="sidebar-nav">
            <div 
              className={`nav-item ${currentStep === 0 ? 'active' : ''}`}
              onClick={() => {
                setCurrentStep(0);
                setCurrentSection('wizard');
                scrollToTop();
              }}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Home</span>
            </div>
            
            <div className="nav-section">
              <h6 className="nav-section-title">Main Sections</h6>
              
              <div 
                className={`nav-item ${currentSection === 'wizard' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection('wizard');
                  setCurrentStep(1);
                  scrollToTop();
                }}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Configuration Wizard</span>
              </div>
              
              <div 
                className={`nav-item ${currentSection === 'optimization' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection('optimization');
                  setCurrentStep(9);
                  scrollToTop();
                }}
              >
                <span className="nav-icon">🚀</span>
                <span className="nav-text">Run Optimization</span>
              </div>
              
              <div 
                className={`nav-item ${currentSection === 'results' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection('results');
                  setCurrentStep(12);
                  scrollToTop();
                }}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">View Results</span>
              </div>
              
              <div 
                className={`nav-item ${isChatVisible ? 'active' : ''}`}
                onClick={toggleChat}
              >
                <span className="nav-icon">🤖</span>
                <span className="nav-text">AI Assistant</span>
                <span className="nav-toggle">
                  {isChatVisible ? '−' : '+'}
                </span>
              </div>
            </div>
            
            {currentSection === 'wizard' && currentStep > 0 && (
              <div className="nav-section">
                <h6 className="nav-section-title">Configuration Steps</h6>
                {steps.slice(1, configStepCount + 1).map((step, index) => (
                  <div 
                    key={index}
                    className={`nav-item ${currentStep === index + 1 ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentStep(index + 1);
                      scrollToTop();
                    }}
                  >
                    <div className="nav-item-left">
                      <span className="nav-icon">
                        {currentStep === index + 1 ? '▶' : index + 1}
                      </span>
                      <span className="nav-text">{step}</span>
                    </div>
                    {currentStep === index + 1 && (
                      <span className="nav-status">Current</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            

          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${isChatVisible ? 'chat-visible' : 'chat-hidden'}`}>
        <Container fluid className="py-4">
          <Row>
            <Col md={12} className={isChatVisible ? 'pe-4' : ''}>
          {currentStep > 0 && (
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Header className="bg-gradient-primary text-white py-3 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <h4 className="mb-0 me-3">
                      {steps[currentStep]}
                    </h4>
                    <div className="step-indicator">
                      Step {Math.min(currentStep, configStepCount)} of {configStepCount}
                    </div>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark me-2">Julia Optimization</span>
                    <span className="badge bg-light text-dark me-2">CAISO Data</span>
                    <span className="badge bg-light text-dark">Carbon Reduction</span>
                  </div>
                </div>
              </Card.Header>
            </Card>
          )}

          {/* Progress Bar - Only show after welcome step */}
          {currentStep > 0 && (
            <Card className="mb-4">
              <Card.Body>
                <ProgressBar 
                  now={((currentStep - 1) / (steps.length - 1)) * 100} 
                  className="mb-3"
                />
                <div className="d-flex justify-content-between">
                  {steps.slice(1).map((step, index) => (
                    <div 
                      key={index}
                      className={`text-center ${index + 1 <= currentStep - 1 ? 'text-primary' : 'text-muted'}`}
                      style={{ flex: 1 }}
                    >
                      <div className="fw-bold">{index + 1}</div>
                      <small>{step}</small>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Current Step Content */}
          <Card className="mb-4">
            <Card.Body>
              {renderStep()}
            </Card.Body>
          </Card>

          {/* Navigation Buttons - Only show after welcome step and not in optimization section */}
          {currentStep > 0 && currentSection === 'wizard' && (
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <Button 
                    variant="outline-secondary" 
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    ← Previous
                  </Button>
                  
                  {currentStep < 8 ? (
                    <Button 
                      variant="primary" 
                      onClick={nextStep}
                    >
                      Next →
                    </Button>
                  ) : currentStep === 8 ? (
                    <Button 
                      variant="success" 
                      onClick={nextStep}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating Files...' : 'Next → Generate Files'}
                    </Button>
                  ) : currentStep === 9 ? (
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setCurrentStep(10);
                        scrollToTop();
                      }}
                    >
                      Run Optimization →
                    </Button>
                  ) : currentStep === 10 ? (
                    <Button 
                      variant="success" 
                      disabled={!latestJobId}
                      onClick={() => {
                        setCurrentStep(11);
                        scrollToTop();
                      }}
                    >
                      View Results →
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={nextStep}
                    >
                      Next →
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Messages */}
          {message.text && (
            <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}
            </Col>
            
            {/* Chat Panel */}
            {isChatVisible && (
              <ChatPanel 
                messages={chatMessages}
                onSendMessage={handleChatMessage}
                isTyping={isAgentTyping}
                agentActions={agentActions}
                currentStep={currentStep}
                onToggle={toggleChat}
                onReset={handleChatReset}
              />
            )}
          </Row>
          
          {/* Footer */}
          <Row className="mt-5">
            <Col className={isChatVisible ? 'pe-4' : ''}>
              <Card className="border-0 bg-gradient-primary text-white">
                <Card.Body className="text-center py-3">
                  <div className="row align-items-center">
                    <div className="col-md-4">
                      <img 
                        src="/logo.png" 
                        alt="UCSD Logo" 
                        className="ucsd-logo-footer"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="fallback-logo-footer" style={{display: 'none'}}>🏫</div>
                    </div>
                    <div className="col-md-4">
                      <p className="mb-1 text-white">
                        <strong>MCS-CEV Optimization Project</strong>
                      </p>
                      <p className="mb-0 small text-white opacity-75">
                        University of California, San Diego
                      </p>
                    </div>
                    <div className="col-md-4">
                      <p className="mb-1 text-white">
                        <strong>Research & Development</strong>
                      </p>
                      <p className="mb-0 small text-white opacity-75">
                        Construction Electric Vehicle Optimization
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
}

export default App;
