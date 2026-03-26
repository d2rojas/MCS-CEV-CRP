import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, ProgressBar, Badge, Spinner } from 'react-bootstrap';
import { io } from 'socket.io-client';
import getBackendUrl from '../utils/api';

const OptimizationProgress = ({ generatedFiles, onOptimizationSuccess, onNext }) => {
  const [currentJob, setCurrentJob] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLogs, setOptimizationLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [socket, setSocket] = useState(null);
  const successCalledRef = React.useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(getBackendUrl());
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);


  // Polling mechanism as backup for job status
  useEffect(() => {
    if (!currentJob || !isOptimizing) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('🔍 Polling job status for:', currentJob.id);
        const response = await fetch(`${getBackendUrl()}/api/job/${currentJob.id}`);
        
        if (response.ok) {
          const jobData = await response.json();
          
          // Only log status changes
          if (jobData.status !== currentJob.status) {
            console.log('📊 Status changed from', currentJob.status, 'to', jobData.status);
          }
          
          if (jobData.status !== currentJob.status) {
            setCurrentJob(prev => ({ ...prev, ...jobData }));
            
            // Add log entry for status change
            setOptimizationLogs(prev => [...prev, {
              timestamp: new Date(),
              message: `Status changed to: ${jobData.status}`,
              type: 'info'
            }]);
            
            // Check if job is completed - show button for user to click
            if (jobData.status === 'completed') {
              console.log('🎉 Job completed! Showing View Results button...');
              console.log('🔍 Job data:', jobData);
              setIsOptimizing(false);
              setProgress(100);

              // Call success callback to enable the button (but don't auto-navigate)
              if (onOptimizationSuccess && !successCalledRef.current) {
                successCalledRef.current = true;
                const jobId = jobData.jobId || jobData.id;
                console.log('🔍 Using jobId:', jobId);
                onOptimizationSuccess(jobId);
              }
            } else if (jobData.status === 'failed') {
              setIsOptimizing(false);
              
              // Add failure log without clearing existing logs
              setOptimizationLogs(prev => [...prev, {
                timestamp: new Date(),
                message: `❌ Optimization failed: ${jobData.message || 'Unknown error'}`,
                type: 'error'
              }]);
              
              setMessage({
                type: 'danger',
                text: `❌ Optimization failed: ${jobData.message || 'Unknown error'}`
              });
            }
          }
          
          // Update progress if available
          if (jobData.progress !== undefined && jobData.progress !== currentJob.progress) {
            setProgress(jobData.progress);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 1000); // Poll every 1 second (more aggressive)

    return () => clearInterval(pollInterval);
  }, [currentJob, isOptimizing, onOptimizationSuccess]);

  // Auto-start optimization when component mounts
  useEffect(() => {
    if (generatedFiles && Object.keys(generatedFiles).length > 0) {
      startOptimization();
    }
  }, [generatedFiles]);

  // Listen for real Julia logs via WebSocket (from job-status events)
  useEffect(() => {
    if (!socket || !currentJob) return;

    socket.on('job-status', (data) => {
      // Only log important events
      if (data.log && (data.log.includes('Julia process exited') || data.log.includes('Optimization completed'))) {
        console.log('🔍 Important event received:', data.log.trim());
      }
      
      if (data.jobId === currentJob.id) {
        // Update job status
        setCurrentJob(prev => ({ ...prev, ...data }));
        
        // Update progress
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }
        
        // Add real Julia log if available
        if (data.log) {
          const logMessage = data.log.trim();
          setOptimizationLogs(prev => [...prev, {
            timestamp: new Date(),
            message: logMessage,
            type: 'info'
          }]);
          
          // Check if Julia has completed - show button for user to click
          if (logMessage.includes('Julia process exited with code 0')) {
            console.log('🎉 Optimization completed! Showing View Results button...');
            console.log('🔍 Julia completion data:', data);

            // Call success callback to enable the button (but don't auto-navigate)
            if (onOptimizationSuccess && !successCalledRef.current) {
              successCalledRef.current = true;
              const jobId = data.jobId || data.id;
              console.log('🔍 Using Julia completion jobId:', jobId);
              onOptimizationSuccess(jobId);
            }
          }
        }
        
        // Check if job is completed - show button for user to click
        if (data.status === 'completed') {
          console.log('🎉 Job completed via WebSocket! Showing View Results button...');
          console.log('🔍 WebSocket data:', data);
          setIsOptimizing(false);
          setProgress(100);

          // Call success callback to enable the button (but don't auto-navigate)
          if (onOptimizationSuccess && !successCalledRef.current) {
            successCalledRef.current = true;
            const jobId = data.jobId || data.id;
            console.log('🔍 Using WebSocket jobId:', jobId);
            onOptimizationSuccess(jobId);
          }
        } else if (data.status === 'error') {
          setIsOptimizing(false);
          
          // Add error log
          setOptimizationLogs(prev => [...prev, {
            timestamp: new Date(),
            message: `❌ Error: ${data.message}`,
            type: 'error'
          }]);
          
          setMessage({
            type: 'danger',
            text: `❌ Error: ${data.message}`
          });
        }
      }
    });

    return () => {
      socket.off('job-status');
    };
  }, [socket, currentJob, onOptimizationSuccess]);

  const startOptimization = async () => {
    console.log('🚀 Starting optimization with generated files...');
    setIsOptimizing(true);
    setProgress(0);
    setOptimizationLogs([]);
    setMessage({ type: '', text: '' });
    successCalledRef.current = false;

    try {
      // Use the ZIP blob directly if available, otherwise create from CSV files
      let zipBlob;
      
      if (generatedFiles.zipBlob) {
        // Use the pre-generated ZIP blob
        zipBlob = generatedFiles.zipBlob;
        console.log('🔍 Using pre-generated ZIP blob');
      } else {
        // Fallback: Create ZIP from CSV files (old method)
        console.log('🔍 Creating ZIP from CSV files (fallback)');
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Create csv_files folder
        const csvFolder = zip.folder('csv_files');
        
        // Add all CSV files to the folder
        Object.entries(generatedFiles).forEach(([filename, content]) => {
          csvFolder.file(filename, content);
        });
        
        // Generate ZIP blob
        zipBlob = await zip.generateAsync({ type: 'blob' });
      }
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('dataset', zipBlob, 'generated_files.zip');

      setMessage({
        type: 'info',
        text: '🚀 Starting optimization...'
      });

      const response = await fetch(`${getBackendUrl()}/api/optimize`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentJob({
          id: result.jobId,
          status: 'running',
          progress: 0,
          startTime: new Date()
        });
        
        setMessage({
          type: 'success',
          text: `✅ Optimization started! Job ID: ${result.jobId.substring(0, 8)}...`
        });
        
        // Join the job room for real-time updates
        if (socket) {
          socket.emit('join-job', result.jobId);
        }
        
        // Add initial log
        setOptimizationLogs([{
          timestamp: new Date(),
          message: 'Optimization job started successfully',
          type: 'info'
        }]);
        
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start optimization');
      }
    } catch (error) {
      console.error('Error starting optimization:', error);
      setIsOptimizing(false);
      setMessage({
        type: 'danger',
        text: `❌ Error starting optimization: ${error.message}`
      });
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    return isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleTimeString();
  };

  return (
    <div>
      <h3>🚀 Running Optimization</h3>
      <p className="text-muted">
        Your optimization is in progress. Please wait while the system processes your scenario.
      </p>

      {/* Status Card */}
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              {isOptimizing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Optimization Running...
                </>
              ) : currentJob?.status === 'completed' ? (
                <>
                  ✅ Optimization Complete
                </>
              ) : (
                <>
                  ⏳ Optimization Status
                </>
              )}
            </h5>
            {currentJob && (
              <Badge bg={
                currentJob.status === 'completed' ? 'success' :
                currentJob.status === 'running' ? 'primary' :
                currentJob.status === 'failed' ? 'danger' : 'secondary'
              }>
                {currentJob.status}
              </Badge>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          {currentJob && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span><strong>Job ID:</strong> {currentJob.id.substring(0, 8)}...</span>
                <span><strong>Started:</strong> {formatTime(currentJob.startTime)}</span>
              </div>
              
              {isOptimizing && (
                <div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <ProgressBar 
                    now={progress} 
                    variant="primary"
                    animated
                    label={`${Math.round(progress)}%`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {message.text && (
            <Alert variant={message.type} className="mb-3">
              {message.text}
            </Alert>
          )}

          {/* Action Buttons */}
          {currentJob?.status === 'completed' && (
            <div className="text-center">
              <div className="d-flex gap-3 justify-content-center">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={onNext}
                >
                  📊 View Results →
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="lg"
                  onClick={async () => {
                    try {
                      console.log('📥 Downloading results for job:', currentJob.id);
                      const response = await fetch(`${getBackendUrl()}/api/job/${currentJob.id}/download`);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `optimization_results_${currentJob.id.substring(0, 8)}.zip`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        console.log('✅ Results downloaded successfully');
                      } else {
                        console.error('❌ Failed to download results');
                      }
                    } catch (error) {
                      console.error('❌ Error downloading results:', error);
                    }
                  }}
                >
                  📥 Download Results
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Optimization Logs */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">📋 Optimization Logs</h5>
        </Card.Header>
        <Card.Body>
          {optimizationLogs.length === 0 ? (
            <div className="text-center text-muted py-3">
              <p>Waiting for optimization to start...</p>
            </div>
          ) : (
            <div className="optimization-logs" style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              fontFamily: 'monospace',
              fontSize: '0.9em'
            }}>
              {optimizationLogs.map((log, index) => (
                <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-danger' : 'text-dark'}`}>
                  <span className="text-muted">[{formatTime(log.timestamp)}]</span> {log.message}
                </div>
              ))}
              {isOptimizing && (
                <div className="text-primary">
                  <span className="text-muted">[{formatTime(new Date())}]</span> 
                  <Spinner animation="grow" size="sm" className="ms-2" />
                  <span className="ms-2">Processing...</span>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default OptimizationProgress;
