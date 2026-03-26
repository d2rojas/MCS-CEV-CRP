import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Alert, Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TimeDataForm = ({ data, is24Hours, onUpdate }) => {
  const [timeData, setTimeData] = useState(data.length > 0 ? data : []);
  const [timeRanges, setTimeRanges] = useState([
    { startHour: 0, endHour: 6, price: 0.1, co2: 0.05, label: 'Off-peak (00:00-06:00)' },
    { startHour: 6, endHour: 10, price: 0.15, co2: 0.08, label: 'Morning peak (06:00-10:00)' },
    { startHour: 10, endHour: 14, price: 0.12, co2: 0.06, label: 'Mid-day (10:00-14:00)' },
    { startHour: 14, endHour: 16, price: 0.18, co2: 0.09, label: 'Afternoon peak (14:00-16:00)' },
    { startHour: 16, endHour: 20, price: 0.25, co2: 0.12, label: 'Evening peak (16:00-20:00)' },
    { startHour: 20, endHour: 24, price: 0.15, co2: 0.07, label: 'Night (20:00-24:00)' }
  ]);
  const [validationErrors, setValidationErrors] = useState([]);
  // Fix: Standard format should be 48 periods (24 hours), 24-hour format stays at 96 periods
  const numPeriods = is24Hours ? 96 : 48; // 24h: 96 periods of 15min, Standard: 48 periods of 30min

  // Validation functions
  const validateTimeRanges = (ranges) => {
    const errors = [];
    
    // Sort ranges by start hour for easier validation
    const sortedRanges = [...ranges].sort((a, b) => a.startHour - b.startHour);
    
    // Check for individual range validity
    sortedRanges.forEach((range, index) => {
      // Check if start hour is less than end hour
      if (range.startHour >= range.endHour) {
        errors.push(`Range ${index + 1}: Start hour (${range.startHour}) must be less than end hour (${range.endHour})`);
      }
      
      // Check if hours are within valid range (0-24)
      if (range.startHour < 0 || range.startHour > 24) {
        errors.push(`Range ${index + 1}: Start hour must be between 0 and 24`);
      }
      if (range.endHour < 0 || range.endHour > 24) {
        errors.push(`Range ${index + 1}: End hour must be between 0 and 24`);
      }
      
      // Check for negative prices or CO2
      if (range.price < 0) {
        errors.push(`Range ${index + 1}: Price cannot be negative`);
      }
      if (range.co2 < 0) {
        errors.push(`Range ${index + 1}: CO2 intensity cannot be negative`);
      }
    });
    
    // Check for overlaps
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const current = sortedRanges[i];
      const next = sortedRanges[i + 1];
      
      if (current.endHour > next.startHour) {
        errors.push(`Overlap detected: Range ending at ${current.endHour}:00 overlaps with range starting at ${next.startHour}:00`);
      }
    }
    
    // Check for gaps
    if (sortedRanges.length > 0) {
      // Check if coverage starts at 0
      if (sortedRanges[0].startHour > 0) {
        errors.push(`Gap detected: No coverage from 00:00 to ${sortedRanges[0].startHour}:00`);
      }
      
      // Check if coverage ends at 24
      const lastRange = sortedRanges[sortedRanges.length - 1];
      if (lastRange.endHour < 24) {
        errors.push(`Gap detected: No coverage from ${lastRange.endHour}:00 to 24:00`);
      }
      
      // Check for gaps between ranges
      for (let i = 0; i < sortedRanges.length - 1; i++) {
        const current = sortedRanges[i];
        const next = sortedRanges[i + 1];
        
        if (current.endHour < next.startHour) {
          errors.push(`Gap detected: No coverage from ${current.endHour}:00 to ${next.startHour}:00`);
        }
      }
    }
    
    return errors;
  };



  const autoFixRanges = () => {
    const sortedRanges = [...timeRanges].sort((a, b) => a.startHour - b.startHour);
    const fixedRanges = [];
    
    // Start from 0
    let currentHour = 0;
    
    sortedRanges.forEach((range, index) => {
      // Fix start hour if needed
      const startHour = Math.max(currentHour, range.startHour);
      
      // Fix end hour if needed
      let endHour = range.endHour;
      if (endHour <= startHour) {
        endHour = startHour + 1;
      }
      if (endHour > 24) {
        endHour = 24;
      }
      
      // Ensure no overlap with next range
      if (index < sortedRanges.length - 1) {
        const nextRange = sortedRanges[index + 1];
        if (endHour > nextRange.startHour) {
          endHour = nextRange.startHour;
        }
      }
      
      fixedRanges.push({
        ...range,
        startHour,
        endHour
      });
      
      currentHour = endHour;
    });
    
    // Fill any remaining gap to 24
    if (currentHour < 24) {
      const lastRange = fixedRanges[fixedRanges.length - 1];
      if (lastRange) {
        lastRange.endHour = 24;
      }
    }
    
    setTimeRanges(fixedRanges);
    setValidationErrors([]); // Clear errors after auto-fixing
  };

  const generateTimeDataFromRanges = useCallback(() => {
    const newData = Array.from({ length: numPeriods }, (_, index) => {
      const period = index + 1;
      let time, electricityPrice, co2Intensity;
      
      if (is24Hours) {
        // 24-hour format: 96 periods of 15 minutes
        const hour = Math.floor(index / 4);
        const minute = (index % 4) * 15;
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      } else {
        // Standard format: 48 periods of 30 minutes (24 hours total)
        const hour = Math.floor(index / 2);
        const minute = (index % 2) * 30;
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      }

      const hour = Math.floor(index / (is24Hours ? 4 : 2));
      
      // Find the appropriate price range - use exact hour matching for step function
      let range = timeRanges[0]; // default to first range
      for (const r of timeRanges) {
        if (hour >= r.startHour && hour < r.endHour) {
          range = r;
          break;
        }
      }
      
      electricityPrice = range.price;
      co2Intensity = range.co2;
      
      return {
        period,
        time,
        electricityPrice: parseFloat(electricityPrice.toFixed(3)),
        co2Intensity: parseFloat(co2Intensity.toFixed(3))
      };
    });
    
    setTimeData(newData);
    onUpdate(newData);
  }, [timeRanges, numPeriods, is24Hours, onUpdate]);

  useEffect(() => {
    // Initialize time data if empty
    if (timeData.length === 0) {
      generateTimeDataFromRanges();
    }
  }, [timeData.length, generateTimeDataFromRanges]);

  const handleRangeChange = (index, field, value) => {
    const newRanges = [...timeRanges];
    newRanges[index] = { ...newRanges[index], [field]: parseFloat(value) || 0 };
    setTimeRanges(newRanges);
  };

  const handleRangeTimeChange = (index, field, value) => {
    const newRanges = [...timeRanges];
    newRanges[index] = { ...newRanges[index], [field]: parseInt(value) || 0 };
    setTimeRanges(newRanges);
  };

  const handleRangeLabelChange = (index, value) => {
    const newRanges = [...timeRanges];
    newRanges[index] = { ...newRanges[index], label: value };
    setTimeRanges(newRanges);
  };

  const addTimeRange = () => {
    const newRange = {
      startHour: 0,
      endHour: 6,
      price: 0.1,
      co2: 0.05,
      label: `Custom Range ${timeRanges.length + 1}`
    };
    setTimeRanges([...timeRanges, newRange]);
  };

  const removeTimeRange = (index) => {
    if (timeRanges.length > 1) {
      const newRanges = timeRanges.filter((_, i) => i !== index);
      setTimeRanges(newRanges);
    }
  };

  const applyRanges = () => {
    // Validate ranges when applying
    const errors = validateTimeRanges(timeRanges);
    setValidationErrors(errors);
    
    if (errors.length === 0) {
      generateTimeDataFromRanges();
    }
  };

  const setFixedValues = () => {
    const newData = timeData.map(item => ({
      ...item,
      electricityPrice: 0.1,
      co2Intensity: 0.08 // Different value to make it visible in the chart
    }));
    setTimeData(newData);
    onUpdate(newData);
    
    // Update the time ranges table to reflect fixed values
    const fixedRanges = [
      { startHour: 0, endHour: 24, price: 0.1, co2: 0.08, label: 'Fixed Values (00:00-24:00)' }
    ];
    setTimeRanges(fixedRanges);
    setValidationErrors([]); // Clear any previous errors since this is a valid template
  };

  // Load CAISO data template
  const loadCAISOTemplate = () => {
    const caisoRanges = [
      { startHour: 0, endHour: 6, price: 0.261, co2: 0.28, label: 'Off-peak (00:00-06:00)' },
      { startHour: 6, endHour: 10, price: 0.387, co2: 0.18, label: 'Morning peak (06:00-10:00)' },
      { startHour: 10, endHour: 14, price: 0.261, co2: 0.15, label: 'Mid-day (10:00-14:00)' },
      { startHour: 14, endHour: 16, price: 0.387, co2: 0.12, label: 'Afternoon peak (14:00-16:00)' },
      { startHour: 16, endHour: 20, price: 0.627, co2: 0.16, label: 'Evening peak (16:00-20:00)' },
      { startHour: 20, endHour: 24, price: 0.387, co2: 0.25, label: 'Night (20:00-24:00)' }
    ];
    
    // Update the time ranges table to reflect CAISO values
    setTimeRanges(caisoRanges);
    setValidationErrors([]); // Clear any previous errors since this is a valid template
    
    // Apply the new ranges
    const newData = Array.from({ length: numPeriods }, (_, index) => {
      const period = index + 1;
      let time;
      
      if (is24Hours) {
        const hour = Math.floor(index / 4);
        const minute = (index % 4) * 15;
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      } else {
        const hour = Math.floor(index / 2);
        const minute = (index % 2) * 30;
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      }

      const hour = Math.floor(index / (is24Hours ? 4 : 2));
      
      // Find the appropriate price range - use exact hour matching for step function
      let range = caisoRanges[0]; // default to first range
      for (const r of caisoRanges) {
        if (hour >= r.startHour && hour < r.endHour) {
          range = r;
          break;
        }
      }
      
      return {
        period,
        time,
        electricityPrice: parseFloat(range.price.toFixed(3)),
        co2Intensity: parseFloat(range.co2.toFixed(3))
      };
    });
    
    setTimeData(newData);
    onUpdate(newData);
  };

  // Generate chart data for price visualization
  const generatePriceChartData = () => {
    const labels = timeData.map(item => {
      const time = item.time.split(':').slice(0, 2).join(':');
      return time;
    });
    
    const electricityPrices = timeData.map(item => item.electricityPrice);
    const co2Intensities = timeData.map(item => item.co2Intensity);
    
    return {
      labels,
      datasets: [
        {
          label: 'Electricity Price ($/kWh)',
          data: electricityPrices,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0, // No tension for step function
          yAxisID: 'y',
        },
        {
          label: 'CO2 Intensity (kg CO2/kWh)',
          data: co2Intensities,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          fill: false,
          tension: 0, // No tension for step function
          yAxisID: 'y1',
        }
      ],
    };
  };

  // Chart options
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Electricity Prices and CO2 Intensity Over Time',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Electricity Price ($/kWh)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'CO2 Intensity (kg CO2/kWh)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          maxTicksLimit: 12,
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4
      }
    }
  });

  return (
    <div>
      <h3>⏰ Time Data</h3>
      <p className="text-muted">
        Configure time-dependent parameters: electricity prices and CO2 emission factors.
      </p>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Time Periods ({timeData.length})</h5>
        <div>
          <Button variant="outline-secondary" onClick={setFixedValues} className="me-2">
            Set Fixed Values
          </Button>
          <Button variant="outline-success" onClick={loadCAISOTemplate}>
            Load CAISO Template
          </Button>
        </div>
      </div>
      
      <Alert variant="info" className="mb-3">
        <strong>💡 Tip:</strong> When you click "Set Fixed Values" or "Load CAISO Template", both the chart and the time ranges table will be updated automatically to stay synchronized. Use "Apply Ranges" to validate your custom configurations and update the chart.
      </Alert>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="danger" className="mb-3">
          <strong>⚠️ Validation Errors:</strong>
          <ul className="mb-0 mt-2">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <div className="mt-3">
            <Button variant="warning" size="sm" onClick={autoFixRanges}>
              🔧 Auto-Fix Ranges
            </Button>
            <small className="text-muted ms-2">
              This will automatically adjust time ranges to eliminate overlaps and gaps
            </small>
          </div>
        </Alert>
      )}

      {/* Price Configuration by Ranges */}
      <Card className="mb-4">
        <Card.Header>
          <h6>📊 Price Configuration by Time Ranges</h6>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small mb-3">
            Configure electricity prices and CO2 intensity for different time ranges. Click "Apply Ranges" to update the time series.
          </p>
          
          <div className="table-responsive">
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Range Name</th>
                  <th>Start Hour</th>
                  <th>End Hour</th>
                  <th>Price ($/kWh)</th>
                  <th>CO2 (kg CO2/kWh)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeRanges.map((range, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Control
                        type="text"
                        value={range.label}
                        onChange={(e) => handleRangeLabelChange(index, e.target.value)}
                        placeholder="Enter range name"
                        size="sm"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        max="23"
                        value={range.startHour}
                        onChange={(e) => handleRangeTimeChange(index, 'startHour', e.target.value)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        max="24"
                        value={range.endHour}
                        onChange={(e) => handleRangeTimeChange(index, 'endHour', e.target.value)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        step="0.001"
                        min="0"
                        value={range.price}
                        onChange={(e) => handleRangeChange(index, 'price', e.target.value)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        step="0.001"
                        min="0"
                        value={range.co2}
                        onChange={(e) => handleRangeChange(index, 'co2', e.target.value)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeTimeRange(index)}
                        disabled={timeRanges.length <= 1}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
                      <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button 
                  variant="primary" 
                  onClick={applyRanges} 
                  className="me-2"
                >
                  Apply Ranges
                </Button>
                <Button variant="outline-info" onClick={addTimeRange}>
                  Add Time Range
                </Button>
              </div>
              <div className="text-end">
                {validationErrors.length === 0 ? (
                  <span className="text-muted">
                    Click "Apply Ranges" to validate and update the chart
                  </span>
                ) : (
                  <span className="text-danger">
                    ❌ {validationErrors.length} error(s) found
                  </span>
                )}
              </div>
            </div>
        </Card.Body>
      </Card>

      {/* Price Visualization Chart */}
      <Card className="mb-4">
        <Card.Header>
          <h6>📈 Price and CO2 Intensity Visualization</h6>
        </Card.Header>
        <Card.Body>
          <div style={{ height: '400px' }}>
            <Line data={generatePriceChartData()} options={getChartOptions()} />
          </div>
          <div className="mt-2">
            <small className="text-muted">
              <strong>Statistics:</strong> 
              Min Price: ${Math.min(...timeData.map(t => t.electricityPrice)).toFixed(3)}/kWh | 
              Max Price: ${Math.max(...timeData.map(t => t.electricityPrice)).toFixed(3)}/kWh | 
              Avg Price: ${(timeData.reduce((sum, t) => sum + t.electricityPrice, 0) / timeData.length).toFixed(3)}/kWh
            </small>
          </div>
        </Card.Body>
      </Card>

      <Alert variant="info">
        <strong>💡 Information:</strong>
        <ul className="mb-0 mt-2">
          <li><strong>Range Names:</strong> Customize the names of your time ranges for better organization</li>
          <li><strong>Time Ranges:</strong> Configure prices and CO2 for different periods of the day</li>
          <li><strong>Validation:</strong> System validates ranges for overlaps, gaps, and invalid values when you click "Apply Ranges"</li>
          <li><strong>Auto-Fix:</strong> Automatically corrects time range issues when validation errors occur</li>
          <li><strong>Apply Ranges:</strong> Validates and updates the entire time series based on your range configuration</li>
          <li><strong>Add/Remove Ranges:</strong> Customize the number of time ranges as needed</li>
          <li><strong>CAISO Template:</strong> Real California electricity prices and CO2 data - updates both chart and table</li>
          <li><strong>Fixed Values:</strong> Sets constant prices ($0.10/kWh) and CO2 (0.08 kg CO2/kWh) for all periods - updates both chart and table</li>
          <li><strong>Visualization:</strong> See how your configuration affects the 24-hour price profile</li>
          <li><strong>Synchronization:</strong> Chart and time ranges table are automatically synchronized when using preset buttons</li>
        </ul>
      </Alert>

      <Alert variant="warning">
        <strong>⚠️ Time Format:</strong>
        <p className="mb-0 mt-2">
          {is24Hours 
            ? "24-hour simulation: 96 periods of 15 minutes each (00:00:00 to 23:45:00)"
            : "Standard simulation: 48 periods of 30 minutes each (00:00:00 to 23:59:00)"
          }
        </p>
      </Alert>
    </div>
  );
};

export default TimeDataForm;
