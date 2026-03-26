import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';

const SummaryViewer = ({ summary }) => {
  if (!summary) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center text-muted">
          <p>No summary data available</p>
        </Card.Body>
      </Card>
    );
  }

  const formatMetric = (value, unit = '') => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit}`.trim();
    }
    return value;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'OPTIMAL': { variant: 'success', text: '✅ Optimal' },
      'INFEASIBLE': { variant: 'danger', text: '❌ Infeasible' },
      'UNBOUNDED': { variant: 'warning', text: '⚠️ Unbounded' },
      'TIMEOUT': { variant: 'warning', text: '⏰ Timeout' },
      'default': { variant: 'secondary', text: status }
    };
    
    const statusInfo = statusMap[status] || statusMap.default;
    return <Badge bg={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <h5 className="mb-0">📋 Optimization Summary</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          {/* Key Metrics */}
          <Col md={6}>
            <div className="mb-4">
              <h6 className="text-primary mb-3">🎯 Key Metrics</h6>
              
              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Solution Status:</span>
                  <span className="metric-value">
                    {getStatusBadge(summary.solutionStatus)}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Total Energy from Grid:</span>
                  <span className="metric-value fw-bold text-primary">
                    {formatMetric(summary.totalEnergyFromGrid, 'kWh')}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Total Missed Work:</span>
                  <span className="metric-value">
                    {formatMetric(summary.totalMissedWork, 'kWh')}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Peak Power:</span>
                  <span className="metric-value">
                    {formatMetric(summary.peakPower, 'kW')}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Average Power:</span>
                  <span className="metric-value">
                    {formatMetric(summary.averagePower, 'kW')}
                  </span>
                </div>
              </div>
            </div>
          </Col>

          {/* Cost Analysis */}
          <Col md={6}>
            <div className="mb-4">
              <h6 className="text-success mb-3">💰 Cost Analysis</h6>
              
              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Total Electricity Cost:</span>
                  <span className="metric-value fw-bold text-success">
                    ${formatMetric(summary.totalElectricityCost)}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Carbon Emissions Cost:</span>
                  <span className="metric-value">
                    ${formatMetric(summary.totalCarbonEmissionsCost)}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Total Cost:</span>
                  <span className="metric-value fw-bold text-success">
                    ${formatMetric(summary.totalElectricityCost + summary.totalCarbonEmissionsCost)}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Energy Efficiency:</span>
                  <span className="metric-value">
                    {formatMetric(summary.energyEfficiency, '%')}
                  </span>
                </div>
              </div>

              <div className="metric-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="metric-label">Duty Cycle:</span>
                  <span className="metric-value">
                    {formatMetric(summary.dutyCycle, '%')}
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* System Configuration */}
        <Row>
          <Col md={12}>
            <div className="mb-4">
              <h6 className="text-info mb-3">⚙️ System Configuration</h6>
              <Row>
                <Col md={3}>
                  <div className="config-item text-center p-3 bg-light rounded">
                    <div className="config-value fw-bold text-primary">{summary.numMCS}</div>
                    <div className="config-label small">Mobile Charging Stations</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="config-item text-center p-3 bg-light rounded">
                    <div className="config-value fw-bold text-primary">{summary.numCEV}</div>
                    <div className="config-label small">Construction EVs</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="config-item text-center p-3 bg-light rounded">
                    <div className="config-value fw-bold text-primary">{summary.numNodes}</div>
                    <div className="config-label small">Total Nodes</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="config-item text-center p-3 bg-light rounded">
                    <div className="config-value fw-bold text-primary">{summary.numTimePeriods}</div>
                    <div className="config-label small">Time Periods</div>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>

        {/* Energy Balance Verification */}
        <Row>
          <Col md={12}>
            <div className="energy-balance-section">
              <h6 className="text-success mb-3">⚡ Energy Balance Verification</h6>
              <div className="alert alert-success mb-0">
                <div className="d-flex align-items-center">
                  <span className="me-2">✅</span>
                  <span>
                    <strong>Energy balance verified:</strong> 
                    Initial MCS Energy: {formatMetric(summary.initialMCSEnergy, 'kWh')} → 
                    Final MCS Energy: {formatMetric(summary.finalMCSEnergy, 'kWh')} 
                    (Net Change: {formatMetric(summary.netEnergyChange, 'kWh')})
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default SummaryViewer;
