import React, { useState, useEffect } from 'react';
import { Form, Table, Alert, Button, Row, Col, Card } from 'react-bootstrap';

const MatrixDataForm = ({ distanceMatrix, travelTimeMatrix, numNodes, onUpdate }) => {
  const [distances, setDistances] = useState(distanceMatrix.length > 0 ? distanceMatrix : []);
  const [travelTimes, setTravelTimes] = useState(travelTimeMatrix.length > 0 ? travelTimeMatrix : []);

  // Initialize matrices if empty
  useEffect(() => {
    if (distances.length === 0) {
      const initialDistances = generateDefaultDistanceMatrix(numNodes);
      setDistances(initialDistances);
      onUpdate(initialDistances, travelTimes.length > 0 ? travelTimes : generateDefaultTravelTimeMatrix(numNodes));
    }
    if (travelTimes.length === 0) {
      const initialTravelTimes = generateDefaultTravelTimeMatrix(numNodes);
      setTravelTimes(initialTravelTimes);
      onUpdate(distances.length > 0 ? distances : generateDefaultDistanceMatrix(numNodes), initialTravelTimes);
    }
  }, [numNodes, distances.length, travelTimes.length, onUpdate, distances, travelTimes]);

  const generateDefaultDistanceMatrix = (nodes) => {
    const matrix = [];
    for (let i = 0; i < nodes; i++) {
      matrix[i] = [];
      for (let j = 0; j < nodes; j++) {
        if (i === j) {
          matrix[i][j] = 0; // Distance to self is 0
        } else {
          matrix[i][j] = 1; // Default distance of 1 mile/km
        }
      }
    }
    return matrix;
  };

  const generateDefaultTravelTimeMatrix = (nodes) => {
    const matrix = [];
    for (let i = 0; i < nodes; i++) {
      matrix[i] = [];
      for (let j = 0; j < nodes; j++) {
        if (i === j) {
          matrix[i][j] = 0; // Travel time to self is 0
        } else {
          matrix[i][j] = 1; // Default travel time of 1 period
        }
      }
    }
    return matrix;
  };

  const handleDistanceChange = (row, col, value) => {
    const newDistances = [...distances];
    newDistances[row][col] = parseFloat(value) || 0;
    
    // Make matrix symmetric
    if (row !== col) {
      newDistances[col][row] = newDistances[row][col];
    }
    
    setDistances(newDistances);
    onUpdate(newDistances, travelTimes);
  };

  const handleTravelTimeChange = (row, col, value) => {
    const newTravelTimes = [...travelTimes];
    newTravelTimes[row][col] = parseFloat(value) || 0;
    
    // Make matrix symmetric
    if (row !== col) {
      newTravelTimes[col][row] = newTravelTimes[row][col];
    }
    
    setTravelTimes(newTravelTimes);
    onUpdate(distances, newTravelTimes);
  };

  const generateRandomMatrices = () => {
    const newDistances = [];
    const newTravelTimes = [];
    
    for (let i = 0; i < numNodes; i++) {
      newDistances[i] = [];
      newTravelTimes[i] = [];
      for (let j = 0; j < numNodes; j++) {
        if (i === j) {
          newDistances[i][j] = 0;
          newTravelTimes[i][j] = 0;
        } else {
          newDistances[i][j] = Math.round(Math.random() * 50 + 10); // 10-60 miles
          newTravelTimes[i][j] = Math.round(Math.random() * 10 + 1); // 1-11 periods
        }
      }
    }
    
    setDistances(newDistances);
    setTravelTimes(newTravelTimes);
    onUpdate(newDistances, newTravelTimes);
  };

  const resetToDefaults = () => {
    const defaultDistances = generateDefaultDistanceMatrix(numNodes);
    const defaultTravelTimes = generateDefaultTravelTimeMatrix(numNodes);
    setDistances(defaultDistances);
    setTravelTimes(defaultTravelTimes);
    onUpdate(defaultDistances, defaultTravelTimes);
  };

  const getLocationName = (index) => {
    return index === 0 ? 'Grid Node' : `Construction Site ${index}`;
  };

  return (
    <div>
      <h3>🗺️ Distance & Travel Time Matrices</h3>
      <p className="text-muted">
        Configure the distance and travel time between all locations. The matrices are automatically symmetric (distance from A to B equals distance from B to A).
      </p>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Matrices Configuration ({numNodes} × {numNodes})</h5>
        <div>
          <Button variant="outline-secondary" onClick={resetToDefaults} className="me-2">
            Reset to Defaults
          </Button>
          <Button variant="outline-primary" onClick={generateRandomMatrices}>
            Generate Random Values
          </Button>
        </div>
      </div>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h6>📏 Distance Matrix (miles/km)</h6>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>From/To</th>
                      {Array.from({ length: numNodes }, (_, i) => (
                        <th key={i} className="text-center">
                          <small>{getLocationName(i)}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {distances.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="fw-bold">
                          <small>{getLocationName(rowIndex)}</small>
                        </td>
                        {row.map((value, colIndex) => (
                          <td key={colIndex}>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.1"
                              value={value}
                              onChange={(e) => handleDistanceChange(rowIndex, colIndex, e.target.value)}
                              size="sm"
                              className={rowIndex === colIndex ? 'bg-light' : ''}
                              disabled={rowIndex === colIndex}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h6>⏱️ Travel Time Matrix (periods)</h6>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>From/To</th>
                      {Array.from({ length: numNodes }, (_, i) => (
                        <th key={i} className="text-center">
                          <small>{getLocationName(i)}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {travelTimes.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="fw-bold">
                          <small>{getLocationName(rowIndex)}</small>
                        </td>
                        {row.map((value, colIndex) => (
                          <td key={colIndex}>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.1"
                              value={value}
                              onChange={(e) => handleTravelTimeChange(rowIndex, colIndex, e.target.value)}
                              size="sm"
                              className={rowIndex === colIndex ? 'bg-light' : ''}
                              disabled={rowIndex === colIndex}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Alert variant="info">
        <strong>💡 Information:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>Distance Matrix:</strong> Distances between locations in miles or kilometers</li>
          <li><strong>Travel Time Matrix:</strong> Travel time between locations in time periods</li>
          <li><strong>Diagonal Values:</strong> Always 0 (distance/time to same location)</li>
          <li><strong>Symmetric Matrix:</strong> Distance from A to B equals distance from B to A</li>
          <li><strong>Default Values:</strong> All distances and times set to 1 by default</li>
          <li><strong>Random Generation:</strong> Creates realistic random values for testing</li>
        </ul>
      </Alert>

      <Alert variant="warning">
        <strong>⚠️ Important:</strong>
        <p className="mb-0 mt-2">
          These matrices are crucial for the optimization model. Make sure the values are realistic for your scenario. 
          The model will use these values to calculate optimal routes and schedules.
        </p>
      </Alert>
    </div>
  );
};

export default MatrixDataForm;
