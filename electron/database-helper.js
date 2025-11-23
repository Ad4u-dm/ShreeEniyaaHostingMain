const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Database Helper for Electron App
 * Handles SQLite database paths correctly in packaged and dev environments
 */

class DatabaseHelper {
  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.userDataPath = app.getPath('userData');
    this.dbPath = null;
    this.dbDir = null;
  }

  /**
   * Get the correct database path for the current environment
   */
  getDatabasePath() {
    if (this.dbPath) return this.dbPath;

    if (this.isDev) {
      // Development: use project root
      this.dbDir = path.join(process.cwd(), 'prisma');
      this.dbPath = path.join(this.dbDir, 'local_chitfund.db');
    } else {
      // Production: use app data directory
      this.dbDir = path.join(this.userDataPath, 'database');
      this.dbPath = path.join(this.dbDir, 'local_chitfund.db');
    }

    // Ensure database directory exists
    this.ensureDatabaseDirectory();

    console.log('Database path:', this.dbPath);
    return this.dbPath;
  }

  /**
   * Ensure the database directory exists
   */
  ensureDatabaseDirectory() {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
      console.log('Created database directory:', this.dbDir);
    }
  }

  /**
   * Initialize database (copy schema if needed)
   */
  async initializeDatabase() {
    const dbPath = this.getDatabasePath();

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.log('Database does not exist, will be created on first Prisma migration');

      // In production, you might want to copy a template database
      if (!this.isDev) {
        const templateDbPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'prisma', 'local_chitfund.db');
        if (fs.existsSync(templateDbPath)) {
          fs.copyFileSync(templateDbPath, dbPath);
          console.log('Copied template database to user data');
        }
      }
    }

    return dbPath;
  }

  /**
   * Get database URL for Prisma
   */
  getDatabaseUrl() {
    const dbPath = this.getDatabasePath();
    // Convert Windows backslashes to forward slashes for Prisma
    const normalizedPath = dbPath.replace(/\\/g, '/');
    return `file:${normalizedPath}`;
  }

  /**
   * Set environment variable for Prisma
   */
  setPrismaEnvironment() {
    const databaseUrl = this.getDatabaseUrl();
    process.env.DATABASE_URL = databaseUrl;
    console.log('Set DATABASE_URL:', databaseUrl);
  }
}

module.exports = new DatabaseHelper();
