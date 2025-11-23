const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Environment Handler for Electron App
 * Loads environment variables from embedded .env files
 */

class EnvHandler {
  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.loaded = false;
  }

  /**
   * Load environment variables from .env file
   */
  loadEnv() {
    if (this.loaded) return;

    let envPath;

    if (this.isDev) {
      // Development: use .env in project root
      envPath = path.join(process.cwd(), '.env');
    } else {
      // Production: try multiple locations
      const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', '.env'),
        path.join(app.getAppPath(), '.next', 'standalone', '.env'),
        path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), '.next', 'standalone', '.env'),
      ];

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          envPath = testPath;
          break;
        }
      }
    }

    if (envPath && fs.existsSync(envPath)) {
      console.log('Loading environment from:', envPath);
      this.parseEnvFile(envPath);
      this.loaded = true;
    } else {
      console.log('No .env file found, using defaults');
      this.setDefaults();
    }
  }

  /**
   * Parse .env file and set environment variables
   */
  parseEnvFile(filePath) {
    try {
      const envContent = fs.readFileSync(filePath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        // Skip comments and empty lines
        if (!line || line.trim().startsWith('#')) continue;

        const match = line.match(/^\s*([^=]+)\s*=\s*(.+)\s*$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();

          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '');

          // Only set if not already set
          if (!process.env[key]) {
            process.env[key] = value;
            console.log(`Set ${key} from .env`);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing .env file:', error);
      this.setDefaults();
    }
  }

  /**
   * Set default environment variables
   */
  setDefaults() {
    const defaults = {
      NODE_ENV: 'production',
      PORT: '3000',
      HOSTNAME: 'localhost',
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  /**
   * Get environment variable with fallback
   */
  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }
}

module.exports = new EnvHandler();
