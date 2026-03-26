import React, { useState, useEffect, useCallback } from 'react';
import { Form, Alert, Card, Button, Table, Row, Col, Badge } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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

const CEVWorkScheduler = ({ data, numCEV, timeData, locationData, onUpdate }) => {
  const [workSchedules, setWorkSchedules] = useState([]);
  const [selectedEV, setSelectedEV] = useState(1);
  const [validationErrors, setValidationErrors] = useState({ criticalErrors: [], warnings: [] });
  const [defaultTimeData, setDefaultTimeData] = useState([]);

  // Generate default time data with CAISO-like values (48 periods of 30 minutes for 24 hours)
  // This ensures realistic electricity prices and CO2 intensity even when user doesn't configure time data
  const generateDefaultTimeData = useCallback(() => {
    const timeData = [];
    
    // CAISO-like time ranges with realistic electricity prices and CO2 intensity
    const timeRanges = [
      { startHour: 0, endHour: 6, price: 0.1, co2: 0.05, label: 'Off-peak (00:00-06:00)' },
      { startHour: 6, endHour: 10, price: 0.15, co2: 0.08, label: 'Morning peak (06:00-10:00)' },
      { startHour: 10, endHour: 14, price: 0.12, co2: 0.06, label: 'Mid-day (10:00-14:00)' },
      { startHour: 14, endHour: 16, price: 0.18, co2: 0.09, label: 'Afternoon peak (14:00-16:00)' },
      { startHour: 16, endHour: 20, price: 0.25, co2: 0.12, label: 'Evening peak (16:00-20:00)' },
      { startHour: 20, endHour: 24, price: 0.15, co2: 0.07, label: 'Night (20:00-24:00)' }
    ];
    
    for (let i = 0; i < 48; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      
      // Find the appropriate price range
      let range = timeRanges[0]; // default to first range
      for (const r of timeRanges) {
        if (hour >= r.startHour && hour < r.endHour) {
          range = r;
          break;
        }
      }
      
      timeData.push({
        period: i + 1,
        time: time,
        electricityPrice: range.price,
        co2Intensity: range.co2
      });
    }
    return timeData;
  }, []);

  // Generate work data from schedules
  const generateWorkData = useCallback((schedules = workSchedules) => {
    // Use timeData if available, otherwise use defaultTimeData
    const currentTimeData = timeData.length > 0 ? timeData : defaultTimeData;
    if (currentTimeData.length === 0) return;

    console.log('🔍 CEVWorkScheduler: Generating work data with:', {
      schedulesLength: schedules.length,
      schedules: schedules,
      currentTimeDataLength: currentTimeData.length,
      locationDataLength: locationData.length,
      locationData: locationData
    });

    const newWorkData = [];
    
    schedules.forEach(evSchedule => {
      console.log(`🔍 Processing EV ${evSchedule.ev} schedule:`, evSchedule);
      const workRequirements = generateWorkProfile(evSchedule.schedules, currentTimeData);
      
      // Find the assigned location for this EV
      // First try to find by evAssignments, if not found, use fallback assignment
      let assignedLocation = locationData.find(location => 
        location.evAssignments && location.evAssignments[evSchedule.ev] === 1
      );
      
      // Fallback: if no specific assignment found, assign EV 1 to first location, EV 2 to second, etc.
      if (!assignedLocation && locationData.length > 0) {
        const locationIndex = (evSchedule.ev - 1) % locationData.length;
        assignedLocation = locationData[locationIndex];
        console.log(`🔍 Using fallback assignment: EV ${evSchedule.ev} -> Location ${assignedLocation.id}`);
      }
      
      console.log(`🔍 EV ${evSchedule.ev} assigned location:`, assignedLocation);
      
      if (assignedLocation) {
        const workItem = {
          location: assignedLocation.id,
          ev: evSchedule.ev,
          workRequirements: workRequirements
        };
        newWorkData.push(workItem);
        console.log(`🔍 Added work item for EV ${evSchedule.ev}:`, workItem);
      } else {
        console.log(`⚠️ No assigned location found for EV ${evSchedule.ev}`);
      }
    });
    
    console.log('🔍 Generated work data:', newWorkData);
    onUpdate(newWorkData);
  }, [timeData, defaultTimeData, onUpdate, workSchedules, locationData]);

  // Initialize default time data if not provided
  useEffect(() => {
    if (timeData.length === 0 && defaultTimeData.length === 0) {
      const generatedTimeData = generateDefaultTimeData();
      setDefaultTimeData(generatedTimeData);
    }
  }, [timeData.length, defaultTimeData.length, generateDefaultTimeData]);

  // Initialize work schedules for each CEV
  useEffect(() => {
    if (numCEV > 0) {
      console.log(`🔍 Initializing work schedules for ${numCEV} CEVs`);
      const initialSchedules = [];
      for (let ev = 1; ev <= numCEV; ev++) {
        const schedule = {
          ev: ev,
          schedules: [{
            id: 1,
            startTime: '08:00',
            endTime: '17:00',
            workPower: 50,
            label: `Work Period 1`
          }]
        };
        initialSchedules.push(schedule);
        console.log(`🔍 Created initial schedule for EV ${ev}:`, schedule);
      }
      setWorkSchedules(initialSchedules);
      console.log('🔍 Set initial work schedules:', initialSchedules);
    }
  }, [numCEV]);

  // Generate work data when both schedules and time data are ready
  useEffect(() => {
    console.log('🔍 useEffect for generating work data - workSchedules.length:', workSchedules.length, 'timeData.length:', timeData.length, 'defaultTimeData.length:', defaultTimeData.length);
    if (workSchedules.length > 0) {
      const currentTimeData = timeData.length > 0 ? timeData : defaultTimeData;
      if (currentTimeData.length > 0) {
        console.log('🔍 Both schedules and time data are ready, generating work data...');
        generateWorkData(workSchedules);
      }
    }
  }, [workSchedules, timeData, defaultTimeData, generateWorkData]); // Include generateWorkData in dependencies

  // Generate work profile based on schedules (piecewise function)
  const generateWorkProfile = (schedules, timeData) => {
    console.log('🔍 generateWorkProfile called with:', {
      schedulesLength: schedules.length,
      schedules: schedules,
      timeDataLength: timeData.length
    });
    
    const workRequirements = [];
    
    timeData.forEach((timePoint, index) => {
      const time = timePoint.time;
      const timeParts = time.split(':');
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      const timeInMinutes = hour * 60 + minute;
      
      let workPower = 0;
      let status = 'Off';
      
      // Check all schedules for this time
      for (const schedule of schedules) {
        const startTime = schedule.startTime;
        const endTime = schedule.endTime;
        
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const startInMinutes = startHour * 60 + startMinute;
        
        const endHour = parseInt(endTime.split(':')[0]);
        const endMinute = parseInt(endTime.split(':')[1]);
        const endInMinutes = endHour * 60 + endMinute;
        
        // Check if current time falls within this schedule
        if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
          workPower = parseFloat(schedule.workPower) || 0;
          status = 'Working';
          break; // Use the first matching schedule
        }
      }
      
      workRequirements.push({
        time: time,
        workPower: workPower,
        status: status
      });
      
      // Log first few time periods for debugging
      if (index < 3) {
        console.log(`🔍 Time ${time}: workPower=${workPower}, status=${status}`);
      }
    });
    
    console.log('🔍 Generated work requirements:', workRequirements.slice(0, 5));
    return workRequirements;
  };

  // Add new work period for selected EV
  const addWorkPeriod = (ev) => {
    setWorkSchedules(prevSchedules => {
      const newSchedules = prevSchedules.map(schedule => {
        if (schedule.ev === ev) {
          const maxId = schedule.schedules.length > 0 
            ? Math.max(...schedule.schedules.map(s => s.id)) 
            : 0;
          
          const newPeriod = {
            id: maxId + 1,
            startTime: '09:00',
            endTime: '17:00',
            workPower: 2.0,
            label: `Work Period ${maxId + 1}`
          };
          
          return {
            ...schedule,
            schedules: [...schedule.schedules, newPeriod]
          };
        }
        return schedule;
      });
      
      generateWorkData(newSchedules);
      return newSchedules;
    });
  };

  // Remove work period
  const removeWorkPeriod = (ev, periodId) => {
    setWorkSchedules(prevSchedules => {
      const newSchedules = prevSchedules.map(schedule => {
        if (schedule.ev === ev) {
          const filteredSchedules = schedule.schedules.filter(s => s.id !== periodId);
          return {
            ...schedule,
            schedules: filteredSchedules
          };
        }
        return schedule;
      });
      
      generateWorkData(newSchedules);
      return newSchedules;
    });
  };

  // Update work period
  const updateWorkPeriod = (ev, periodId, field, value) => {
    setWorkSchedules(prevSchedules => {
      const newSchedules = prevSchedules.map(schedule => {
        if (schedule.ev === ev) {
          return {
            ...schedule,
            schedules: schedule.schedules.map(s => {
              if (s.id === periodId) {
                return { ...s, [field]: value };
              }
              return s;
            })
          };
        }
        return schedule;
      });
      
      generateWorkData(newSchedules);
      return newSchedules;
    });
  };

  // Generate chart data for selected EV
  const generateChartData = () => {
    const selectedSchedule = workSchedules.find(s => s.ev === selectedEV);
    
    if (!selectedSchedule || selectedSchedule.schedules.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Use timeData if available, otherwise use defaultTimeData
    const currentTimeData = timeData.length > 0 ? timeData : defaultTimeData;
    const workProfile = generateWorkProfile(selectedSchedule.schedules, currentTimeData);
    
    const labels = workProfile.map(period => {
      const time = period.time.split(':').slice(0, 2).join(':');
      return time;
    });
    
    const data = workProfile.map(period => period.workPower);
    
    const backgroundColors = workProfile.map(period => {
      if (period.status === 'Working') {
        return 'rgba(34, 197, 94, 0.7)';
      } else {
        return 'rgba(156, 163, 175, 0.4)';
      }
    });
    
    const borderColors = workProfile.map(period => {
      if (period.status === 'Working') {
        return 'rgb(34, 197, 94)';
      } else {
        return 'rgb(156, 163, 175)';
      }
    });
    
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Work Power (kW)',
          data: data,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0,
          stepped: true,
        },
      ],
    };
    
    console.log('✅ Chart data generated successfully:', labels.length, 'time periods');
    
    return chartData;
  };

  // Chart options
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Work Schedule for CEV ${selectedEV}`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const time = context.label;
            const status = value > 0 ? 'Working' : 'Off';
            return `${time} - ${status}: ${value} kW`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Work Power (kW)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    }
  });

  if (numCEV === 0) {
    return (
      <Alert variant="info">
        <h5>No CEVs Configured</h5>
        <p>Please go back to Step 3 and configure at least one CEV before setting up work schedules.</p>
      </Alert>
    );
  }

  return (
    <div>
      <Alert variant="info" className="mb-4">
        <h5>🔧 CEV Work Schedule Configuration</h5>
        <p>Configure independent work schedules for each CEV. You can create multiple work periods per CEV to represent piecewise functions.</p>
        {timeData.length === 0 && (
          <Alert variant="warning" className="mt-3">
            <strong>⚠️ Using Default Time Data:</strong> Time data hasn't been configured yet (Step 6). 
            The chart below shows a preview using default 30-minute periods. 
            The actual time periods will be updated when you configure time data in Step 6.
          </Alert>
        )}
        <hr />
        <p className="mb-2"><strong>✅ Features:</strong></p>
        <ul className="mb-2">
          <li><strong>Independent Scheduling:</strong> Each CEV can have different work schedules</li>
          <li><strong>Piecewise Functions:</strong> Add multiple work periods per CEV (e.g., 8:00-12:00 and 14:00-17:00)</li>
          <li><strong>Real-time Preview:</strong> See work profile chart as you edit</li>
          <li><strong>Flexible Power:</strong> Set different work power for each period</li>
        </ul>
        <p className="mb-0"><strong>💡 Tip:</strong> Click on any field to edit. Changes are applied immediately.</p>
      </Alert>

      {/* CEV Selection */}
      <Card className="mb-4">
        <Card.Header>
          <h6>🚗 Select CEV to Configure</h6>
        </Card.Header>
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap">
            {Array.from({ length: numCEV }, (_, i) => i + 1).map(ev => (
              <Button
                key={ev}
                variant={selectedEV === ev ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedEV(ev)}
              >
                CEV {ev}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Work Periods Table */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h6>📅 Work Periods for CEV {selectedEV}</h6>
          <Button 
            variant="success" 
            size="sm"
            onClick={() => addWorkPeriod(selectedEV)}
          >
            ➕ Add Work Period
          </Button>
        </Card.Header>
        <Card.Body>
          {(() => {
            const selectedEVSchedules = workSchedules.find(s => s.ev === selectedEV);
            const hasSchedules = selectedEVSchedules && selectedEVSchedules.schedules && selectedEVSchedules.schedules.length > 0;
            
            return hasSchedules ? (
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Work Power (kW)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workSchedules.find(s => s.ev === selectedEV)?.schedules.map(period => (
                    <tr key={period.id}>
                      <td>
                        <Form.Control
                          type="text"
                          value={period.label}
                          onChange={(e) => updateWorkPeriod(selectedEV, period.id, 'label', e.target.value)}
                          size="sm"
                          placeholder="Enter period name"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updateWorkPeriod(selectedEV, period.id, 'startTime', e.target.value)}
                          size="sm"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updateWorkPeriod(selectedEV, period.id, 'endTime', e.target.value)}
                          size="sm"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="0"
                          value={period.workPower}
                          onChange={(e) => updateWorkPeriod(selectedEV, period.id, 'workPower', parseFloat(e.target.value))}
                          size="sm"
                        />
                      </td>
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeWorkPeriod(selectedEV, period.id)}
                        >
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="warning">
                <strong>⚠️ No work periods configured for CEV {selectedEV}</strong><br/>
                Click "Add Work Period" to create a work schedule for this CEV.
              </Alert>
            );
          })()}
        </Card.Body>
      </Card>

      {/* Work Profile Chart */}
      <Card className="mb-4">
        <Card.Header>
          <h6>📊 Work Profile Preview for CEV {selectedEV}</h6>
        </Card.Header>
        <Card.Body>
          <div style={{ height: '300px' }}>
            <Line data={generateChartData()} options={getChartOptions()} />
          </div>
        </Card.Body>
      </Card>

      {/* Summary */}
      <Card className="mb-4">
        <Card.Header>
          <h6>📈 Work Schedule Summary</h6>
        </Card.Header>
        <Card.Body>
          <Row>
            {workSchedules.map(schedule => {
              const totalPeriods = schedule.schedules.length;
              const totalWorkTime = schedule.schedules.reduce((total, period) => {
                const start = new Date(`2000-01-01T${period.startTime}`);
                const end = new Date(`2000-01-01T${period.endTime}`);
                return total + (end - start) / (1000 * 60 * 60); // Convert to hours
              }, 0);
              const totalEnergy = schedule.schedules.reduce((total, period) => {
                const start = new Date(`2000-01-01T${period.startTime}`);
                const end = new Date(`2000-01-01T${period.endTime}`);
                const hours = (end - start) / (1000 * 60 * 60);
                return total + (period.workPower * hours);
              }, 0);

              return (
                <Col md={4} key={schedule.ev} className="mb-3">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <h6>CEV {schedule.ev}</h6>
                      <Badge bg="primary" className="mb-2">{totalPeriods} Periods</Badge>
                      <p className="mb-1"><strong>{totalWorkTime.toFixed(1)}h</strong> Total Work</p>
                      <p className="mb-0"><strong>{totalEnergy.toFixed(1)} kWh</strong> Total Energy</p>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CEVWorkScheduler;

