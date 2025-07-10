const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const colors = require('colors');
require('dotenv').config();

// Import database connection
const { connectDB, healthCheck } = require('./config/database');

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const jobRoutes = require('./routes/jobs');
const educationRoutes = require('./routes/education');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3004',
      'http://172.20.10.3:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Post-parsing body verification for jobs API
app.use('/api/jobs', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('🔍 POST-PARSING VERIFICATION:'.blue.bold);
    console.log('   Parsed Body Type:', typeof req.body);
    console.log('   Parsed Body Keys:', Object.keys(req.body || {}));
    console.log('   Parsed Body:', JSON.stringify(req.body, null, 2));
    
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('🚨 ALERT: Parsed body is empty!'.red.bold);
      console.log('🚨 This could be a Content-Type or parsing issue!'.red.bold);
    }
  }
  next();
});

// Add comprehensive logging middleware for jobs API
app.use('/api/jobs', (req, res, next) => {
  console.log('\n🔥 JOBS API REQUEST INTERCEPTED'.red.bold);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('🌐 Method:', req.method);
  console.log('📍 URL:', req.url);
  console.log('📍 Full URL:', req.originalUrl);
  console.log('🏷️  Query Params:', JSON.stringify(req.query, null, 2));
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Content-Type:', req.get('Content-Type'));
  console.log('📏 Content-Length:', req.get('Content-Length'));
  console.log('🔐 Authorization:', req.get('Authorization') ? 'Present' : 'Missing');
  console.log('🍪 Cookies:', JSON.stringify(req.cookies, null, 2));
  
  // Log body details
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('📥 Body Type:', typeof req.body);
    console.log('📥 Body Constructor:', req.body?.constructor?.name);
    console.log('📥 Body Keys:', Object.keys(req.body || {}));
    console.log('📥 Body Length:', Object.keys(req.body || {}).length);
    console.log('📥 Raw Body:', JSON.stringify(req.body, null, 2));
    
    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('⚠️  WARNING: REQUEST BODY IS EMPTY!'.yellow.bold);
    }
  }
  
  console.log('🔗 User Agent:', req.get('User-Agent'));
  console.log('🌍 Origin:', req.get('Origin'));
  console.log('📡 X-Forwarded-For:', req.get('X-Forwarded-For'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'.gray);
  
  next();
});

// Trust proxy (for production deployment)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SearchNorthCyprus API',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api/docs`,
    status: 'operational'
  });
});

// Health check endpoint with database status
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    
    res.status(200).json({
      status: 'OK',
      message: 'SearchNorthCyprus API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      message: 'Database connection issues',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    api: 'SearchNorthCyprus',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      listings: '/api/listings',
      jobs: '/api/jobs',
      admin: '/api/admin',
      education: '/api/education'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/education', educationRoutes);

// Serve static files (for uploaded images if not using Cloudinary)
app.use('/uploads', express.static('uploads'));

// 404 handler for API routes
app.use('/api/*', notFound);

// Catch-all handler for non-API routes
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: ['/api/health', '/api/status', '/api/auth', '/api/listings', '/api/jobs', '/api/admin']
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`.green.bold);
      console.log(`📱 API available at: http://localhost:${PORT}/api`.cyan);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`.cyan);
      console.log(`📊 Status: http://localhost:${PORT}/api/status`.cyan);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔗 Quick Links:`.blue.bold);
        console.log(`   Health: http://localhost:${PORT}/api/health`.blue);
        console.log(`   Auth: http://localhost:${PORT}/api/auth`.blue);
        console.log(`   Listings: http://localhost:${PORT}/api/listings`.blue);
        console.log(`   Jobs: http://localhost:${PORT}/api/jobs`.blue);
        console.log(`   Admin: http://localhost:${PORT}/api/admin`.blue);
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`.yellow);
      
      server.close(async () => {
        console.log('HTTP server closed.'.yellow);
        
        try {
          const { closeDB } = require('./config/database');
          await closeDB();
          console.log('Database connection closed.'.yellow);
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:'.red, error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down'.red);
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:'.red.bold, error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:'.red.bold, promise, 'reason:'.red, reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;

  } catch (error) {
    console.error('Failed to start server:'.red.bold, error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer }; 