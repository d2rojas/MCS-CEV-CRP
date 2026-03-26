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

  // Join a specific job room for status updates
  socket.on('join-job', (jobId) => {
    socket.join(jobId);
    console.log(`Client ${socket.id} joined job ${jobId}`);
  });
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MCS-CEV Optimization Backend is running' });
});

// Upload and execute optimization
app.post('/api/optimize', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const fileName = req.file.originalname;
    const filePath = req.file.path;

    console.log(`Starting optimization job ${jobId} with file: ${fileName}`);

    // Create job entry
    activeJobs.set(jobId, {
      id: jobId,
      fileName: fileName,
      status: 'uploading',
      progress: 0,
      message: 'Processing uploaded file...',
      startTime: new Date(),
      results: null,
      error: null
    });

    // Send response immediately (fire-and-forget pattern)
    res.json({
      jobId: jobId,
      message: 'Optimization job started successfully',
      status: 'started'
    });

    // Process the uploaded file asynchronously (no await — non-blocking)
    processOptimizationJob(jobId, filePath, fileName);

  } catch (error) {
    console.error('Error starting optimization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/api/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Get all active jobs
app.get('/api/jobs', (req, res) => {
  const jobs = Array.from(activeJobs.values()).map(job => ({
    id: job.id,
    fileName: job.fileName,
    status: job.status,
    progress: job.progress,
    message: job.message,
    startTime: job.startTime
  }));
  
  res.json(jobs);
});

// Download results
app.get('/api/job/:jobId/download', async (req, res) => {
  const jobId = req.params.jobId;
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Job not completed yet' });
  }
  
  try {
    // Find the results directory in the optimization dataset
    const optimizationDir = path.join(__dirname, 'datasets', `optimization_${jobId}`);
    const resultsPath = path.join(optimizationDir, 'results');
    const zipPath = path.join(__dirname, 'results', `${jobId}_results.zip`);
    
    // Check if results directory exists
    if (!await fs.pathExists(resultsPath)) {
      return res.status(404).json({ error: 'Results not found' });
    }
    
    // Create ZIP file of results
    await createResultsZip(resultsPath, zipPath);
    
    res.download(zipPath, `optimization_results_${jobId}.zip`, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Clean up ZIP file after download
      fs.remove(zipPath).catch(console.error);
    });
    
  } catch (error) {
    console.error('Error creating download:', error);
    res.status(500).json({ error: 'Error creating download' });
  }
});

// Clean up completed jobs (older than 24 hours)
app.delete('/api/jobs/cleanup', async (req, res) => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;
    
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.status === 'completed' && job.startTime < cutoffTime) {
        activeJobs.delete(jobId);
        
        // Clean up files
        const jobDir = path.join(__dirname, 'results', jobId);
        await fs.remove(jobDir).catch(console.error);
        
        cleanedCount++;
      }
    }
    
    res.json({ message: `Cleaned up ${cleanedCount} old jobs` });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({ error: 'Error cleaning up jobs' });
  }
});

// Helper function to process optimization job
async function processOptimizationJob(jobId, filePath, fileName) {
  const job = activeJobs.get(jobId);
  
  try {
    // Update status to extracting
    job.status = 'extracting';
    job.progress = 10;
    job.message = 'Extracting dataset files...';
    io.to(jobId).emit('job-status', {
      jobId: jobId,
      status: 'extracting',
      progress: 10,
      message: 'Extracting dataset files...'
    });

    // Extract the uploaded ZIP file
    const extractDir = path.join(__dirname, 'datasets', jobId);
    await fs.ensureDir(extractDir);
    
    await fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .promise();

    // Find the csv_files directory
    const csvFilesDir = path.join(extractDir, 'csv_files');
    if (!await fs.pathExists(csvFilesDir)) {
      throw new Error('No csv_files directory found in uploaded dataset');
    }

    // Update status to preparing
    job.status = 'preparing';
    job.progress = 20;
    job.message = 'Preparing optimization environment...';
    io.to(jobId).emit('job-status', {
      jobId: jobId,
      status: 'preparing',
      progress: 20,
      message: 'Preparing optimization environment...'
    });

    // Create dataset directory structure
    const datasetName = `optimization_${jobId}`;
    const datasetDir = path.join(__dirname, 'datasets', datasetName);
    await fs.ensureDir(datasetDir);
    
    // Copy csv_files to the dataset directory
    await fs.copy(csvFilesDir, path.join(datasetDir, 'csv_files'));
    
    // Create results directory
    const resultsDir = path.join(__dirname, 'results', jobId);
    await fs.ensureDir(resultsDir);

    // Update status to running
    job.status = 'running';
    job.progress = 30;
    job.message = 'Running Julia optimization...';
    io.to(jobId).emit('job-status', {
      jobId: jobId,
      status: 'running',
      progress: 30,
      message: 'Running Julia optimization...'
    });

    // Run Julia optimization
    const juliaResult = await runJuliaOptimization(datasetName, jobId, datasetDir);
    
    if (juliaResult.success) {
      console.log(`🎉 Job ${jobId} completed successfully!`);
      
      // Update status to completed
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Optimization completed successfully!';
      job.results = juliaResult.results;
      
      console.log(`📡 Emitting job-status event for job ${jobId} with status: completed`);
      
      io.to(jobId).emit('job-status', {
        jobId: jobId,
        status: 'completed',
        progress: 100,
        message: 'Optimization completed successfully!',
        results: juliaResult.results
      });
      
      console.log(`✅ Job-status event emitted for job ${jobId}`);
    } else {
      console.log(`❌ Job ${jobId} failed:`, juliaResult.error);
      throw new Error(juliaResult.error);
    }

  } catch (error) {
    console.error(`Error in job ${jobId}:`, error);

    job.status = 'error';
    job.progress = 0;
    job.message = `Error: ${error.message}`;
    job.error = error.message;

    io.to(jobId).emit('job-status', {
      jobId: jobId,
      status: 'error',
      progress: 0,
      message: `Error: ${error.message}`
    });
  } finally {
    // 4F: Clean up temp files (extracted ZIP directory and uploaded file)
    const extractDir = path.join(__dirname, 'datasets', jobId);
    fs.remove(extractDir).catch(err => console.error(`Cleanup error (extractDir): ${err.message}`));
    fs.remove(filePath).catch(err => console.error(`Cleanup error (upload): ${err.message}`));
  }
}

// Helper function to run Julia optimization
function runJuliaOptimization(datasetName, jobId, datasetDir) {
  return new Promise((resolve, reject) => {
    const juliaPath = process.env.JULIA_PATH || 'julia';
    const scriptPath = path.join(__dirname, '..', '..', 'julia', 'mcs_optimization_main.jl');
    
    console.log(`Running Julia optimization for dataset: ${datasetName}`);
    console.log(`Julia path: ${juliaPath}`);
    console.log(`Script path: ${scriptPath}`);
    console.log(`Dataset directory: ${datasetDir}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Dataset directory exists: ${require('fs').existsSync(datasetDir)}`);
    console.log(`CSV files directory exists: ${require('fs').existsSync(path.join(datasetDir, 'csv_files'))}`);
    console.log(`Parameters file exists: ${require('fs').existsSync(path.join(datasetDir, 'csv_files', 'parameters.csv'))}`);
    
    // Use the full path to the dataset directory
    const juliaProcess = spawn(juliaPath, [scriptPath, datasetDir], {
      cwd: path.join(__dirname, '..', '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let progress = 30;

    juliaProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`Julia stdout: ${output}`);
      
      // Update progress based on output
      if (output.includes('Loading data')) {
        progress = 40;
      } else if (output.includes('Data loaded successfully')) {
        progress = 50;
      } else if (output.includes('Running optimization model')) {
        progress = 60;
      } else if (output.includes('Optimization completed')) {
        progress = 90;
      }
      
      // Emit progress update
      io.to(jobId).emit('job-status', {
        jobId: jobId,
        status: 'running',
        progress: progress,
        message: 'Running optimization...',
        log: output
      });
    });

    juliaProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.error(`Julia stderr: ${error}`);
    });

    juliaProcess.on('close', async (code) => {
      console.log(`Julia process exited with code ${code}`);

      if (code === 0) {
        console.log(`✅ Julia optimization completed successfully for job ${jobId}`);
        // Parse results from the CSV file that Julia exports
        const results = await parseJuliaResults(datasetDir, stdout);
        console.log(`📊 Parsed results for job ${jobId}:`, results);
        resolve({ success: true, results: results });
      } else {
        console.log(`❌ Julia process failed with code ${code} for job ${jobId}`);
        resolve({ success: false, error: `Julia process failed with code ${code}. Error: ${stderr}` });
      }
    });

    juliaProcess.on('error', (error) => {
      console.error('Failed to start Julia process:', error);
      resolve({ success: false, error: `Failed to start Julia process: ${error.message}` });
    });

    // 1E: Enforce optimization timeout
    const timeoutMs = config.optimization ? config.optimization.timeout : 30 * 60 * 1000;
    const timeoutHandle = setTimeout(() => {
      console.log(`⏱️ Optimization timeout reached for job ${jobId}, killing Julia process`);
      juliaProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!juliaProcess.killed) {
          juliaProcess.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    juliaProcess.on('close', () => clearTimeout(timeoutHandle));
  });
}

// Helper function to parse Julia results from CSV file
async function parseJuliaResults(datasetDir, stdout) {
  const results = {
    objectiveValue: null,
    totalEnergyFromGrid: null,
    totalMissedWork: null,
    totalCarbonEmissions: null,
    totalElectricityCost: null,
    peakDemand: null,
    solveTime: null,
    outputFiles: []
  };

  try {
    // Find the results CSV file that Julia exports
    const resultsDir = path.join(datasetDir, 'results');
    let csvPath = null;

    // Search for 09_cost_emissions_totals.csv in results directory tree
    if (await fs.pathExists(resultsDir)) {
      const findCsv = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = await findCsv(fullPath);
            if (found) return found;
          } else if (entry.name === '09_cost_emissions_totals.csv') {
            return fullPath;
          }
        }
        return null;
      };
      csvPath = await findCsv(resultsDir);
    }

    if (csvPath && await fs.pathExists(csvPath)) {
      console.log(`📊 Reading results CSV from: ${csvPath}`);
      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.trim().split('\n');

      if (lines.length >= 2) {
        const headers = lines[0].split(',').map(h => h.trim());
        const values = lines[1].split(',').map(v => v.trim());
        const data = {};
        headers.forEach((h, i) => { data[h] = parseFloat(values[i]) || 0; });

        results.objectiveValue = data['Objective_Value'] || data['objective_value'] || null;
        results.totalEnergyFromGrid = data['Total_Grid_Energy_kWh'] || data['total_grid_energy_kwh'] || null;
        results.totalElectricityCost = data['Total_Energy_Cost_USD'] || data['total_energy_cost_usd'] || null;
        results.totalCarbonEmissions = data['Total_CO2_Emissions_kg'] || data['total_co2_emissions_kg'] || null;
        results.peakDemand = data['Peak_Demand_kW'] || data['peak_demand_kw'] || null;
        results.totalMissedWork = data['Total_Missed_Work_kWh'] || data['total_missed_work_kwh'] || null;
      }
    } else {
      console.log('⚠️ Results CSV not found, falling back to stdout parsing');
      // Fallback: try parsing stdout for any metrics Julia might print
      const stdoutLines = stdout.split('\n');
      for (const line of stdoutLines) {
        if (line.includes('Objective Value:')) {
          results.objectiveValue = parseFloat(line.split(':')[1].trim());
        } else if (line.includes('Solve Time:')) {
          results.solveTime = parseFloat(line.split(':')[1].trim());
        }
      }
    }

    // Collect output file names from stdout
    const stdoutLines = stdout.split('\n');
    for (const line of stdoutLines) {
      if (line.includes('.png') || line.includes('.txt') || line.includes('.md')) {
        results.outputFiles.push(line.trim());
      }
    }
  } catch (error) {
    console.error('Error parsing Julia results:', error);
  }

  return results;
}

// Helper function to create ZIP file of results
async function createResultsZip(resultsPath, zipPath) {
  return new Promise((resolve, reject) => {
    console.log(`Creating ZIP from: ${resultsPath} to: ${zipPath}`);
    
    // Check if results directory exists and has files
    fs.readdir(resultsPath, (err, files) => {
      if (err) {
        console.error('Error reading results directory:', err);
        reject(err);
        return;
      }
      console.log(`Files in results directory: ${files}`);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log('ZIP file created successfully');
        resolve();
      });
      archive.on('error', (err) => {
        console.error('Error creating ZIP:', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(resultsPath, false);
      archive.finalize();
    });
  });
}

// Results upload and processing endpoint
app.post('/api/results/upload', upload.single('resultsZip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    const zipFile = req.file;
    console.log(`Processing results ZIP: ${zipFile.originalname}`);

    // Create temporary directory for extraction
    const extractDir = path.join(__dirname, 'uploads', 'results', uuidv4());
    await fs.ensureDir(extractDir);

    // Extract ZIP file
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipFile.path)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Parse results and extract data
    const resultsData = await parseResultsDirectory(extractDir);
    
    // Keep the extracted files for serving (don't remove extractDir)
    // Clean up only the uploaded ZIP file
    await fs.remove(zipFile.path);

    res.json({
      success: true,
      datasetName: resultsData.datasetName,
      timestamp: resultsData.timestamp,
      summary: resultsData.summary,
      charts: resultsData.charts
    });

  } catch (error) {
    console.error('Results upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process results ZIP file',
      details: error.message 
    });
  }
});

// Function to parse results directory
async function parseResultsDirectory(resultsDir) {
  try {
    const files = await fs.readdir(resultsDir);
    
    // Find timestamp directory (e.g., 20250830_032808)
    const timestampDir = files.find(file => /^\d{8}_\d{6}$/.test(file));
    if (!timestampDir) {
      throw new Error('No timestamp directory found in results');
    }

    const timestampPath = path.join(resultsDir, timestampDir);
    const timestampFiles = await fs.readdir(timestampPath);

    // Parse summary from log files
    const summary = await parseOptimizationSummary(timestampPath, timestampFiles);
    
    // Parse charts
    const charts = await parseCharts(timestampPath, timestampFiles);

    return {
      datasetName: path.basename(resultsDir),
      timestamp: timestampDir,
      summary: summary,
      charts: charts
    };

  } catch (error) {
    console.error('Error parsing results directory:', error);
    throw error;
  }
}

// Function to parse optimization summary
async function parseOptimizationSummary(timestampPath, files) {
  try {
    const logFile = files.find(file => file.includes('optimization_log.txt'));
    if (!logFile) {
      return null;
    }

    const logContent = await fs.readFile(path.join(timestampPath, logFile), 'utf8');
    
    // Extract key metrics using regex patterns
    const metrics = {
      solutionStatus: extractValue(logContent, /Solution Status:\s*(\w+)/),
      totalEnergyFromGrid: extractNumericValue(logContent, /Total Energy from Grid:\s*([\d.]+)/),
      totalMissedWork: extractNumericValue(logContent, /Total Missed Work:\s*([\d.]+)/),
      totalElectricityCost: extractNumericValue(logContent, /Total Electricity Cost:\s*([\d.]+)/),
      totalCarbonEmissionsCost: extractNumericValue(logContent, /Total Carbon Emissions Cost:\s*([\d.]+)/),
      peakPower: extractNumericValue(logContent, /Peak Power:\s*([\d.]+)/),
      averagePower: extractNumericValue(logContent, /Average Power:\s*([\d.]+)/),
      dutyCycle: extractNumericValue(logContent, /Duty Cycle:\s*([\d.]+)/),
      energyEfficiency: extractNumericValue(logContent, /Energy Efficiency:\s*([\d.]+)/),
      initialMCSEnergy: extractNumericValue(logContent, /Initial MCS Energy:\s*([\d.]+)/),
      finalMCSEnergy: extractNumericValue(logContent, /Final MCS Energy:\s*([\d.]+)/),
      netEnergyChange: extractNumericValue(logContent, /Net Energy Change:\s*([\d.]+)/),
      numMCS: extractNumericValue(logContent, /Number of MCSs:\s*(\d+)/),
      numCEV: extractNumericValue(logContent, /Number of EVs:\s*(\d+)/),
      numNodes: extractNumericValue(logContent, /Number of nodes:\s*(\d+)/),
      numTimePeriods: extractNumericValue(logContent, /Number of time periods:\s*(\d+)/)
    };

    return metrics;

  } catch (error) {
    console.error('Error parsing optimization summary:', error);
    return null;
  }
}

// Function to parse charts and CSV data
async function parseCharts(timestampPath, files) {
  try {
    const chartFiles = files.filter(file => file.endsWith('.png'));
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    console.log('📊 Chart files found:', chartFiles);
    console.log('📈 CSV files found:', csvFiles);
    
    const charts = chartFiles.map(file => {
      const chartName = file.replace('.png', '');
      const csvFile = csvFiles.find(csv => csv.replace('.csv', '') === chartName);
      
      console.log(`🔍 Chart: ${chartName}, CSV: ${csvFile ? csvFile : 'none'}`);
      
      return {
        name: chartName,
        type: csvFile ? 'INTERACTIVE' : 'PNG',
        imageUrl: `/api/results/image/${path.basename(timestampPath)}/${file}`,
        downloadUrl: `/api/results/download/${path.basename(timestampPath)}/${file}`,
        csvDataUrl: csvFile ? `/api/results/csv/${path.basename(timestampPath)}/${csvFile}` : null,
        fileSize: 0
      };
    });

    return charts;

  } catch (error) {
    console.error('Error parsing charts:', error);
    return [];
  }
}

// Helper functions for parsing
function extractValue(content, regex) {
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractNumericValue(content, regex) {
  const match = content.match(regex);
  return match ? parseFloat(match[1]) : 0;
}

// Serve chart images
app.get('/api/results/image/:timestamp/:filename', (req, res) => {
  try {
    const { timestamp, filename } = req.params;
    
    // Search for the file in all result directories
    const resultsDir = path.join(__dirname, 'uploads', 'results');
    const resultDirs = fs.readdirSync(resultsDir);
    
    let filePath = null;
    for (const resultDir of resultDirs) {
      const potentialPath = path.join(resultsDir, resultDir, timestamp, filename);
      if (fs.existsSync(potentialPath)) {
        filePath = potentialPath;
        break;
      }
    }
    
    if (filePath && fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Download chart files
app.get('/api/results/download/:timestamp/:filename', (req, res) => {
  try {
    const { timestamp, filename } = req.params;
    
    // Search for the file in all result directories
    const resultsDir = path.join(__dirname, 'uploads', 'results');
    const resultDirs = fs.readdirSync(resultsDir);
    
    let filePath = null;
    for (const resultDir of resultDirs) {
      const potentialPath = path.join(resultsDir, resultDir, timestamp, filename);
      if (fs.existsSync(potentialPath)) {
        filePath = potentialPath;
        break;
      }
    }
    
    if (filePath && fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Serve CSV data files
app.get('/api/results/csv/:timestamp/:filename', (req, res) => {
  try {
    const { timestamp, filename } = req.params;
    
    // Search for the file in all result directories
    const resultsDir = path.join(__dirname, 'uploads', 'results');
    const resultDirs = fs.readdirSync(resultsDir);
    
    let filePath = null;
    for (const resultDir of resultDirs) {
      const potentialPath = path.join(resultsDir, resultDir, timestamp, filename);
      if (fs.existsSync(potentialPath)) {
        filePath = potentialPath;
        break;
      }
    }
    
    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'CSV file not found' });
    }
  } catch (error) {
    console.error('Error serving CSV file:', error);
    res.status(500).json({ error: 'Failed to serve CSV file' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate session ID if not provided
    const session = sessionId || uuidv4();
    
    console.log(`Processing chat message for session ${session}: ${message}`);

    // Process message with Agent Orchestrator
    const response = await agentOrchestrator.processMessage(message, session, context);
    
    res.json({
      success: true,
      message: response.message,
      actions: response.actions,
      formUpdates: response.formUpdates,
      navigateToStep: response.navigateToStep,
      extractedParameters: response.extractedParameters,
      validationResult: response.validationResult,
      recommendations: response.recommendations,
      workflowState: response.workflowState,
      flowAnalysis: response.flowAnalysis,
      reactChain: response.reactChain,
      orchestrationChain: response.orchestrationChain,
      sessionId: session
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Clear conversation endpoint
app.delete('/api/chat/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    agentOrchestrator.clearSession(sessionId);
    res.json({ success: true, message: 'Conversation cleared' });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 MCS-CEV Optimization Backend running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔗 WebSocket server ready for real-time updates`);
  console.log(`🤖 Chat API ready for AI conversations`);
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
