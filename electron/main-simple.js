const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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
    if (thermalPrinterSettings.printerName) {
      // Create a temporary HTML file with the receipt content
      const tempPath = path.join(userDataPath, 'temp-receipt.html');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
            .receipt { width: 80mm; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
            @media print {
              body { margin: 0; padding: 0; }
              @page { size: 80mm auto; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${data.replace(/\n/g, '<br>')}
          </div>
        </body>
        </html>
      `;
      
      fs.writeFileSync(tempPath, htmlContent);
      
      const printWindow = new BrowserWindow({
        width: 300,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      await printWindow.loadFile(tempPath);
      
      printWindow.webContents.print({
        silent: true,
        printBackground: false,
        deviceName: thermalPrinterSettings.printerName,
        pageSize: 'A4' // Will be adjusted by printer
      }, (success, errorType) => {
        printWindow.close();
        fs.unlinkSync(tempPath);
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

async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false // Allow external server access
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

  // Production mode - connect to external server
  let appUrl = 'http://localhost:3000'; // Default

  // Show connection dialog to get server URL
  const result = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    title: 'Server Configuration',
    message: 'Choose server connection:',
    detail: 'Select how to connect to the Invoify server',
    buttons: ['Local Server (localhost:3000)', 'Custom Server URL', 'Offline Mode'],
    defaultId: 0,
    cancelId: 2
  });

  if (result === 1) {
    // Custom server URL
    // For now, use localhost - in future versions, add input dialog
    appUrl = 'http://localhost:3000';
  } else if (result === 2) {
    // Offline mode - load a simple offline page
    const offlinePage = `data:text/html,
      <html>
        <head><title>Invoify - Offline Mode</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 100px;">
          <h1>Invoify - Offline Mode</h1>
          <p>The application is running in offline mode.</p>
          <p>Limited functionality available.</p>
          <button onclick="location.reload()">Retry Connection</button>
        </body>
      </html>`;
    
    await mainWindow.loadURL(offlinePage);
    mainWindow.show();
    return;
  }

  // Load the app
  try {
    await mainWindow.loadURL(appUrl);
  } catch (error) {
    console.error('Failed to load URL:', error);
    
    // Show error page
    const errorPage = `data:text/html,
      <html>
        <head><title>Invoify - Connection Error</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 100px;">
          <h1>Connection Error</h1>
          <p>Could not connect to the Invoify server at: ${appUrl}</p>
          <p>Please ensure the server is running and try again.</p>
          <button onclick="location.reload()">Retry</button>
          <br><br>
          <button onclick="require('electron').ipcRenderer.send('app:quit')">Quit</button>
        </body>
      </html>`;
    
    await mainWindow.loadURL(errorPage);
  }

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});