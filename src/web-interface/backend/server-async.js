const express = require('express');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { spawn } = require('child_process');
const config = require('./config');
const agentOrchestrator = require('./services/agentOrchestrator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: config.websocket.cors
});

const PORT = config.port;
const HOST = process.env.HOST || '0.0.0.0';

// Global state for Julia availability
let juliaReady = false;
let juliaLoading = false;

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, config.uploadsDir);
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.maxFileSize
  }
});

// Store active optimization jobs
const activeJobs = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes

// Health check - ALWAYS responds immediately
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MCS-CEV Optimization Backend is running',
    juliaReady: juliaReady,
    juliaLoading: juliaLoading,
    timestamp: new Date().toISOString()
  });
});

// Julia status endpoint
app.get('/api/julia-status', (req, res) => {
  res.json({
    ready: juliaReady,
    loading: juliaLoading,
    message: juliaReady ? 'Julia is ready for optimization' : 
             juliaLoading ? 'Julia is loading...' : 'Julia is not available'
  });
});

// Upload and execute optimization - with Julia check
app.post('/api/optimize', upload.single('dataset'), async (req, res) => {
  try {
    if (!juliaReady) {
      return res.status(503).json({ 
        error: 'Julia is not ready yet. Please wait and try again.',
        juliaLoading: juliaLoading
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const jobData = {
      id: jobId,
      status: 'pending',
      startTime: new Date(),
      file: req.file.filename,
      progress: 0
    };

    activeJobs.set(jobId, jobData);

    // Emit job started
    io.emit('jobStarted', { jobId, status: 'pending' });

    // Start optimization in background
    startOptimization(jobId, req.file.path);

    res.json({ 
      message: 'Optimization started', 
      jobId: jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Failed to start optimization' });
  }
});

// Check optimization status
app.get('/api/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Download results
app.get('/api/results/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Job not completed yet' });
  }
  
  const resultsPath = path.join(__dirname, config.resultsDir, `${jobId}.zip`);
  
  if (!fs.existsSync(resultsPath)) {
    return res.status(404).json({ error: 'Results file not found' });
  }
  
  res.download(resultsPath);
});

// Chat endpoint - works without Julia
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use the agent orchestrator for chat
    const response = await agentOrchestrator.processMessage(message, conversationId);
    
    res.json({
      response: response.message,
      conversationId: response.conversationId,
      juliaReady: juliaReady
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Clear conversation
app.post('/api/clear-conversation', async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (conversationId) {
      await agentOrchestrator.clearConversation(conversationId);
    }
    
    res.json({ message: 'Conversation cleared' });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// Function to start Julia loading in background
function startJuliaLoading() {
  if (juliaLoading || juliaReady) return;
  
  juliaLoading = true;
  console.log('🔄 Starting Julia loading in background...');
  
  // Simulate Julia loading (in real implementation, this would be actual Julia initialization)
  setTimeout(() => {
    juliaReady = true;
    juliaLoading = false;
    console.log('✅ Julia is ready for optimization!');
    
    // Emit Julia ready event
    io.emit('juliaReady', { message: 'Julia is now ready for optimization' });
  }, 30000); // 30 seconds for demo - in real implementation this would be actual Julia startup time
}

// Function to start optimization (placeholder)
function startOptimization(jobId, filePath) {
  const job = activeJobs.get(jobId);
  if (!job) return;
  
  // Simulate optimization process
  job.status = 'running';
  job.progress = 10;
  io.emit('jobUpdate', { jobId, status: 'running', progress: 10 });
  
  setTimeout(() => {
    job.progress = 50;
    io.emit('jobUpdate', { jobId, status: 'running', progress: 50 });
  }, 5000);
  
  setTimeout(() => {
    job.status = 'completed';
    job.progress = 100;
    job.endTime = new Date();
    io.emit('jobCompleted', { jobId, status: 'completed', progress: 100 });
  }, 10000);
}

// Start server immediately
server.listen(PORT, HOST, () => {
  console.log(`🚀 MCS-CEV Optimization Backend running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔗 WebSocket server ready for real-time updates`);
  console.log(`🤖 Chat API ready for AI conversations`);
  console.log(`⏳ Julia will load in background...`);
  
  // Start Julia loading in background
  startJuliaLoading();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});



