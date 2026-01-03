const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const envHandler = require('./env-handler');
const dbHelper = require('./database-helper');
const SyncWorker = require('./sync-worker');

// Load environment variables FIRST
envHandler.loadEnv();

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;
let syncWorker = null;
let isOnline = false;

console.log('Invoify Desktop App Starting...');
console.log('Is Dev:', isDev);
console.log('App Path:', app.getAppPath());
console.log('Resources Path:', process.resourcesPath);
console.log('User Data Path:', app.getPath('userData'));

// Initialize database paths BEFORE anything else
dbHelper.setPrismaEnvironment();

async function startServer() {
  if (isDev) return;

  return new Promise((resolve, reject) => {
    try {
      // In production, start the Next.js standalone server
      const resourcesPath = process.resourcesPath;
      const appPath = app.getAppPath();

      // Try multiple possible paths for the server.js
      const possibleServerPaths = [
        path.join(resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
        path.join(appPath, '.next', 'standalone', 'server.js'),
        path.join(appPath.replace('app.asar', 'app.asar.unpacked'), '.next', 'standalone', 'server.js'),
      ];

      let serverPath = null;
      for (const testPath of possibleServerPaths) {
        if (fs.existsSync(testPath)) {
          serverPath = testPath;
          break;
        }
      }

      console.log('Starting Next.js standalone server...');
      console.log('Resources Path:', resourcesPath);
      console.log('App Path:', appPath);
      console.log('Server Path:', serverPath);

      // Check if server.js exists
      if (!serverPath || !fs.existsSync(serverPath)) {
        const triedPaths = possibleServerPaths.join('\n  - ');
        console.error('Server.js not found. Tried:\n  -', triedPaths);
        reject(new Error(`Server file not found. Tried multiple paths.`));
        return;
      }

      // Try to find Node.js executable
      let nodePath = null;
      const possibleNodePaths = [
        path.join(path.dirname(process.execPath), 'node.exe'),
        path.join(resourcesPath, '..', 'node.exe'),
        'node.exe', // In PATH
        process.execPath // Fallback to Electron
      ];

      for (const testPath of possibleNodePaths) {
        if (fs.existsSync(testPath)) {
          nodePath = testPath;
          console.log('Found Node.js at:', nodePath);
          break;
        }
      }

      if (!nodePath) {
        console.error('No Node.js executable found');
        reject(new Error('No Node.js executable found'));
        return;
      }

      // Start the server with proper environment
      serverProcess = spawn(nodePath, [serverPath], {
        cwd: path.dirname(serverPath), // Set cwd to the standalone directory
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '3000',
          HOSTNAME: 'localhost',
          DATABASE_URL: dbHelper.getDatabaseUrl(), // Use dynamic database path
        }
      });

      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        reject(error);
      });

      // Log server output for debugging
      serverProcess.stdout.on('data', (data) => {
        console.log('Server stdout:', data.toString());
      });

      serverProcess.stderr.on('data', (data) => {
        console.log('Server stderr:', data.toString());
      });

      // Wait for server to be ready
      let ready = false;
      const checkServer = () => {
        if (ready) return;

        const http = require('http');
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/_next/static/chunks/webpack.js',
          method: 'HEAD',
          timeout: 2000
        }, (res) => {
          if (res.statusCode === 200) {
            console.log('Next.js server is ready!');
            ready = true;
            resolve();
          }
        });

        req.on('error', () => {
          // Try again
          setTimeout(checkServer, 500);
        });

        req.on('timeout', () => {
          req.destroy();
          setTimeout(checkServer, 500);
        });

        req.end();
      };

      // Start checking after 2 seconds
      setTimeout(checkServer, 2000);

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!ready) {
          reject(new Error('Server failed to start within 60 seconds'));
        }
      }, 60000);

    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
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
      try {
        await startServer();
        console.log('Server started successfully');
        appUrl = 'http://localhost:3000';
      } catch (serverError) {
        console.error('Failed to start server:', serverError);
        dialog.showErrorBox(
          'Server Startup Failed',
          `Failed to start the application server: ${serverError.message}\n\nPlease check your installation and try again.`
        );
        app.quit();
        return;
      }
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

app.whenReady().then(async () => {
  await createWindow();
  await initializeSync();
});

app.on('window-all-closed', () => {
  cleanupSync();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Sync initialization and management
async function initializeSync() {
  try {
    console.log('[Main] Initializing sync worker...');
    
    // Get backend URL and auth token from environment or config
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const authToken = await getAuthToken(); // Will implement this
    
    syncWorker = new SyncWorker(backendUrl, authToken);
    await syncWorker.initialize();
    
    console.log('[Main] Sync worker initialized successfully');
    
    // Check network status
    isOnline = require('electron').net.isOnline();
    console.log('[Main] Network status:', isOnline ? 'Online' : 'Offline');
    
    // Perform initial sync if online
    if (isOnline && authToken) {
      console.log('[Main] Performing initial sync...');
      const result = await syncWorker.pullChanges();
      console.log('[Main] Initial sync result:', result);
    }
    
    // Set up periodic sync (every 5 minutes when online)
    setInterval(async () => {
      if (isOnline && syncWorker && authToken) {
        console.log('[Main] Running periodic sync...');
        await syncWorker.pullChanges();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
  } catch (error) {
    console.error('[Main] Failed to initialize sync:', error);
  }
}

async function getAuthToken() {
  // For now, return null - auth token should be stored securely after login
  // In production, retrieve from secure storage (electron-store with encryption)
  // or prompt user to login on first run
  const Store = require('electron-store');
  const store = new Store({ encryptionKey: 'invoify-secure-key-change-in-production' });
  return store.get('authToken', null);
}

function setAuthToken(token) {
  const Store = require('electron-store');
  const store = new Store({ encryptionKey: 'invoify-secure-key-change-in-production' });
  store.set('authToken', token);
}

function cleanupSync() {
  if (syncWorker) {
    syncWorker.cleanup();
    syncWorker = null;
  }
}

// IPC Handlers for sync operations
ipcMain.handle('sync:pull', async () => {
  if (!syncWorker) {
    return { success: false, error: 'Sync worker not initialized' };
  }
  if (!isOnline) {
    return { success: false, error: 'Device is offline' };
  }
  return await syncWorker.pullChanges();
});

ipcMain.handle('sync:status', async () => {
  if (!syncWorker) {
    return { initialized: false };
  }
  return {
    initialized: true,
    lastSync: syncWorker.getLastSyncStatus(),
    isOnline
  };
});

ipcMain.handle('sync:setToken', async (event, token) => {
  setAuthToken(token);
  if (syncWorker) {
    syncWorker.authToken = token;
    // Trigger immediate sync after login
    if (isOnline) {
      return await syncWorker.pullChanges();
    }
  }
  return { success: true };
});

ipcMain.handle('sync:getOnlineStatus', async () => {
  return require('electron').net.isOnline();
});

// Monitor network status changes
require('electron').powerMonitor.on('resume', async () => {
  console.log('[Main] System resumed from sleep');
  isOnline = require('electron').net.isOnline();
  if (isOnline && syncWorker) {
    await syncWorker.pullChanges();
  }
});
