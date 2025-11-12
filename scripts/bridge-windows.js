#!/usr/bin/env node

/**
 * Windows Bluetooth Print Bridge
 * Uses SerialPort to communicate via COM ports
 * 
 * Usage:
 *   set COM_PORT=COM3
 *   node scripts/bridge-windows.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.BRIDGE_PORT || 9000;

// Configuration
const CONFIG = {
  comPort: process.env.COM_PORT || 'COM3',
  baudRate: parseInt(process.env.BAUD_RATE || '9600'),
  retryAttempts: 3,
  retryDelay: 1000,
};

// Check if serialport is installed
let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (err) {
  console.error('❌ SerialPort module not found!');
  console.error('Install with: npm install serialport');
  process.exit(1);
}

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
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Print to COM port
async function printToComPort(data) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: CONFIG.comPort,
      baudRate: CONFIG.baudRate,
      autoOpen: false
    });

    port.open((err) => {
      if (err) {
        return reject(new Error(`Failed to open ${CONFIG.comPort}: ${err.message}`));
      }

      log(`✅ Opened COM port: ${CONFIG.comPort}`);

      port.write(data, (err) => {
        if (err) {
          port.close();
          return reject(new Error(`Write error: ${err.message}`));
        }

        log(`✅ Wrote ${Buffer.byteLength(data)} bytes to printer`);

        port.drain((err) => {
          port.close();
          
          if (err) {
            return reject(new Error(`Drain error: ${err.message}`));
          }

          log('📴 Closed COM port');
          resolve({ success: true, bytesWritten: Buffer.byteLength(data) });
        });
      });
    });

    port.on('error', (err) => {
      log(`❌ Port error: ${err.message}`);
      reject(err);
    });
  });
}

// Retry wrapper
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bluetooth Print Bridge (Windows)',
    version: '1.0.0-windows',
    comPort: CONFIG.comPort,
    baudRate: CONFIG.baudRate,
    platform: 'Windows',
    timestamp: new Date().toISOString()
  });
});

// List COM ports
app.get('/ports', async (req, res) => {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    
    log(`Found ${ports.length} COM port(s)`);
    
    res.json({
      success: true,
      ports: ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        friendlyName: port.friendlyName
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    log('📥 Received print request');

    let printData = req.body.data || req.body;
    if (typeof printData !== 'string') {
      printData = JSON.stringify(printData);
    }

    const fullData = COMMANDS.INIT + printData + '\n\n\n' + COMMANDS.CUT_PAPER;
    const result = await withRetry(() => printToComPort(fullData));

    log('✅ Print completed');

    res.json({
      success: true,
      message: 'Printed successfully',
      bytesWritten: result.bytesWritten,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log('❌ Print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: `Check if ${CONFIG.comPort} is correct and not in use`
    });
  }
});

// Test print
app.post('/test', async (req, res) => {
  try {
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
      'Bridge: Windows Bluetooth\n' +
      'COM Port: ' + CONFIG.comPort + '\n' +
      'Time: ' + new Date().toLocaleString() + '\n' +
      '\n' +
      COMMANDS.ALIGN_CENTER +
      'Working!\n' +
      '\n\n\n' +
      COMMANDS.CUT_PAPER;

    await withRetry(() => printToComPort(testReceipt));

    res.json({ success: true, message: 'Test print sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🖨️  Bluetooth Print Bridge (Windows)');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
  console.log(`📍 COM Port: ${CONFIG.comPort}`);
  console.log(`📊 Baud Rate: ${CONFIG.baudRate}`);
  console.log('\nTo change COM port:');
  console.log(`  set COM_PORT=COM5 && node scripts\\bridge-windows.js`);
  console.log('\nEndpoints:');
  console.log(`  GET  /health  - Health check`);
  console.log(`  GET  /ports   - List COM ports`);
  console.log(`  POST /print   - Print data`);
  console.log(`  POST /test    - Test print`);
  console.log('\nPress Ctrl+C to stop');
  console.log('='.repeat(60) + '\n');
});

process.on('SIGINT', () => {
  log('\n👋 Shutting down...');
  process.exit(0);
});
