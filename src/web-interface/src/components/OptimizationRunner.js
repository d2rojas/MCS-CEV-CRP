import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, ProgressBar, Badge, Table, Modal } from 'react-bootstrap';
import { io } from 'socket.io-client';
import getBackendUrl from '../utils/api';

const OptimizationRunner = ({ onOptimizationSuccess, generatedFiles }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [socket, setSocket] = useState(null);
  const fileInputRef = useRef(null);

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

  // Listen for job status updates
  useEffect(() => {
    if (!socket) return;

    socket.on('job-status', (data) => {
      console.log('🔍 Job status update received:', data);
      setJobs(prevJobs => {
        const updatedJobs = prevJobs.map(job => 
          job.id === data.jobId 
            ? { ...job, ...data }
            : job
        );
        
        // If job not found, add it
        if (!updatedJobs.find(job => job.id === data.jobId)) {
          updatedJobs.push({
            id: data.jobId,
            fileName: 'Unknown',
            status: data.status,
            progress: data.progress,
            message: data.message,
            startTime: new Date(),
            ...data
          });
        }
        
        // Check if job is completed and call success callback
        if (data.status === 'completed' && onOptimizationSuccess) {
          console.log('🎉 Job completed! Calling success callback...');
          setTimeout(() => {
            console.log('🚀 Executing onOptimizationSuccess callback');
            onOptimizationSuccess(data.jobId);
          }, 2000); // Wait 2 seconds to show completion message
        }
        
        return updatedJobs;
      });
    });

    return () => {
      socket.off('job-status');
    };
  }, [socket, onOptimizationSuccess]);

  // Load existing jobs on component mount
  useEffect(() => {
    loadJobs();
  }, []);

  // Auto-start optimization if generatedFiles are provided
  useEffect(() => {
    console.log('🔍 GeneratedFiles effect triggered:', generatedFiles);
    if (generatedFiles && Object.keys(generatedFiles).length > 0) {
      console.log('🚀 Starting optimization with generated files...');
      startOptimizationWithGeneratedFiles();
    }
  }, [generatedFiles]);

  const loadJobs = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/jobs`);
      if (response.ok) {
        const jobsData = await response.json();
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      setMessage({
        type: 'danger',
        text: 'Error loading optimization jobs'
      });
    }
  };

  const startOptimizationWithGeneratedFiles = async () => {
    console.log('🔍 startOptimizationWithGeneratedFiles called with:', generatedFiles);
    if (!generatedFiles || Object.keys(generatedFiles).length === 0) {
      console.log('❌ No generated files to process');
      return;
    }

    console.log('🚀 Starting optimization with generated files...');
    setIsUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Create a ZIP file from generated files
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Create csv_files folder
      const csvFolder = zip.folder('csv_files');
      
      // Add all CSV files to the folder
      const csvFiles = generatedFiles.csvFiles || generatedFiles;
      Object.entries(csvFiles).forEach(([filename, content]) => {
        if (typeof content === 'string') {
          csvFolder.file(filename, content);
        }
      });

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('dataset', zipBlob, 'generated_files.zip');

      const response = await fetch(`${getBackendUrl()}/api/optimize`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: 'success',
          text: `🚀 Optimization started automatically! Job ID: ${result.jobId}`
        });
        
        // Join the job room for real-time updates
        if (socket) {
          socket.emit('join-job', result.jobId);
        }
        
        // Reload jobs to show the new one
        setTimeout(loadJobs, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start optimization');
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error starting optimization: ${error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setMessage({ type: '', text: '' });
    } else {
      setMessage({
        type: 'warning',
        text: 'Please select a valid ZIP file containing optimization dataset'
      });
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({
        type: 'warning',
        text: 'Please select a file to upload'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('dataset', selectedFile);

    try {
      const response = await fetch(`${getBackendUrl()}/api/optimize`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: 'success',
          text: `Optimization job started successfully! Job ID: ${result.jobId}`
        });
        
        // Join the job room for real-time updates
        if (socket) {
          socket.emit('join-job', result.jobId);
        }
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Reload jobs to show the new one
        setTimeout(loadJobs, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error starting optimization: ${error.message}`
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadResults = async (jobId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/job/${jobId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optimization_results_${jobId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({
          type: 'success',
          text: 'Results downloaded successfully!'
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `Error downloading results: ${error.message}`
      });
    }
  };

  const handleViewJobDetails = (job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      uploading: { variant: 'info', text: 'Uploading' },
      extracting: { variant: 'info', text: 'Extracting' },
      preparing: { variant: 'warning', text: 'Preparing' },
      running: { variant: 'primary', text: 'Running' },
      completed: { variant: 'success', text: 'Completed' },
      error: { variant: 'danger', text: 'Error' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  return (
    <div>
      <Card className="mb-4">
        <Card.Header className="bg-gradient-primary text-white">
          <h4 className="mb-0">🚀 Run Optimization</h4>
        </Card.Header>
        <Card.Body>
          <div className="row">
            <div className="col-md-8">
              <div className="mb-3">
                <label className="form-label">Select Optimization Dataset (ZIP file)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="form-text">
                  Upload a ZIP file containing CSV files generated by the interface
                </div>
              </div>
              
              {selectedFile && (
                <div className="mb-3">
                  <Alert variant="info">
                    <strong>Selected file:</strong> {selectedFile.name} 
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Alert>
                </div>
              )}
              
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="me-2"
              >
                {isUploading ? 'Starting Optimization...' : '🚀 Start Optimization'}
              </Button>
              
              <Button
                variant="outline-secondary"
                onClick={loadJobs}
                disabled={isUploading}
              >
                🔄 Refresh Jobs
              </Button>
            </div>
            
            <div className="col-md-4">
              <Card className="bg-light">
                <Card.Body>
                  <h6>💡 How it works:</h6>
                  <ol className="small">
                    <li>Upload your generated dataset ZIP file</li>
                    <li>The system will extract and validate your data</li>
                    <li>Julia optimization will run automatically</li>
                    <li>Monitor progress in real-time</li>
                    <li>Download results when complete</li>
                  </ol>
                </Card.Body>
              </Card>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Messages */}
      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Jobs Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Optimization Jobs</h5>
        </Card.Header>
        <Card.Body>
          {jobs.length === 0 ? (
            <div className="text-center text-muted py-4">
              <p>No optimization jobs found</p>
              <p className="small">Upload a dataset to start your first optimization</p>
            </div>
          ) : (
            <Table responsive striped>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <code className="small">{job.id.substring(0, 8)}...</code>
                    </td>
                    <td>{job.fileName}</td>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>
                      {job.status === 'running' || job.status === 'completed' ? (
                        <ProgressBar 
                          now={job.progress} 
                          label={`${job.progress}%`}
                          variant={job.status === 'completed' ? 'success' : 'primary'}
                        />
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{formatDate(job.startTime)}</td>
                    <td>{formatDuration(job.startTime)}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewJobDetails(job)}
                        >
                          📋 Details
                        </Button>
                        {job.status === 'completed' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleDownloadResults(job.id)}
                            >
                              📥 Download
                            </Button>
                            {onOptimizationSuccess && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  console.log('🚀 Manual trigger: Moving to results for job:', job.id);
                                  onOptimizationSuccess(job.id);
                                }}
                              >
                                📊 View Results
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Job Details Modal */}
      <Modal show={showJobModal} onHide={() => setShowJobModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Job Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJob && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Job ID:</strong> <code>{selectedJob.id}</code>
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong> {getStatusBadge(selectedJob.status)}
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>File:</strong> {selectedJob.fileName}
                </div>
                <div className="col-md-6">
                  <strong>Started:</strong> {formatDate(selectedJob.startTime)}
                </div>
              </div>
              
              <div className="mb-3">
                <strong>Message:</strong>
                <div className="mt-1 p-2 bg-light rounded">
                  {selectedJob.message}
                </div>
              </div>
              
              {selectedJob.status === 'running' && (
                <div className="mb-3">
                  <strong>Progress:</strong>
                  <ProgressBar 
                    now={selectedJob.progress} 
                    label={`${selectedJob.progress}%`}
                    className="mt-1"
                  />
                </div>
              )}
              
              {selectedJob.results && (
                <div className="mb-3">
                  <strong>Results:</strong>
                  <div className="mt-1 p-2 bg-light rounded">
                    <pre className="mb-0 small">{JSON.stringify(selectedJob.results, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {selectedJob.error && (
                <div className="mb-3">
                  <strong>Error:</strong>
                  <Alert variant="danger" className="mt-1">
                    {selectedJob.error}
                  </Alert>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJobModal(false)}>
            Close
          </Button>
          {selectedJob && selectedJob.status === 'completed' && (
            <Button 
              variant="primary" 
              onClick={() => {
                handleDownloadResults(selectedJob.id);
                setShowJobModal(false);
              }}
            >
              📥 Download Results
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OptimizationRunner;
