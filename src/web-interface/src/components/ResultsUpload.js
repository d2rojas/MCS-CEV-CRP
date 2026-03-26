import React, { useState, useRef } from 'react';
import { Card, Button, Alert, Row, Col } from 'react-bootstrap';

const ResultsUpload = ({ onUpload, isLoading, progress }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setError(null);
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a ZIP file containing optimization results.');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="results-upload">
      <div className="mb-3">
        <label className="form-label">Select Optimization Results (ZIP file)</label>
        <input
          ref={fileInputRef}
          type="file"
          className="form-control"
          accept=".zip"
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <div className="form-text">
          Upload a ZIP file containing optimization results (charts, logs, CSV data)
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
        disabled={!selectedFile || isLoading}
        className="me-2"
      >
        {isLoading ? 'Processing Results...' : '📊 Load Results'}
      </Button>
      
      {selectedFile && (
        <Button
          variant="outline-secondary"
          onClick={clearSelection}
          disabled={isLoading}
        >
          Clear Selection
        </Button>
      )}

      {error && (
        <Alert variant="danger" className="mt-3" dismissible onClose={() => setError(null)}>
          <strong>Error:</strong> {error}
        </Alert>
      )}
    </div>
  );
};

export default ResultsUpload;
