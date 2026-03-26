import React from 'react';
import { Card, Row, Col, Button, Alert, Badge, ListGroup } from 'react-bootstrap';

const GeneratedFilesStep = ({ formData, generatedFiles, onDownloadFiles, isOptimizing, onStartOptimization }) => {
  const { scenario } = formData;

  const getFileIcon = (filename) => {
    if (filename.includes('parameters')) return '⚙️';
    if (filename.includes('ev_data')) return '🚗';
    if (filename.includes('place')) return '📍';
    if (filename.includes('distance')) return '📏';
    if (filename.includes('travel_time')) return '⏱️';
    if (filename.includes('time_data')) return '📅';
    if (filename.includes('work')) return '🔧';
    if (filename.includes('CAISO')) return '🌐';
    if (filename.includes('README')) return '📖';
    return '📄';
  };

  const getFileDescription = (filename) => {
    const descriptions = {
      'parameters.csv': 'Model parameters and technical specifications',
      'ev_data.csv': 'Electric vehicle specifications and battery parameters',
      'place.csv': 'Location data and EV assignments',
      'distance.csv': 'Distance matrix between locations',
      'travel_time.csv': 'Travel time matrix between locations',
      'time_data.csv': 'Time-dependent electricity prices and CO2 emission factors',
      'work.csv': 'Work requirements for each EV at each location over time',
      'CAISO-demand-20250806.csv': 'Real CAISO demand data for California',
      'CAISO-co2-20250806.csv': 'Real CAISO CO2 intensity data for California',
      'README.md': 'Documentation and usage instructions'
    };
    return descriptions[filename] || 'Generated file';
  };

  return (
    <div>
      <h3>📁 Generated Files & Optimization</h3>
      <p className="text-muted">
        Your CSV files have been generated successfully! Review the files below and run the optimization.
      </p>

      <Alert variant="success" className="mb-4">
        <strong>✅ Files Generated Successfully!</strong> All CSV files for scenario "{scenario.scenarioName}" are ready for optimization.
      </Alert>

      <Row>
        <Col lg={8}>
          {/* Generated Files List */}
          <Card className="mb-4">
            <Card.Header>
              <h5>📋 Generated Files</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {(generatedFiles.csvFiles ? Object.keys(generatedFiles.csvFiles) : Object.keys(generatedFiles)).map((filename, index) => (
                  <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <span className="me-2">{getFileIcon(filename)}</span>
                      <div>
                        <strong>{filename}</strong>
                        <br />
                        <small className="text-muted">{getFileDescription(filename)}</small>
                      </div>
                    </div>
                    <Badge bg="success">Ready</Badge>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>

          {/* Optimization Section */}
          <Card className="mb-4">
            <Card.Header>
              <h5>🚀 Run Optimization</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Your scenario is ready for optimization! Click the button below to run the MCS-CEV optimization model.
              </p>
              
              <Alert variant="info" className="mb-3">
                <strong>💡 What happens next:</strong>
                <ul className="mb-0 mt-2">
                  <li>The optimization model will process your data</li>
                  <li>Results will include charging schedules, routes, and cost analysis</li>
                  <li>Visualizations and reports will be generated</li>
                  <li>You can download all results when complete</li>
                </ul>
              </Alert>

              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  size="lg"
                  disabled={isOptimizing}
                  onClick={onStartOptimization}
                >
                  {isOptimizing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Running Optimization...
                    </>
                  ) : (
                    <>
                      🚀 Run Optimization
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={onDownloadFiles}
                  disabled={isOptimizing}
                >
                  📁 Download Files (Optional)
                </Button>
              </div>
              
              <p className="small text-muted mt-2">
                <strong>Estimated time:</strong> 1-5 minutes depending on scenario complexity
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Scenario Summary */}
          <Card className="mb-4">
            <Card.Header>
              <h5>📊 Scenario Summary</h5>
            </Card.Header>
            <Card.Body>
              <p><strong>Scenario Name:</strong> {scenario.scenarioName}</p>
              <p><strong>MCS Units:</strong> {scenario.numMCS}</p>
              <p><strong>CEV Units:</strong> {scenario.numCEV}</p>
              <p><strong>Nodes:</strong> {scenario.numNodes}</p>
              <p><strong>Duration:</strong> {scenario.is24Hours ? '24 hours' : '8 hours'}</p>
            </Card.Body>
          </Card>

          {/* Files Summary */}
          <Card className="mb-4">
            <Card.Header>
              <h5>📁 Files Summary</h5>
            </Card.Header>
            <Card.Body>
              <p><strong>Total Files:</strong> {generatedFiles.csvFiles ? Object.keys(generatedFiles.csvFiles).length : Object.keys(generatedFiles).length}</p>
              <p><strong>Core CSV Files:</strong> 7</p>
              {scenario.is24Hours && (
                <p><strong>CAISO Data Files:</strong> 2</p>
              )}
              <p><strong>Documentation:</strong> 1</p>
              <p><strong>Status:</strong> <Badge bg="success">All Ready</Badge></p>
            </Card.Body>
          </Card>

          {/* Next Steps */}
          <Card className="mb-4">
            <Card.Header>
              <h5>🎯 Next Steps</h5>
            </Card.Header>
            <Card.Body>
              <ol className="small">
                <li>Review generated files above</li>
                <li>Click "Run Optimization"</li>
                <li>Monitor progress in real-time</li>
                <li>Download results when complete</li>
                <li>Analyze optimization outcomes</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GeneratedFilesStep;
