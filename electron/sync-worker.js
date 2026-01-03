/**
 * Electron Sync Worker - Pull-only sync from backend MongoDB to local SQLite
 * This worker pulls data from the backend and updates the local cache.
 * All writes are blocked offline and sent directly to backend when online.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class SyncWorker {
  constructor(backendUrl, authToken) {
    this.backendUrl = backendUrl;
    this.authToken = authToken;
    this.prisma = null;
    this.isSyncing = false;
    this.lastSyncStatus = null;
  }

  /**
   * Initialize Prisma client with SQLite database in app data directory
   */
  async initialize() {
    try {
      // Get app data directory
      const userDataPath = app.getPath('userData');
      const dbDir = path.join(userDataPath, 'database');
      
      // Create database directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, 'invoify.sqlite');
      console.log('[SyncWorker] Database path:', dbPath);

      // Set DATABASE_URL for Prisma
      process.env.DATABASE_URL = `file:${dbPath}`;

      // Initialize Prisma client
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${dbPath}`
          }
        },
        log: ['error', 'warn']
      });

      // Connect to database
      await this.prisma.$connect();
      console.log('[SyncWorker] Connected to local SQLite database');

      // Check if database needs initialization
      const syncStatus = await this.getSyncStatus();
      if (!syncStatus) {
        console.log('[SyncWorker] First run - creating initial sync status');
        await this.prisma.syncStatus.create({
          data: {
            lastPullAt: new Date(0), // Epoch for initial full sync
            lastPushAt: new Date(0),
            entityName: 'global',
            direction: 'FROM_CLOUD'
          }
        });
      }

      return true;
    } catch (error) {
      console.error('[SyncWorker] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Get last sync status from local database
   */
  async getSyncStatus() {
    try {
      return await this.prisma.syncStatus.findFirst({
        where: { entityName: 'global' }
      });
    } catch (error) {
      console.error('[SyncWorker] Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Update last pull timestamp
   */
  async updateLastPullAt(timestamp) {
    try {
      await this.prisma.syncStatus.updateMany({
        where: { entityName: 'global' },
        data: { lastPullAt: new Date(timestamp) }
      });
    } catch (error) {
      console.error('[SyncWorker] Error updating lastPullAt:', error);
    }
  }

  /**
   * Pull changes from backend and update local cache
   */
  async pullChanges() {
    if (this.isSyncing) {
      console.log('[SyncWorker] Sync already in progress, skipping');
      return { success: false, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('[SyncWorker] Starting pull sync...');

      // Get last pull timestamp
      const syncStatus = await this.getSyncStatus();
      const lastPullAt = syncStatus?.lastPullAt || new Date(0);
      
      console.log('[SyncWorker] Last pull at:', lastPullAt.toISOString());

      // Call backend sync endpoint
      const url = `${this.backendUrl}/api/sync/pull?since=${lastPullAt.toISOString()}&limit=5000`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      console.log(`[SyncWorker] Received ${data.changes.length} changes from server`);

      // Apply changes to local database
      let applied = 0;
      let errors = 0;

      for (const change of data.changes) {
        try {
          if (change.type === 'upsert') {
            await this.applyUpsert(change);
            applied++;
          } else if (change.type === 'delete') {
            await this.applyDelete(change);
            applied++;
          }
        } catch (error) {
          console.error(`[SyncWorker] Error applying change for ${change.collection}:`, error);
          errors++;
        }
      }

      // Update last pull timestamp
      await this.updateLastPullAt(data.serverTime);

      const duration = Date.now() - startTime;
      this.lastSyncStatus = {
        success: true,
        timestamp: new Date(),
        changesReceived: data.changes.length,
        applied,
        errors,
        duration,
        serverTime: data.serverTime
      };

      console.log(`[SyncWorker] Sync completed in ${duration}ms - Applied: ${applied}, Errors: ${errors}`);

      return this.lastSyncStatus;

    } catch (error) {
      console.error('[SyncWorker] Sync error:', error);
      this.lastSyncStatus = {
        success: false,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      };
      return this.lastSyncStatus;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Apply upsert change to local database
   */
  async applyUpsert(change) {
    const { collection, mongoId, payload } = change;

    // Map collection name to Prisma model
    const modelMap = {
      'users': 'user',
      'plans': 'plan',
      'enrollments': 'enrollment',
      'invoices': 'invoice',
      'payments': 'payment'
    };

    const modelName = modelMap[collection];
    if (!modelName) {
      console.warn(`[SyncWorker] Unknown collection: ${collection}`);
      return;
    }

    // Prepare data - convert dates and clean payload
    const data = this.preparePayloadForPrisma(payload);
    data.mongoId = mongoId;
    data.lastSyncedAt = new Date(change.updatedAt);

    try {
      // Upsert using mongoId as unique identifier
      await this.prisma[modelName].upsert({
        where: { mongoId },
        update: data,
        create: data
      });
    } catch (error) {
      console.error(`[SyncWorker] Upsert error for ${collection}/${mongoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Apply delete change to local database
   */
  async applyDelete(change) {
    const { collection, mongoId } = change;

    const modelMap = {
      'users': 'user',
      'plans': 'plan',
      'enrollments': 'enrollment',
      'invoices': 'invoice',
      'payments': 'payment'
    };

    const modelName = modelMap[collection];
    if (!modelName) {
      console.warn(`[SyncWorker] Unknown collection: ${collection}`);
      return;
    }

    try {
      await this.prisma[modelName].deleteMany({
        where: { mongoId }
      });
    } catch (error) {
      console.error(`[SyncWorker] Delete error for ${collection}/${mongoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Prepare payload for Prisma - convert dates, remove MongoDB-specific fields
   */
  preparePayloadForPrisma(payload) {
    const cleaned = { ...payload };
    
    // Remove MongoDB-specific fields
    delete cleaned._id;
    delete cleaned.__v;
    
    // Convert date strings to Date objects
    const dateFields = ['createdAt', 'updatedAt', 'dateOfBirth', 'startDate', 'endDate', 'dueDate', 'paymentDate', 'invoiceDate'];
    for (const field of dateFields) {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        cleaned[field] = new Date(cleaned[field]);
      }
    }

    // Convert numeric strings to numbers if needed
    const numericFields = ['amount', 'totalAmount', 'paidAmount', 'pendingAmount', 'monthlyAmount', 'totalDue', 'totalPaid', 'remainingAmount'];
    for (const field of numericFields) {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        cleaned[field] = parseFloat(cleaned[field]);
      }
    }

    return cleaned;
  }

  /**
   * Get sync status for UI display
   */
  getLastSyncStatus() {
    return this.lastSyncStatus;
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      console.log('[SyncWorker] Disconnected from database');
    }
  }
}

module.exports = SyncWorker;
