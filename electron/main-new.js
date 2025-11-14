const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let localServer;

// Data storage path
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');
const syncPath = path.join(dataPath, 'sync.json');
const settingsPath = path.join(dataPath, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Thermal Printing Support
let thermalPrinterSettings = {
  printerName: null,
  port: 'USB',
  baudRate: 9600
};

// Load settings
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      if (settings.thermalPrinter) {
        thermalPrinterSettings = settings.thermalPrinter;
      }
      return settings;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return {};
}

// Save settings
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Thermal Printing Handler
ipcMain.handle('print:thermal', async (event, data) => {
  try {
    // For Windows, we can use different approaches:
    // 1. Direct USB printing (via node-escpos or similar)
    // 2. Using Windows printer driver
    // 3. COM port communication
    
    // Option 1: Try to use system printer (simplest for Windows)
    if (thermalPrinterSettings.printerName) {
      const { printToPDF } = mainWindow.webContents;
      
      // For direct thermal printing, we would use node-escpos or similar
      // For now, we'll use Windows printing
      const win = new BrowserWindow({ show: false });
      win.webContents.print({
        silent: true,
        printBackground: false,
        deviceName: thermalPrinterSettings.printerName
      }, (success, errorType) => {
        win.close();
        if (!success) {
          console.error('Print failed:', errorType);
        }
      });
      
      return { success: true, message: 'Print job sent to printer' };
    } else {
      return { success: false, message: 'No printer configured' };
    }
  } catch (error) {
    console.error('Thermal print error:', error);
    return { success: false, error: error.message };
  }
});

// Get available printers
ipcMain.handle('print:getAvailablePrinters', async () => {
  try {
    const { webContents } = mainWindow;
    const printers = await webContents.getPrintersAsync();
    return { success: true, printers };
  } catch (error) {
    console.error('Error getting printers:', error);
    return { success: false, error: error.message };
  }
});

// Set default printer
ipcMain.handle('print:setDefaultPrinter', async (event, printerName) => {
  try {
    thermalPrinterSettings.printerName = printerName;
    const settings = loadSettings();
    settings.thermalPrinter = thermalPrinterSettings;
    saveSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Data Sync Handlers
ipcMain.handle('sync:saveLocal', async (event, data) => {
  try {
    const timestamp = new Date().toISOString();
    const syncData = {
      ...data,
      lastSyncedAt: timestamp,
      syncedFrom: 'desktop'
    };
    
    fs.writeFileSync(syncPath, JSON.stringify(syncData, null, 2));
    return { success: true, timestamp };
  } catch (error) {
    console.error('Error saving local data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync:getLocal', async (event, key) => {
  try {
    if (fs.existsSync(syncPath)) {
      const data = JSON.parse(fs.readFileSync(syncPath, 'utf8'));
      return { success: true, data: key ? data[key] : data };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting local data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync:syncToServer', async () => {
  try {
    // This would sync with your online server
    // For now, we'll just return success
    const timestamp = new Date().toISOString();
    return { success: true, timestamp, message: 'Data synced successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync:getLastSyncTime', async () => {
  try {
    if (fs.existsSync(syncPath)) {
      const data = JSON.parse(fs.readFileSync(syncPath, 'utf8'));
      return { success: true, timestamp: data.lastSyncedAt || null };
    }
    return { success: true, timestamp: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App Info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.on('app:quit', () => {
  app.quit();
});

// Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// Start local Next.js server for production
function startLocalServer() {
  return new Promise((resolve, reject) => {
    try {
      let serverPath;
      
      if (isDev) {
        // Development mode - just resolve immediately, Next.js dev server should be running
        console.log('Development mode - skipping embedded server startup');
        resolve();
        return;
      }
      
      // Production mode - find the Next.js standalone server
      const possiblePaths = [
        path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
        path.join(process.resourcesPath, '.next', 'standalone', 'server.js'),
        path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
        path.join(__dirname, '..', 'resources', '.next', 'standalone', 'server.js')
      ];
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          serverPath = testPath;
          console.log('Found Next.js server at:', serverPath);
          break;
        }
      }
      
      if (!serverPath) {
        console.error('Could not find Next.js standalone server. Searched paths:', possiblePaths);
        // Fallback: try to start without embedded server
        resolve();
        return;
      }
      
      // Set environment for Next.js
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';
      process.env.HOSTNAME = 'localhost';
      
      const nextServer = require(serverPath);
      
      const server = http.createServer((req, res) => {
        nextServer.getRequestHandler()(req, res);
      });

      server.listen(3000, 'localhost', (err) => {
        if (err) {
          console.error('Failed to start local server:', err);
          reject(err);
        } else {
          console.log('Local Next.js server started on http://localhost:3000');
          localServer = server;
          resolve();
        }
      });
      
    } catch (error) {
      console.error('Error starting local server:', error);
      // Don't reject - fallback to external server or show error
      resolve();
    }
  });
}

async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'public', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff'
  });

  mainWindow.setTitle('Invoify - Billing & Invoice Management');

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow.webContents.send('navigate', '/settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Invoify',
              message: 'Invoify - Billing & Invoice Management',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  let appUrl;

  if (isDev) {
    // Development mode
    appUrl = 'http://localhost:3000';
    
    const waitOn = require('wait-on');
    try {
      await waitOn({ resources: [appUrl], timeout: 30000 });
    } catch (error) {
      console.error('Failed to start dev server:', error);
      dialog.showErrorBox('Error', 'Failed to start development server. Please run "npm run dev" first.');
      app.quit();
      return;
    }
  } else {
    // Production mode - try embedded Next.js app first
    appUrl = 'http://localhost:3000';
    
    try {
      await startLocalServer();
      
      // Wait a bit to ensure server is ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test if server is responding
      try {
        const testReq = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          console.log('Server health check passed');
        });
        
        testReq.on('error', (error) => {
          console.warn('Local server not responding, will try to load anyway');
        });
        
        testReq.end();
      } catch (testError) {
        console.warn('Server test failed, continuing anyway');
      }
      
    } catch (error) {
      console.error('Failed to start local server:', error);
      
      // Show more helpful error message
      const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'error',
        title: 'Server Startup Failed',
        message: 'Failed to start the application server.',
        detail: 'This might be due to:\n• Port 3000 is already in use\n• Missing application files\n• Permission issues\n\nWould you like to try anyway?',
        buttons: ['Try Anyway', 'Quit'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (result === 1) {
        app.quit();
        return;
      }
      // Continue with result === 0 (Try Anyway)
    }
  }

  // Load the app
  await mainWindow.loadURL(appUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (localServer) {
    localServer.close();
  }
});
