const express = require('express');
const next = require('next');
const path = require('path');

class NextServer {
  constructor() {
    this.server = null;
    this.app = null;
  }

  async start(port = 3001) {
    try {
      // In production, serve from the standalone build
      if (process.env.NODE_ENV !== 'development') {
        const express = require('express');
        const app = express();
        
        // Serve static files
        const staticPath = path.join(process.resourcesPath || __dirname, '.next', 'static');
        const publicPath = path.join(process.resourcesPath || __dirname, 'public');
        
        app.use('/_next/static', express.static(staticPath));
        app.use('/public', express.static(publicPath));
        
        // Import and use the Next.js standalone server
        const serverPath = path.join(process.resourcesPath || __dirname, '.next', 'standalone', 'server.js');
        const fs = require('fs');
        
        if (fs.existsSync(serverPath)) {
          // Start the Next.js standalone server
          require(serverPath);
        } else {
          throw new Error(`Server file not found at: ${serverPath}`);
        }
        
        return Promise.resolve();
      } else {
        // Development mode - use Next.js dev server
        const dev = process.env.NODE_ENV !== 'production';
        const nextApp = next({ dev, dir: path.join(__dirname, '..') });
        const handle = nextApp.getRequestHandler();
        
        await nextApp.prepare();
        
        const server = express();
        server.all('*', (req, res) => handle(req, res));
        
        this.server = server.listen(port);
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Failed to start Next.js server:', error);
      throw error;
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = NextServer;