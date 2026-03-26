import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Modal, Spinner } from 'react-bootstrap';
import getBackendUrl from '../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin
);

const InteractiveChartViewer = ({ charts }) => {
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [availableCharts, setAvailableCharts] = useState([]);

  // Load all available chart data when component mounts or charts change
  useEffect(() => {
    console.log('📊 InteractiveChartViewer received charts:', charts?.length || 0);
    console.log('📊 InteractiveChartViewer charts data:', charts);
    if (charts && charts.length > 0) {
      loadAllChartData();
    }
  }, [charts]);

  const loadAllChartData = async () => {
    setLoading(true);
    const newChartData = {};
    const chartsWithData = [];

    for (const chart of charts) {
      // Skip MCS power profile charts as they're not needed
      if (chart.name.includes('mcs_') && chart.name.includes('power_profile')) {
        continue;
      }
      
      if (chart.type === 'INTERACTIVE' && chart.csvDataUrl) {
        try {
          const response = await fetch(`${getBackendUrl()}${chart.csvDataUrl}`);
          if (response.ok) {
            const csvText = await response.text();
            const data = parseCSV(csvText);
            const chartInfo = getChartInfo(chart.name);
            const processedData = processChartData(data, chart.name, chartInfo);
            
            if (processedData && processedData.datasets && processedData.datasets.length > 0) {
              newChartData[chart.name] = processedData;
              chartsWithData.push(chart);
            }
          }
        } catch (error) {
          console.error(`Error loading data for ${chart.name}:`, error);
        }
      }
    }

    setChartData(newChartData);
    setAvailableCharts(chartsWithData);
    setLoading(false);
  };

  const chartTypes = {
    '01_total_grid_power_profile': {
      title: 'Total Grid Power Profile',
      description: 'Power consumption from the grid over time',
      icon: '⚡',
      color: '#007bff',
      type: 'bar',
      yAxisLabel: 'Power (kW)',
      xAxisLabel: 'Time'
    },
    '02_work_profiles_by_site': {
      title: 'Work Profiles by Site',
      description: 'Work power requirements over time at construction sites',
      icon: '🏗️',
      color: '#28a745',
      type: 'line',
      yAxisLabel: 'Work Power (kW)',
      xAxisLabel: 'Time'
    },
    '03_mcs_state_of_energy': {
      title: 'MCS State of Energy',
      description: 'Battery state of energy for Mobile Charging Stations',
      icon: '🔋',
      color: '#ffc107',
      type: 'line',
      yAxisLabel: 'Energy (kWh)',
      xAxisLabel: 'Time'
    },
    '04_cev_state_of_energy': {
      title: 'CEV State of Energy',
      description: 'Battery state of energy for Construction Electric Vehicles',
      icon: '🚗',
      color: '#17a2b8',
      type: 'line',
      yAxisLabel: 'Energy (kWh)',
      xAxisLabel: 'Time'
    },
    '05_electricity_prices': {
      title: 'Electricity Prices & Emissions',
      description: 'Time-varying electricity prices and CO2 emission factors',
      icon: '💰',
      color: '#6c757d',
      type: 'line',
      yAxisLabel: 'Price ($/kWh)',
      xAxisLabel: 'Time',
      dualYAxis: true
    },
    '06_mcs_location_trajectory': {
      title: 'MCS Location Trajectory',
      description: 'Movement patterns of Mobile Charging Stations',
      icon: '🗺️',
      color: '#343a40',
      type: 'line',
      yAxisLabel: 'Location Type',
      xAxisLabel: 'Time'
    },
    '07_node_map_with_cev_assignments': {
      title: 'Node Map with CEV Assignments',
      description: 'Geographic layout of nodes and CEV assignments',
      icon: '📍',
      color: '#dc3545',
      type: 'bar',
      yAxisLabel: 'Assignments',
      xAxisLabel: 'Nodes'
    },
    '08_optimization_summary': {
      title: 'Optimization Summary',
      description: 'Overall optimization results and key metrics',
      icon: '📊',
      color: '#007bff',
      type: 'bar',
      yAxisLabel: 'Metrics',
      xAxisLabel: 'Categories'
    }
  };

  const getChartInfo = (chartName) => {
    return chartTypes[chartName] || {
      title: chartName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Optimization visualization',
      icon: '📈',
      color: '#007bff',
      type: 'line',
      yAxisLabel: 'Value',
      xAxisLabel: 'Time'
    };
  };



  const parseCSV = (csvText) => {
    const Papa = require('papaparse');
    const result = Papa.parse(csvText.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });
    return result.data;
  };

  const processChartData = (data, chartName, chartInfo) => {
    if (data.length === 0) return null;

    const datasets = [];
    const labels = [];

    // Find the time column (prioritize Time_Label, then other time columns)
    const timeColumn = Object.keys(data[0]).find(key => 
      key.toLowerCase() === 'time_label'
    ) || Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('time') && !key.toLowerCase().includes('period')
    ) || Object.keys(data[0])[0]; // fallback to first column

    // Extract time labels from the time column
    if (timeColumn) {
      labels.push(...data.map(row => row[timeColumn]));
    }

    // Create datasets for each data column (excluding the time column, net power, and location type)
    const dataColumns = Object.keys(data[0]).filter(column => 
      column !== timeColumn && 
      !column.toLowerCase().includes('time_period') &&
      !column.toLowerCase().includes('net_power') && // Exclude net power
      !column.toLowerCase().includes('location_type') // Exclude location type (text data)
    );
    
    dataColumns.forEach((column, index) => {
      const color = getColorForDataset(index, chartInfo.color);
      
      // Clean up the label for better display
      let cleanLabel = column;
      if (column.includes('_')) {
        // Special handling for power-related columns
        if (column === 'Net_Power_kW') {
          cleanLabel = 'Net Power (kW)';
        } else if (column === 'Total_Charging_Power_kW') {
          cleanLabel = 'Total Charging Power (kW)';
        } else if (column === 'Total_Discharging_Power_kW') {
          cleanLabel = 'Total Discharging Power (kW)';
        } else if (column === 'Site_2_Work_Power_kW') {
          cleanLabel = 'Site 2 Work Power (kW)';
        } else if (column === 'Total_Work_Power_kW') {
          cleanLabel = 'Total Work Power (kW)';
        } else if (column.includes('Max_SOE_kWh')) {
          const prefix = column.split('_')[0]; // MCS_1 or CEV_1
          cleanLabel = `${prefix} Max SOE (kWh)`;
        } else if (column.includes('Min_SOE_kWh')) {
          const prefix = column.split('_')[0]; // MCS_1 or CEV_1
          cleanLabel = `${prefix} Min SOE (kWh)`;
        } else if (column === 'Electricity_Price_USD_per_kWh') {
          cleanLabel = 'Electricity Price ($/kWh)';
        } else if (column === 'CO2_Emission_Factor_kg_CO2_per_kWh') {
          cleanLabel = 'CO2 Emissions (kg CO2/kWh)';
        } else if (column === 'MCS_1_Location') {
          cleanLabel = 'MCS 1 Current Location';
        } else {
          cleanLabel = column.split('_').slice(1).join(' '); // Remove prefix like "CEV_1_"
        }
      }
      
      // Check if this is a main SOE column (not min/max)
      const isMainSOE = column.includes('SOE_kWh') && !column.includes('Max_') && !column.includes('Min_');
      
      // Check if this is a location column (should have points)
      const isLocationColumn = column.includes('Location');
      
      // Determine which Y axis to use for dual axis charts
      const yAxisID = chartInfo.dualYAxis && column.toLowerCase().includes('co2') ? 'y1' : 'y';
      
      datasets.push({
        label: cleanLabel,
        data: data.map(row => {
          const value = parseFloat(row[column]);
          // Make discharging power always negative for better visualization
          if (column.toLowerCase().includes('discharging')) {
            return isNaN(value) ? 0 : -Math.abs(value);
          }
          return isNaN(value) ? 0 : value;
        }),
        borderColor: color,
        backgroundColor: chartInfo.type === 'bar' ? color + '80' : color + '20', // More opacity for bars
        borderWidth: chartInfo.type === 'bar' ? 1 : 2,
        fill: chartInfo.type === 'line' ? false : true,
        tension: 0.4,
        pointRadius: isMainSOE || isLocationColumn ? 4 : 0, // Points for SOE and location lines
        pointHoverRadius: isMainSOE || isLocationColumn ? 8 : 0,
        borderDash: column.includes('Max_') || column.includes('Min_') ? [5, 5] : [], // Dashed lines for min/max
        borderWidth: column.includes('Max_') || column.includes('Min_') ? 1 : (chartInfo.type === 'bar' ? 1 : 2), // Thinner lines for min/max
        yAxisID: yAxisID // Assign to appropriate Y axis
      });
    });

    return {
      labels,
      datasets,
      chartInfo
    };
  };

  const getColorForDataset = (index, baseColor) => {
    // Enhanced color palette with better contrast for bar charts
    const colors = [
      '#2E86AB', // Deep Blue
      '#A23B72', // Deep Pink
      '#F18F01', // Orange
      '#C73E1D', // Red
      '#3B1F2B', // Dark Purple
      '#1B998B', // Teal
      '#F4A261', // Light Orange
      '#E76F51', // Coral
      '#264653', // Dark Blue-Green
      '#E9C46A'  // Gold
    ];
    return colors[index % colors.length];
  };

  const handleChartClick = (chart) => {
    setSelectedChart(chart);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedChart(null);
  };

  const renderChart = (chart) => {
    const data = chartData[chart.name];
    const chartInfo = getChartInfo(chart.name);

    if (!data) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">Chart data not available</p>
        </div>
      );
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: chartInfo.title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        annotation: {
          annotations: {
            zeroLine: {
              type: 'line',
              yMin: 0,
              yMax: 0,
              borderColor: '#666666',
              borderWidth: 2,
              borderDash: [],
              label: {
                content: 'Zero Line',
                enabled: false
              }
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'x',
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: chartInfo.xAxisLabel
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: chartInfo.yAxisLabel
          },
          // Force zero line to be visible
          beginAtZero: true,
          grid: {
            drawBorder: true,
            color: '#e0e0e0'
          },
          // Custom labels for location trajectory
          ticks: chartInfo.title === 'MCS Location Trajectory' ? {
            callback: function(value) {
              if (value === 1) return 'Node Grid';
              if (value === 2) return 'Construction Site 1';
              return value;
            },
            stepSize: 1, // Only show integer values
            min: 0,
            max: 3
          } : undefined
        },
        y1: chartInfo.dualYAxis ? {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'CO2 Emissions (kg CO2/kWh)'
          },
          grid: {
            drawOnChartArea: false,
          },
        } : undefined
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    const ChartComponent = chartInfo.type === 'bar' ? Bar : Line;

    return (
      <div style={{ height: '300px' }}>
        <ChartComponent data={data} options={options} />
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="text-muted">Loading interactive charts...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!availableCharts || availableCharts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center text-muted">
          <p>No interactive charts available</p>
          <small>Only charts with CSV data are displayed</small>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="interactive-chart-viewer">
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">📈 Interactive Charts</h5>
            <Badge bg="info">{availableCharts.length} charts with data</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            {availableCharts.map((chart, index) => {
              const chartInfo = getChartInfo(chart.name);
              return (
                <Col key={index} lg={6} xl={6} className="mb-4">
                  <Card 
                    className="chart-card h-100 border-0 shadow-sm"
                    onClick={() => handleChartClick(chart)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-center mb-3">
                        <div className={`chart-icon bg-${chartInfo.color} text-white rounded-circle d-flex align-items-center justify-content-center me-3`} 
                             style={{ width: '40px', height: '40px', fontSize: '18px' }}>
                          {chartInfo.icon}
                        </div>
                        <div>
                          <h6 className="mb-1">{chartInfo.title}</h6>
                          <small className="text-muted">{chartInfo.description}</small>
                        </div>
                      </div>
                      
                      <div className="chart-container">
                        {renderChart(chart)}
                      </div>
                      
                      <div className="chart-meta mt-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            Interactive Chart
                          </small>
                          <Badge bg={chartInfo.color} size="sm">
                            {chartInfo.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card.Body>
      </Card>

      {/* Modal for full-size chart view */}
      <Modal 
        show={showModal} 
        onHide={closeModal}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedChart && getChartInfo(selectedChart.name).title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedChart && (
            <div style={{ height: '500px' }}>
              {renderChart(selectedChart)}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              <small className="text-muted">
                {selectedChart && getChartInfo(selectedChart.name).description}
              </small>
            </div>
            <div>
              {selectedChart && selectedChart.downloadUrl && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  href={selectedChart.downloadUrl}
                  download
                >
                  📥 Download PNG
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InteractiveChartViewer;
