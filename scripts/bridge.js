#!/usr/bin/env node

/**
 * Bluetooth Thermal Printer Bridge
 * 
 * This server listens for HTTP requests from the web app and sends
 * ESC/POS commands to a paired Bluetooth SPP thermal printer.
 * 
 * Usage:
 *   node scripts/bridge.js
 * 
 * Requirements:
 *   - Printer must be paired via Bluetooth (PIN: 0000 or 1234)
 *   - Printer must be ESC/POS compatible (Shreyans 80mm)
 * 
 * Note: This version uses net.Socket to connect to Bluetooth RFCOMM
 * For production, ensure your OS supports Bluetooth SPP over /dev/rfcomm
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.BRIDGE_PORT || 9000;

// Configuration
const CONFIG = {
  printerName: process.env.PRINTER_NAME || 'SHREYANS',
  printerMAC: process.env.PRINTER_MAC || null,
  rfcommDevice: process.env.RFCOMM_DEVICE || '/dev/rfcomm0',  // For Linux
  autoDetect: true,
  retryAttempts: 3,
  retryDelay: 1000,
  useDirectFile: process.env.USE_DIRECT_FILE === 'true', // For Android Termux or direct device access
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,           // Initialize printer
  ALIGN_CENTER: `${ESC}a1`,  // Center align
  ALIGN_LEFT: `${ESC}a0`,    // Left align
  BOLD_ON: `${ESC}E1`,       // Bold on
  BOLD_OFF: `${ESC}E0`,      // Bold off
  SIZE_NORMAL: `${GS}!0`,    // Normal size
  SIZE_DOUBLE: `${GS}!17`,   // Double width & height
  CUT_PAPER: `${GS}V66\x00`, // Cut paper (auto cutter)
  LINE_FEED: '\n',
  RESET: `${ESC}@`,
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Find Bluetooth printer
async function findPrinter() {
  return new Promise((resolve, reject) => {
    const btSerial = new BluetoothSerialPort();
    const devices = [];

    log('🔍 Scanning for Bluetooth devices...');

    btSerial.on('found', (address, name) => {
      log(`Found device: ${name} [${address}]`);
      devices.push({ address, name });

      // Check if this is our printer
      if (CONFIG.printerMAC && address === CONFIG.printerMAC) {
        log(`✅ Found configured printer: ${name} [${address}]`);
        btSerial.close();
        resolve({ address, name });
      } else if (name && name.toUpperCase().includes(CONFIG.printerName.toUpperCase())) {
        log(`✅ Found printer by name: ${name} [${address}]`);
        btSerial.close();
        resolve({ address, name });
      }
    });

    btSerial.on('finished', () => {
      if (devices.length === 0) {
        reject(new Error('No Bluetooth devices found'));
      } else {
        // Return first device if no match found
        log(`⚠️ Printer "${CONFIG.printerName}" not found. Available devices:`);
        devices.forEach(d => log(`  - ${d.name} [${d.address}]`));
        reject(new Error(`Printer "${CONFIG.printerName}" not found`));
      }
    });

    btSerial.inquire();
  });
}

// Print to Bluetooth printer
async function printViaBluetooth(data, printerAddress) {
  return new Promise((resolve, reject) => {
    const btSerial = new BluetoothSerialPort();
    
    log(`📡 Connecting to printer: ${printerAddress}`);

    btSerial.findSerialPortChannel(printerAddress, (channel) => {
      if (!channel) {
        return reject(new Error('Could not find SPP channel'));
      }

      btSerial.connect(printerAddress, channel, () => {
        log('✅ Connected to printer');

        // Convert data to Buffer if it's a string
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
        
        btSerial.write(buffer, (err, bytesWritten) => {
          if (err) {
            log('❌ Write error:', err);
            btSerial.close();
            return reject(err);
          }

          log(`✅ Sent ${bytesWritten} bytes to printer`);

          // Wait a bit before closing to ensure data is sent
          setTimeout(() => {
            btSerial.close();
            log('📴 Disconnected from printer');
            resolve({ success: true, bytesWritten });
          }, 500);
        });
      }, (err) => {
        log('❌ Connection error:', err);
        reject(err);
      });
    }, (err) => {
      log('❌ Channel discovery error:', err);
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bluetooth Thermal Print Bridge',
    version: '1.0.0',
    printer: CONFIG.printerName,
    timestamp: new Date().toISOString()
  });
});

// List available Bluetooth devices
app.get('/devices', async (req, res) => {
  try {
    const btSerial = new BluetoothSerialPort();
    const devices = [];

    btSerial.on('found', (address, name) => {
      devices.push({ address, name });
    });

    btSerial.on('finished', () => {
      btSerial.close();
      res.json({ success: true, devices });
    });

    btSerial.inquire();
  } catch (error) {
    log('❌ Error listing devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    log('📥 Received print request');

    let printData;
    
    // Handle different content types
    if (req.is('application/json')) {
      const { data, raw } = req.body;
      printData = raw || data;
    } else if (req.is('application/octet-stream')) {
      printData = req.body;
    } else {
      printData = req.body.data || req.body;
    }

    if (!printData) {
      return res.status(400).json({
        success: false,
        error: 'No print data provided'
      });
    }

    log(`📄 Print data size: ${Buffer.byteLength(printData)} bytes`);

    // Find printer if not cached
    let printerAddress = CONFIG.printerMAC;
    
    if (!printerAddress && CONFIG.autoDetect) {
      log('🔍 Auto-detecting printer...');
      const printer = await findPrinter();
      printerAddress = printer.address;
      CONFIG.printerMAC = printerAddress; // Cache for next time
    }

    if (!printerAddress) {
      throw new Error('Printer address not configured. Set PRINTER_MAC env variable or enable auto-detect.');
    }

    // Add initialization and cut commands
    const fullData = COMMANDS.INIT + printData + '\n\n\n' + COMMANDS.CUT_PAPER;

    // Print with retry
    const result = await withRetry(() => printViaBluetooth(fullData, printerAddress));

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
      'Bridge: Bluetooth Thermal Printer\n' +
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

    let printerAddress = CONFIG.printerMAC;
    
    if (!printerAddress && CONFIG.autoDetect) {
      const printer = await findPrinter();
      printerAddress = printer.address;
      CONFIG.printerMAC = printerAddress;
    }

    if (!printerAddress) {
      throw new Error('Printer not found');
    }

    await withRetry(() => printViaBluetooth(testReceipt, printerAddress));

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
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🖨️  Bluetooth Thermal Print Bridge');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
  console.log(`🔍 Looking for printer: "${CONFIG.printerName}"`);
  if (CONFIG.printerMAC) {
    console.log(`📍 Configured MAC: ${CONFIG.printerMAC}`);
  }
  console.log('\nAvailable endpoints:');
  console.log(`  GET  /health      - Health check`);
  console.log(`  GET  /devices     - List Bluetooth devices`);
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
