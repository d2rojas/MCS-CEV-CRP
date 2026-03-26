module.exports = {
  // Server configuration
  port: process.env.PORT || 3004,
  
  // Julia configuration
  juliaPath: process.env.JULIA_PATH || 'julia',
  
  // File paths
  uploadsDir: 'uploads',
  datasetsDir: 'datasets',
  resultsDir: 'results',
  
  // Job management
  jobCleanupHours: 24, // Clean up jobs older than 24 hours
  maxFileSize: 100 * 1024 * 1024, // 100MB max file size
  
  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3003',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
  },
  
  // WebSocket configuration
  websocket: {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3003',
      methods: ['GET', 'POST']
    }
  },
  
  // Optimization settings
  optimization: {
    timeout: 30 * 60 * 1000, // 30 minutes timeout
    maxConcurrentJobs: 3, // Maximum concurrent optimization jobs
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || null
  }
};
