import React from 'react';
import { Form, Row, Col, Alert } from 'react-bootstrap';

const ScenarioConfig = ({ data, onUpdate }) => {
  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    
    // Auto-generate scenario name
    if (field === 'numMCS' || field === 'numCEV' || field === 'numNodes' || field === 'is24Hours') {
      const suffix = newData.is24Hours ? '-24hours' : '';
      newData.scenarioName = `${newData.numMCS}MCS-${newData.numCEV}CEV-${newData.numNodes}nodes${suffix}`;
    }
    
    onUpdate(newData);
  };

  return (
    <div>
      <h3>⚙️ Scenario Configuration</h3>
      <p className="text-muted">
        Define the basic configuration of your optimization scenario.
      </p>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Number of MCS (Mobile Charging Stations)</strong></Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="10"
              value={data.numMCS}
              onChange={(e) => handleChange('numMCS', parseInt(e.target.value))}
            />
            <Form.Text className="text-muted">
              Number of available mobile charging stations
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Number of CEV (Construction Electric Vehicles)</strong></Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="20"
              value={data.numCEV}
              onChange={(e) => handleChange('numCEV', parseInt(e.target.value))}
            />
            <Form.Text className="text-muted">
              Number of construction electric vehicles
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Number of Nodes</strong></Form.Label>
            <Form.Control
              type="number"
              min="2"
              max="20"
              value={data.numNodes}
              onChange={(e) => handleChange('numNodes', parseInt(e.target.value))}
            />
            <Form.Text className="text-muted">
              Total number of locations (includes grid node and construction sites)
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Analysis Duration</strong></Form.Label>
            <Form.Check
              type="switch"
              id="is24Hours"
              label="24-hour simulation (96 periods of 15 minutes)"
              checked={data.is24Hours}
              onChange={(e) => handleChange('is24Hours', e.target.checked)}
            />
            <Form.Text className="text-muted">
              If unchecked, standard format of 96 periods will be used
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label><strong>Scenario Name</strong></Form.Label>
        <Form.Control
          type="text"
          value={data.scenarioName}
          onChange={(e) => handleChange('scenarioName', e.target.value)}
          placeholder="Ex: 1MCS-1CEV-2nodes-24hours"
        />
        <Form.Text className="text-muted">
          This name will be used to create the scenario folder and files
        </Form.Text>
      </Form.Group>

      <Alert variant="info">
        <strong>💡 Information:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>Node 1</strong> will always be the grid node (main charging point)</li>
          <li>Nodes 2 onwards will be construction sites</li>
          <li>The 24-hour simulation includes real CAISO data for California</li>
          <li>The standard format uses 96 periods of 30 minutes each</li>
        </ul>
      </Alert>
    </div>
  );
};

export default ScenarioConfig;
