import React, { useState, useEffect } from 'react';
import { Form, Table, Alert } from 'react-bootstrap';
import NetworkVisualization from './NetworkVisualization';

const LocationDataForm = ({ data, numNodes, numCEV, onUpdate }) => {
  const [locationData, setLocationData] = useState(data.length > 0 ? data : []);

  useEffect(() => {
    // Initialize location data if empty
    if (locationData.length === 0) {
      const initialData = Array.from({ length: numNodes }, (_, index) => {
        const location = {
          id: index + 1,
          name: index === 0 ? 'Grid Node' : `Construction Site ${index}`,
          type: index === 0 ? 'grid' : 'construction',
          evAssignments: {}
        };
        
        // Initialize EV assignments - each EV goes to a different construction site
        for (let ev = 1; ev <= numCEV; ev++) {
          if (index === 0) {
            // Grid node has no EVs
            location.evAssignments[ev] = 0;
          } else {
            // Simple assignment: EV1 to Construction Site 1, EV2 to Construction Site 2, etc.
            location.evAssignments[ev] = (ev === index) ? 1 : 0;
          }
        }
        
        return location;
      });
      setLocationData(initialData);
      onUpdate(initialData);
    }
  }, [numNodes, numCEV, locationData.length, onUpdate]);

  const handleLocationChange = (index, field, value) => {
    const newData = [...locationData];
    newData[index] = { ...newData[index], [field]: value };
    setLocationData(newData);
    onUpdate(newData);
  };

  const handleEVAssignment = (locationIndex, evId, value) => {
    const newData = [...locationData];
    const isAssigning = value === 'assigned';
    
    // If we're assigning an EV to this location, remove it from all other locations
    if (isAssigning) {
      for (let i = 0; i < newData.length; i++) {
        if (i !== locationIndex) {
          newData[i].evAssignments[evId] = 0;
        }
      }
    }
    
    newData[locationIndex].evAssignments[evId] = isAssigning ? 1 : 0;
    setLocationData(newData);
    onUpdate(newData);
  };

  return (
    <div>
      <h3>📍 Location Data</h3>
      <p className="text-muted">
        Configure the locations and assign electric vehicles to construction sites. Each EV can only be assigned to one location at a time.
      </p>
      
      {/* Network Visualization */}
      <NetworkVisualization 
        locationData={locationData} 
        numCEV={numCEV} 
      />
      
      <Alert variant="info">
        <strong>Assignment Rule:</strong> Each electric vehicle (EV) can only be assigned to one construction site at a time. Use the dropdown to assign/unassign EVs. When you assign an EV to a location, it will automatically be removed from all other locations.
      </Alert>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Node ID</th>
              <th>Location Name</th>
              <th>Type</th>
              {Array.from({ length: numCEV }, (_, i) => (
                <th key={i}>EV{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locationData.map((location, index) => (
              <tr key={index}>
                <td>Node{location.id}</td>
                <td>
                  <Form.Control
                    type="text"
                    value={location.name}
                    onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Select
                    value={location.type}
                    onChange={(e) => handleLocationChange(index, 'type', e.target.value)}
                  >
                    <option value="grid">Grid Node</option>
                    <option value="construction">Construction Site</option>
                  </Form.Select>
                </td>
                {Array.from({ length: numCEV }, (_, evIndex) => {
                  const evId = evIndex + 1;
                  const isAssigned = location.evAssignments[evId] === 1;
                  return (
                    <td key={evIndex}>
                      <Form.Select
                        value={isAssigned ? 'assigned' : 'not-assigned'}
                        onChange={(e) => handleEVAssignment(index, evId, e.target.value)}
                        disabled={location.type === 'grid'} // Grid nodes cannot have EVs assigned
                        size="sm"
                      >
                        <option value="not-assigned">Not Assigned</option>
                        <option value="assigned">Assigned</option>
                      </Form.Select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Assignment Summary */}
      <div className="mt-4">
        <h5>📋 Assignment Summary</h5>
        <div className="row">
          {locationData.map((location, index) => {
            const assignedEVs = Object.entries(location.evAssignments || {})
              .filter(([evId, assigned]) => assigned === 1)
              .map(([evId]) => `EV${evId}`)
              .join(', ');
            
            return (
              <div key={index} className="col-md-6 mb-2">
                <div className="card">
                  <div className="card-body p-2">
                    <small className="text-muted">
                      <strong>{location.name}</strong>: {assignedEVs || 'No EVs assigned'}
                    </small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Unassigned EVs Warning */}
        {(() => {
          const unassignedEVs = [];
          for (let ev = 1; ev <= numCEV; ev++) {
            const isAssigned = locationData.some(location => 
              location.evAssignments && location.evAssignments[ev] === 1
            );
            if (!isAssigned) {
              unassignedEVs.push(ev);
            }
          }
          
          if (unassignedEVs.length > 0) {
            return (
              <Alert variant="warning" className="mt-3">
                <strong>⚠️ Unassigned EVs:</strong> {unassignedEVs.map(ev => `EV${ev}`).join(', ')} are not assigned to any construction site. Please assign them to continue.
              </Alert>
            );
          }
          return null;
        })()}
      </div>

      <Alert variant="info">
        <strong>💡 Information:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>Grid Node:</strong> Main charging point with grid connection (Node 1)</li>
          <li><strong>Construction Sites:</strong> Work locations where EVs operate</li>
          <li>Use the dropdowns to assign EVs to construction sites</li>
          <li>Grid nodes cannot have EVs assigned (they are charging points)</li>
          <li>Each EV should be assigned to exactly one construction site</li>
        </ul>
      </Alert>


    </div>
  );
};

export default LocationDataForm;
