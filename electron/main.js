const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let server;

// Enable live reload for Electron in dev mode
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'assets/icon.png'), // Add your app icon here
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Set app title
  mainWindow.setTitle('Invoify - Billing & Invoice Management');

  let appUrl;
  
  if (isDev) {
    // In development, connect to Next.js dev server
    appUrl = 'http://localhost:3000';
    
    // Wait for the dev server to be ready
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
    // In production, serve static files only - this is a simpler approach
    appUrl = 'file://' + path.join(__dirname, '..', 'app', 'index.html');
    
    // Check if we have built files
    const fs = require('fs');
    const staticDir = path.join(process.resourcesPath || __dirname, '..', '.next', 'static');
    const publicDir = path.join(process.resourcesPath || __dirname, '..', 'public');
    
    console.log('Production mode - serving static files');
    console.log('Static dir:', staticDir, 'exists:', fs.existsSync(staticDir));
    console.log('Public dir:', publicDir, 'exists:', fs.existsSync(publicDir));
    
    // For now, let's just load a local HTML file with your app
    const localHtmlPath = path.join(__dirname, 'app.html');
    if (!fs.existsSync(localHtmlPath)) {
      // Create a basic HTML file
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoify - Billing & Invoice Management</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; padding: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; text-align: center; 
              min-height: 100vh; display: flex; 
              flex-direction: column; justify-content: center; 
            }
            .container { 
              background: rgba(255,255,255,0.1); 
              padding: 60px; border-radius: 20px; 
              backdrop-filter: blur(10px); 
              border: 1px solid rgba(255,255,255,0.2); 
            }
            h1 { font-size: 3em; margin-bottom: 20px; font-weight: 300; }
            p { font-size: 1.2em; opacity: 0.9; margin-bottom: 30px; }
            .loading { 
              display: inline-block; 
              width: 40px; height: 40px; 
              border: 4px solid rgba(255,255,255,0.3); 
              border-radius: 50%; 
              border-top-color: white; 
              animation: spin 1s linear infinite; 
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .note { font-size: 0.9em; opacity: 0.7; margin-top: 40px; }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              background: rgba(255,255,255,0.2);
              color: white;
              text-decoration: none;
              border-radius: 25px;
              border: 2px solid rgba(255,255,255,0.3);
              transition: all 0.3s ease;
              margin: 10px;
            }
            .btn:hover {
              background: rgba(255,255,255,0.3);
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🧾 Invoify</h1>
            <p>Professional Billing & Invoice Management System</p>
            <div class="loading"></div>
            <p>Desktop Application Ready!</p>
            <div style="margin-top: 30px;">
              <a href="#" class="btn" onclick="window.location.reload()">Refresh</a>
              <a href="#" class="btn" onclick="require('electron').shell.openExternal('http://localhost:3000')">Open Web Version</a>
            </div>
            <div class="note">
              This is the desktop version of your Invoify application.<br>
              For full functionality, please ensure your web server is running on localhost:3000
            </div>
          </div>
        </body>
        </html>
      `;
      fs.writeFileSync(localHtmlPath, htmlContent);
    }
    
    appUrl = 'file://' + localHtmlPath;
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

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (server) {
    server.kill();
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

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-invoice');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Invoify',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Invoify',
              message: 'Invoify - Billing & Invoice Management',
              detail: 'A comprehensive billing and invoice management system for businesses.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
});