const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

console.log('Invoify Desktop App Starting...');

async function startServer() {
  if (isDev) return;

  try {
    // Start Next.js server directly in the main process
    const serverPath = path.join(__dirname, '..', '.next', 'standalone');
    
    // Change to server directory temporarily
    const originalCwd = process.cwd();
    process.chdir(serverPath);
    
    try {
      // Load the server.js file directly - it will start the server automatically
      require(path.join(serverPath, 'server.js'));
      
      console.log('Next.js server starting in main process...');
      
      // Wait for server to be ready
      await new Promise((resolve, reject) => {
        const checkServer = () => {
          // Simple check - try to connect to localhost:3000
          const http = require('http');
          const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'HEAD',
            timeout: 1000
          }, (res) => {
            console.log('Next.js server is ready!');
            resolve();
          });
          
          req.on('error', () => {
            // Server not ready yet, try again
            setTimeout(checkServer, 500);
          });
          
          req.on('timeout', () => {
            req.destroy();
            setTimeout(checkServer, 500);
          });
          
          req.end();
        };
        
        // Start checking after a short delay
        setTimeout(checkServer, 1000);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          reject(new Error('Server failed to start within 30 seconds'));
        }, 30000);
      });
      
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error; // Re-throw to prevent app from starting
  }
}

async function findNextJsPort() {
  const http = require('http');
  
  // Wait a bit for Next.js to start up
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check common ports that Next.js might use
  for (let port = 3000; port <= 3010; port++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: port,
          path: '/_next/static/chunks/webpack.js', // Next.js specific path
          method: 'HEAD',
          timeout: 2000
        }, (res) => {
          if (res.statusCode === 200 && res.headers['content-type']?.includes('javascript')) {
            resolve();
          } else {
            reject();
          }
        });
        req.on('error', () => reject());
        req.on('timeout', () => {
          req.destroy();
          reject();
        });
        req.end();
      });
      return port; // Found Next.js running on this port
    } catch {
      continue; // Try next port
    }
  }
  
  // Fallback: try to get port from environment or use default
  return process.env.PORT ? parseInt(process.env.PORT) : 3000;
}

async function createWindow() {
  try {
    let appUrl;
    
    if (isDev) {
      // Find the correct port that Next.js is running on
      const port = await findNextJsPort();
      appUrl = `http://localhost:${port}`;
      console.log(`Next.js detected on port ${port}`);
    } else {
      await startServer();
      appUrl = 'http://localhost:3000';
    }

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
      show: false, // Start hidden, show when ready
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default'
    });

    console.log('BrowserWindow created, loading URL:', appUrl);

    mainWindow.setTitle('Invoify - Billing & Invoice Management');

    try {
      await mainWindow.loadURL(appUrl);
      console.log('App loaded successfully from:', appUrl);
    } catch (error) {
      console.error('Failed to load app URL:', error);
      // Load a fallback error page
      await mainWindow.loadURL(`data:text/html,
        <html>
          <head><title>Invoify - Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Invoify Desktop</h1>
            <p style="color: red;">Failed to load application. Please check the console for errors.</p>
            <p>Attempted URL: ${appUrl}</p>
            <p>Error: ${error.message}</p>
          </body>
        </html>
      `);
    }

    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show, displaying...');
      mainWindow.show();
      mainWindow.focus();
      mainWindow.restore();
      if (isDev) {
        mainWindow.webContents.openDevTools();
        console.log('DevTools opened');
      }
      console.log('Window should now be visible');
    });

    // Fallback: show window after 5 seconds if ready-to-show hasn't fired
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        console.log('Fallback: forcing window to show');
        mainWindow.show();
        mainWindow.focus();
      }
    }, 5000);

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Page failed to load:', errorCode, errorDescription);
    });
  } catch (error) {
    console.error('Failed to create window:', error);
    app.quit(); // Quit app if window creation fails
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
