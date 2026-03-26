import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Alert } from 'react-bootstrap';

const EVDataForm = ({ data, numCEV, onUpdate }) => {
  const [evData, setEvData] = useState(data.length > 0 ? data : []);

  useEffect(() => {
    // Initialize EV data if empty
    if (evData.length === 0) {
      const initialData = Array.from({ length: numCEV }, (_, index) => ({
        id: index + 1,
        SOE_min: 20.0,
        SOE_max: 100.0,
        SOE_ini: 80.0,
        ch_rate: 50.0
      }));
      setEvData(initialData);
      onUpdate(initialData);
    }
  }, [numCEV, evData.length, onUpdate]);

  const handleChange = (index, field, value) => {
    const newData = [...evData];
    newData[index] = { ...newData[index], [field]: parseFloat(value) || 0 };
    setEvData(newData);
    onUpdate(newData);
  };

  const addEV = () => {
    const newEV = {
      id: evData.length + 1,
      SOE_min: 20.0,
      SOE_max: 100.0,
      SOE_ini: 80.0,
      ch_rate: 50.0
    };
    const newData = [...evData, newEV];
    setEvData(newData);
    onUpdate(newData);
  };

  const removeEV = (index) => {
    const newData = evData.filter((_, i) => i !== index);
    // Reassign IDs
    newData.forEach((ev, i) => {
      ev.id = i + 1;
    });
    setEvData(newData);
    onUpdate(newData);
  };

  return (
    <div>
      <h3>🚗 Electric Vehicle Data</h3>
      <p className="text-muted">
        Configure the specifications for each construction electric vehicle.
      </p>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Electric Vehicles ({evData.length})</h5>
        <Button variant="outline-primary" onClick={addEV}>
          + Add EV
        </Button>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>EV ID</th>
              <th>Min State of Energy (kWh)</th>
              <th>Max State of Energy (kWh)</th>
              <th>Initial State of Energy (kWh)</th>
              <th>Charging Rate (kW)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {evData.map((ev, index) => (
              <tr key={index}>
                <td>EV{ev.id}</td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    value={ev.SOE_min}
                    onChange={(e) => handleChange(index, 'SOE_min', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    value={ev.SOE_max}
                    onChange={(e) => handleChange(index, 'SOE_max', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    value={ev.SOE_ini}
                    onChange={(e) => handleChange(index, 'SOE_ini', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    value={ev.ch_rate}
                    onChange={(e) => handleChange(index, 'ch_rate', e.target.value)}
                  />
                </td>
                <td>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeEV(index)}
                    disabled={evData.length <= 1}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Alert variant="info">
        <strong>💡 Information:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>Min State of Energy:</strong> Minimum battery energy before charging is required (kWh)</li>
          <li><strong>Max State of Energy:</strong> Maximum battery energy capacity (kWh)</li>
          <li><strong>Initial State of Energy:</strong> Starting battery energy at the beginning of simulation (kWh)</li>
          <li><strong>Charging Rate:</strong> Maximum power the vehicle can accept while charging (kW)</li>
          <li>All energy values are in kWh, charging rate is in kW</li>
        </ul>
      </Alert>
    </div>
  );
};

export default EVDataForm;
