const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables from both backend/.env and parent .env
dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5000;
// Force development mode if not explicitly set to production
const NODE_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const isDev = NODE_ENV !== 'production';

async function startServer() {
  const server = express();

  // Middleware
  server.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  }));

  server.use(compression());
  server.use(morgan('combined'));

  // CORS configuration - Allow frontend domain
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'http://localhost:8080',
      ].filter(Boolean);
      
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow in development, can restrict in production
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
  };

  server.use(cors(corsOptions));
  server.use(cookieParser());
  server.use(express.json({ limit: '50mb' }));
  server.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  server.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Backend server is running',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      mode: isDev ? 'development' : 'production'
    });
  });

  if (isDev) {
    // Development mode - use Next.js dev server
    console.log('🔧 Starting in DEVELOPMENT mode with Next.js...');
    const next = require('next');
    const app = next({ 
      dev: true, 
      dir: path.join(__dirname, '..'),
      conf: {
        // Ensure we don't use static export in dev
        output: undefined
      }
    });
    const handle = app.getRequestHandler();

    await app.prepare();
    
    // Handle all API routes through Next.js
    server.all('/api/*', (req, res) => {
      return handle(req, res);
    });

    console.log('✅ Next.js prepared and ready');
  } else {
    // Production mode - use standalone build
    console.log('🚀 Starting in PRODUCTION mode with standalone build...');
    
    const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
    const nextServerPath = path.join(standalonePath, 'server.js');
    
    // Check if standalone build exists
    const fs = require('fs');
    if (!fs.existsSync(nextServerPath)) {
      console.error('❌ Standalone build not found!');
      console.error(`Expected at: ${nextServerPath}`);
      console.error('Run: npm run build (from project root)');
      process.exit(1);
    }

    // Import the standalone Next.js server
    const nextServer = require(nextServerPath);
    
    // Handle all API routes through standalone Next.js
    server.all('/api/*', (req, res) => {
      return nextServer(req, res);
    });

    console.log('✅ Standalone Next.js server loaded');
  }

  // Error handling middleware
  server.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(isDev && { stack: err.stack })
    });
  });

  // 404 handler for API routes only
  server.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Start server
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔗 Allowed origins:`);
    console.log(`   - ${process.env.FRONTEND_URL || 'Not set'}`);
    console.log(`   - http://localhost:3000`);
    console.log(`   - http://localhost:8000`);
    console.log('='.repeat(60) + '\n');
  });
}

startServer().catch((ex) => {
  console.error('Failed to start server:', ex);
  process.exit(1);
});
