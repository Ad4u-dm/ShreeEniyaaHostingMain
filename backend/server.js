const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const next = require('next');

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '..' }); // Point to parent directory where Next.js lives
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 5000;

app.prepare().then(() => {
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
        // Add your Hostinger domain here
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
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
      timestamp: new Date().toISOString()
    });
  });

  // Handle all API routes through Next.js
  server.all('/api/*', (req, res) => {
    return handle(req, res);
  });

  // Error handling middleware
  server.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(dev && { stack: err.stack })
    });
  });

  // 404 handler for API routes only
  server.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Start server
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Allowed frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
