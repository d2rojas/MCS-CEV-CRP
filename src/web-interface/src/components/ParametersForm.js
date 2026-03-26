import React from 'react';
import { Form, Row, Col, Alert } from 'react-bootstrap';

const ParametersForm = ({ data, onUpdate }) => {
  const handleChange = (field, value) => {
    onUpdate({ ...data, [field]: parseFloat(value) || 0 });
  };

  return (
    <div>
      <h3>🔧 Model Parameters</h3>
      <p className="text-muted">
        Configure the technical parameters of the optimization model.
      </p>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Charging/Discharging Efficiency (η_ch_dch)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={data.eta_ch_dch}
              onChange={(e) => handleChange('eta_ch_dch', e.target.value)}
            />
            <Form.Text className="text-muted">
              Efficiency of charging and discharging process (0-1)
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Maximum Capacity (MCS_max)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.MCS_max}
              onChange={(e) => handleChange('MCS_max', e.target.value)}
            />
            <Form.Text className="text-muted">
              Maximum energy capacity of the mobile station (kWh)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Minimum Capacity (MCS_min)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.MCS_min}
              onChange={(e) => handleChange('MCS_min', e.target.value)}
            />
            <Form.Text className="text-muted">
              Minimum energy capacity of the mobile station (kWh)
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Initial Capacity (MCS_ini)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.MCS_ini}
              onChange={(e) => handleChange('MCS_ini', e.target.value)}
            />
            <Form.Text className="text-muted">
              Initial energy capacity of the mobile station (kWh)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Charging Rate (CH_MCS)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.CH_MCS}
              onChange={(e) => handleChange('CH_MCS', e.target.value)}
            />
            <Form.Text className="text-muted">
              Charging rate of the mobile station (kW)
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Discharging Rate (DCH_MCS)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.DCH_MCS}
              onChange={(e) => handleChange('DCH_MCS', e.target.value)}
            />
            <Form.Text className="text-muted">
              Discharging rate of the mobile station (kW)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Discharging Rate with Plug (DCH_MCS_plug)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.DCH_MCS_plug}
              onChange={(e) => handleChange('DCH_MCS_plug', e.target.value)}
            />
            <Form.Text className="text-muted">
              Discharging rate with direct connection (kW)
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>MCS Plug Capacity (C_MCS_plug)</strong></Form.Label>
            <Form.Control
              type="number"
              step="1"
              min="0"
              value={data.C_MCS_plug}
              onChange={(e) => handleChange('C_MCS_plug', e.target.value)}
            />
            <Form.Text className="text-muted">
              Number of available charging connections
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Travel Factor (k_trv)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.k_trv}
              onChange={(e) => handleChange('k_trv', e.target.value)}
            />
            <Form.Text className="text-muted">
              Multiplication factor for travel times
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Time Interval (delta_T)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.delta_T}
              onChange={(e) => handleChange('delta_T', e.target.value)}
            />
            <Form.Text className="text-muted">
              Duration of each time interval (hours)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Missed Work Penalty (rho_miss)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.rho_miss}
              onChange={(e) => handleChange('rho_miss', e.target.value)}
            />
            <Form.Text className="text-muted">
              Penalty factor for incomplete work
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Demand Charge (lambda_demand)</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0"
              value={data.lambda_demand}
              onChange={(e) => handleChange('lambda_demand', e.target.value)}
            />
            <Form.Text className="text-muted">
              Demand charge rate ($/kW)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Social Cost of Carbon (carbon_price_per_ton)</strong></Form.Label>
            <Form.Control
              type="number"
              step="1"
              min="0"
              value={data.carbon_price_per_ton}
              onChange={(e) => handleChange('carbon_price_per_ton', e.target.value)}
            />
            <Form.Text className="text-muted">
              Social cost of carbon ($/metric ton CO2)
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Alert variant="warning">
        <strong>⚠️ Recommended Values:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>eta_ch_dch:</strong> 0.90-0.95 (typical battery efficiency)</li>
          <li><strong>MCS_max:</strong> 500-1000 kWh (mobile station capacity)</li>
          <li><strong>MCS_min:</strong> 50-100 kWh (minimum reserve)</li>
          <li><strong>CH_MCS/DCH_MCS:</strong> 50-100 kW (charging/discharging power)</li>
          <li><strong>delta_T:</strong> 0.25-0.5 hours (15-30 minutes per period)</li>
          <li><strong>lambda_demand:</strong> 0-20 $/kW (demand charge)</li>
          <li><strong>carbon_price_per_ton:</strong> 50 $/ton (social cost of carbon)</li>
        </ul>
      </Alert>
    </div>
  );
};

export default ParametersForm;
