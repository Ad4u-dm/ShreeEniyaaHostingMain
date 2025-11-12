#!/usr/bin/env node

/**
 * Arduino USB Serial Bridge for Thermal Printing
 * 
 * This bridge receives ESC/POS print data from your Android app via HTTP
 * and forwards it to Arduino connected via USB serial.
 * 
 * Setup:
 * 1. Upload thermal-printer-emulator.ino to your Arduino
 * 2. Connect Arduino to computer via USB
 * 3. Find Arduino port: ls /dev/ttyUSB* or ls /dev/ttyACM*
 * 4. Install dependencies: npm install express serialport
 * 5. Run: node scripts/bridge-arduino.js
 * 6. Connect phone and computer to same WiFi network
 * 7. Test from phone: http://<computer-ip>:9000/health
 */

const express = require('express');
const { SerialPort } = require('serialport');

const app = express();
const PORT = 9000;

// Configure your Arduino port here
// On Linux: usually /dev/ttyUSB0 or /dev/ttyACM0
// On macOS: usually /dev/cu.usbserial-* or /dev/cu.usbmodem*
// On Windows: usually COM3 or COM4
const ARDUINO_PORT = '/dev/ttyACM0'; // Change this to your Arduino port

// Baud rate (must match Arduino sketch)
const BAUD_RATE = 115200;

let serialPort = null;
let isConnected = false;

// Initialize serial connection
function initializeSerial() {
  console.log(`🔌 Connecting to Arduino on ${ARDUINO_PORT}...`);
  
  serialPort = new SerialPort({
    path: ARDUINO_PORT,
    baudRate: BAUD_RATE,
    autoOpen: false
  });

  serialPort.open((err) => {
    if (err) {
      console.error('❌ Failed to open serial port:', err.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check Arduino is connected via USB');
      console.error('   2. Verify port name with: ls /dev/tty*');
      console.error('   3. Update ARDUINO_PORT in this script');
      console.error('   4. Check permissions: sudo chmod 666 ' + ARDUINO_PORT);
      process.exit(1);
    }
    
    isConnected = true;
    console.log('✅ Connected to Arduino successfully!');
    console.log('📡 HTTP Server starting...\n');
  });

  serialPort.on('data', (data) => {
    // Echo Arduino output to console
    process.stdout.write(data.toString());
  });

  serialPort.on('error', (err) => {
    console.error('❌ Serial port error:', err.message);
    isConnected = false;
  });

  serialPort.on('close', () => {
    console.log('⚠️  Serial port closed');
    isConnected = false;
  });
}

// Middleware
app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// CORS headers for local network access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connected: isConnected,
    port: ARDUINO_PORT,
    message: isConnected ? 'Arduino connected' : 'Arduino disconnected'
  });
});

// Print endpoint
app.post('/print', async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: 'Arduino not connected'
    });
  }

  try {
    let printData;
    
    // Handle different content types
    if (req.is('application/json')) {
      printData = Buffer.from(req.body.data || '', 'base64');
    } else if (req.is('application/octet-stream')) {
      printData = req.body;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type'
      });
    }

    console.log(`\n📄 Printing ${printData.length} bytes...`);
    console.log('━'.repeat(50));
    
    // Send data to Arduino
    serialPort.write(printData, (err) => {
      if (err) {
        console.error('❌ Write error:', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
      
      serialPort.drain(() => {
        console.log('━'.repeat(50));
        console.log('✅ Print job sent to Arduino\n');
        
        res.json({
          success: true,
          message: 'Print job sent successfully',
          bytes: printData.length
        });
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List available serial ports
app.get('/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json({
      ports: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        serialNumber: p.serialNumber,
        vendorId: p.vendorId,
        productId: p.productId
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test print endpoint
app.post('/test', (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: 'Arduino not connected'
    });
  }

  // Simple test message
  const testData = Buffer.from(
    '\x1B\x40' + // Initialize
    '\x1B\x61\x01' + // Center align
    'TEST PRINT\n' +
    'Arduino Emulator\n' +
    '━'.repeat(32) + '\n' +
    '\x1B\x61\x00' + // Left align
    'Date: ' + new Date().toLocaleString() + '\n' +
    '\x1B\x64\x03' + // Feed 3 lines
    '\x1D\x56\x00' // Cut paper
  );

  console.log('\n🧪 Sending test print...');
  console.log('━'.repeat(50));
  
  serialPort.write(testData, (err) => {
    if (err) {
      console.error('❌ Write error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    
    serialPort.drain(() => {
      console.log('━'.repeat(50));
      console.log('✅ Test print sent\n');
      res.json({ success: true, message: 'Test print sent' });
    });
  });
});

// Start server
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     ARDUINO USB SERIAL BRIDGE - RUNNING            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`📡 HTTP Server: http://0.0.0.0:${PORT}`);
    console.log(`🔌 Arduino Port: ${ARDUINO_PORT}`);
    console.log(`📱 Connection Status: ${isConnected ? '✅ Connected' : '⏳ Connecting...'}\n`);
    
    // Get local IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    console.log('🌐 Access from phone using one of these IPs:\n');
    
    Object.keys(interfaces).forEach(iface => {
      interfaces[iface].forEach(details => {
        if (details.family === 'IPv4' && !details.internal) {
          console.log(`   http://${details.address}:${PORT}/health`);
        }
      });
    });
    
    console.log('\n💡 Next steps:');
    console.log('   1. Open Serial Monitor (115200 baud) to see print output');
    console.log('   2. Test from phone: http://<computer-ip>:9000/health');
    console.log('   3. In Android app, it will auto-detect this bridge');
    console.log('   4. Click "Test Print" in app to verify connection\n');
  });
}

// Initialize
initializeSerial();
startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {
      console.log('✅ Serial port closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
