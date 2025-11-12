#!/usr/bin/env node

/**
 * Bluetooth Thermal Printer Bridge - Simplified Version
 * 
 * This version uses direct device file access (works on Linux)
 * No problematic native dependencies required!
 * 
 * Usage:
 *   1. Pair printer: bluetoothctl
 *   2. Bind device: sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX 1
 *   3. Run bridge: node scripts/bridge-simple.js
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.BRIDGE_PORT || 9000;

// Configuration
const CONFIG = {
  printerDevice: process.env.PRINTER_DEVICE || '/dev/rfcomm0',  // Linux
  windowsPort: process.env.WINDOWS_PORT || 'COM3',              // Windows
  retryAttempts: 3,
  retryDelay: 1000,
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a1`,
  ALIGN_LEFT: `${ESC}a0`,
  BOLD_ON: `${ESC}E1`,
  BOLD_OFF: `${ESC}E0`,
  SIZE_NORMAL: `${GS}!0`,
  SIZE_DOUBLE: `${GS}!17`,
  CUT_PAPER: `${GS}V66\x00`,
  LINE_FEED: '\n',
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Print to device file (Linux/Unix)
async function printToDevice(data) {
  return new Promise((resolve, reject) => {
    try {
      // Check if device exists
      if (!fs.existsSync(CONFIG.printerDevice)) {
        throw new Error(`Device ${CONFIG.printerDevice} not found. Have you run 'sudo rfcomm bind'?`);
      }

      // Write to device
      fs.writeFileSync(CONFIG.printerDevice, data);
      log(`✅ Wrote ${Buffer.byteLength(data)} bytes to ${CONFIG.printerDevice}`);
      resolve({ success: true, bytesWritten: Buffer.byteLength(data) });
    } catch (error) {
      reject(error);
    }
  });
}

// Print with retry
async function withRetry(fn, attempts = CONFIG.retryAttempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      log(`⚠️ Attempt ${i + 1} failed, retrying in ${CONFIG.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const deviceExists = fs.existsSync(CONFIG.printerDevice);
  
  res.json({
    status: deviceExists ? 'ok' : 'warning',
    service: 'Bluetooth Thermal Print Bridge (Simple)',
    version: '1.0.0-simple',
    printer: CONFIG.printerDevice,
    deviceExists,
    message: deviceExists 
      ? 'Ready to print'
      : `Device ${CONFIG.printerDevice} not found. Run: sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX 1`,
    timestamp: new Date().toISOString()
  });
});

// List Bluetooth devices (Linux only)
app.get('/devices', async (req, res) => {
  try {
    log('Scanning for Bluetooth devices...');
    
    // Use bluetoothctl to list devices
    const { stdout } = await execAsync('bluetoothctl devices');
    const devices = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/Device\s+([\w:]+)\s+(.+)/);
        if (match) {
          return {
            address: match[1],
            name: match[2]
          };
        }
        return null;
      })
      .filter(Boolean);
    
    log(`Found ${devices.length} paired device(s)`);
    res.json({ success: true, devices });
  } catch (error) {
    log('❌ Error listing devices:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Make sure bluetoothctl is installed (sudo apt install bluez)'
    });
  }
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    log('📥 Received print request');

    let printData;
    
    // Handle different content types
    if (typeof req.body === 'string') {
      printData = req.body;
    } else if (req.body.data) {
      printData = req.body.data;
    } else {
      printData = JSON.stringify(req.body);
    }

    if (!printData) {
      return res.status(400).json({
        success: false,
        error: 'No print data provided'
      });
    }

    log(`📄 Print data size: ${Buffer.byteLength(printData)} bytes`);

    // Add initialization and cut commands
    const fullData = COMMANDS.INIT + printData + '\n\n\n' + COMMANDS.CUT_PAPER;

    // Print with retry
    const result = await withRetry(() => printToDevice(fullData));

    log('✅ Print job completed successfully');

    res.json({
      success: true,
      message: 'Print job sent successfully',
      bytesWritten: result.bytesWritten,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('❌ Print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: error.message.includes('not found') 
        ? 'Run: sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX 1'
        : 'Check if printer is paired and powered on',
      timestamp: new Date().toISOString()
    });
  }
});

// Test print endpoint
app.post('/test', async (req, res) => {
  try {
    log('🧪 Test print requested');

    // Generate test receipt
    const testReceipt = 
      COMMANDS.INIT +
      COMMANDS.ALIGN_CENTER +
      COMMANDS.SIZE_DOUBLE +
      COMMANDS.BOLD_ON +
      'TEST RECEIPT\n' +
      COMMANDS.SIZE_NORMAL +
      COMMANDS.BOLD_OFF +
      '\n' +
      COMMANDS.ALIGN_LEFT +
      'Bridge: Bluetooth Print Bridge\n' +
      'Version: Simple (Direct Device)\n' +
      'Device: ' + CONFIG.printerDevice + '\n' +
      'Time: ' + new Date().toLocaleString() + '\n' +
      'Status: OK\n' +
      '\n' +
      COMMANDS.ALIGN_CENTER +
      'If you can read this,\n' +
      'the bridge is working!\n' +
      '\n' +
      '================================\n' +
      '\n\n\n' +
      COMMANDS.CUT_PAPER;

    await withRetry(() => printToDevice(testReceipt));

    log('✅ Test print completed');

    res.json({
      success: true,
      message: 'Test print sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('❌ Test print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure printer is paired and RFCOMM device is bound'
    });
  }
});

// Setup guide endpoint
app.get('/setup', (req, res) => {
  res.json({
    title: 'Bluetooth Printer Setup Guide',
    steps: [
      {
        step: 1,
        title: 'Pair Printer',
        command: 'bluetoothctl',
        instructions: [
          'scan on',
          'pair XX:XX:XX:XX:XX:XX',
          'trust XX:XX:XX:XX:XX:XX',
          'connect XX:XX:XX:XX:XX:XX',
          'exit'
        ]
      },
      {
        step: 2,
        title: 'Bind RFCOMM Device',
        command: 'sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX 1',
        note: 'Replace XX:XX:XX:XX:XX:XX with your printer MAC address'
      },
      {
        step: 3,
        title: 'Test Connection',
        command: 'echo "Test" > /dev/rfcomm0',
        note: 'Printer should print "Test"'
      },
      {
        step: 4,
        title: 'Start Bridge',
        command: 'node scripts/bridge-simple.js',
        note: 'Bridge will listen on port 9000'
      },
      {
        step: 5,
        title: 'Test from Web',
        command: 'curl -X POST http://127.0.0.1:9000/test',
        note: 'Should print a test receipt'
      }
    ],
    troubleshooting: {
      'Device not found': 'Make sure you have run sudo rfcomm bind',
      'Permission denied': 'Run: sudo chmod 666 /dev/rfcomm0',
      'Connection failed': 'Check if printer is powered on and paired',
      'bluetoothctl not found': 'Install: sudo apt install bluez'
    }
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🖨️  Bluetooth Thermal Print Bridge (Simple Version)');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
  console.log(`📍 Printer device: ${CONFIG.printerDevice}`);
  
  if (fs.existsSync(CONFIG.printerDevice)) {
    console.log(`✅ Device ${CONFIG.printerDevice} is ready`);
  } else {
    console.log(`⚠️ Device ${CONFIG.printerDevice} not found`);
    console.log('\nSetup required:');
    console.log('  1. Pair printer: bluetoothctl');
    console.log('  2. Bind device: sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX 1');
    console.log('  3. Test: echo "Test" > /dev/rfcomm0');
  }
  
  console.log('\nAvailable endpoints:');
  console.log(`  GET  /health      - Health check`);
  console.log(`  GET  /devices     - List Bluetooth devices`);
  console.log(`  GET  /setup       - Setup instructions`);
  console.log(`  POST /print       - Print ESC/POS data`);
  console.log(`  POST /test        - Print test receipt`);
  console.log('\nPress Ctrl+C to stop');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Shutting down print bridge...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  log('❌ Unhandled rejection:', error);
});
