# Offline-First Sync System

## Overview
The Windows EXE uses **SQLite for local read-only caching** and **MongoDB on the backend** for all write operations. This architecture provides offline viewing capability while ensuring data integrity.

## Architecture

### Local (EXE)
- **Database**: SQLite (embedded, lightweight)
- **Location**: `%APPDATA%/Invoify/database/invoify.sqlite`
- **Purpose**: Read-only cache for offline viewing
- **Sync**: Pull-only from backend

### Backend (Server)
- **Database**: MongoDB
- **Purpose**: Authoritative source, handles all writes
- **API**: `/api/sync/pull` endpoint returns changes since timestamp

## How It Works

### 1. Initial Setup
- On first run, EXE creates empty SQLite database
- User logs in → auth token stored securely
- Initial sync pulls all data from backend

### 2. Sync Process
```
┌─────────────┐        Pull Changes         ┌──────────────┐
│   EXE       │ ◄───────────────────────────│   Backend    │
│  (SQLite)   │                             │  (MongoDB)   │
└─────────────┘                             └──────────────┘
     │                                              ▲
     │ Read Only                                    │
     │ (Display Data)                               │ Write Operations
     │                                              │ (Create/Update/Delete)
     └──────────────────────────────────────────────┘
                      When Online
```

### 3. Sync Triggers
- **Automatic**: Every 5 minutes (when online)
- **Manual**: User clicks "Refresh" button
- **After Login**: Immediate sync after authentication
- **After Resume**: When system wakes from sleep

### 4. Offline Behavior
- UI shows "Offline" indicator
- All write buttons/forms are **disabled**
- Data remains readable from local SQLite
- Last sync timestamp displayed

## API Reference

### Backend Endpoint

**GET /api/sync/pull**

Query Parameters:
- `since` (optional): ISO timestamp - returns changes since this time
- `limit` (optional): Max number of changes (default: 1000)

Response:
```json
{
  "success": true,
  "serverTime": "2026-01-01T12:00:00Z",
  "changes": [
    {
      "type": "upsert",
      "collection": "users",
      "mongoId": "642abc...",
      "payload": { ...user data... },
      "updatedAt": "2026-01-01T11:59:00Z"
    },
    {
      "type": "delete",
      "collection": "plans",
      "mongoId": "642def..."
    }
  ],
  "count": 150,
  "hasMore": false
}
```

### Frontend API (Electron)

```javascript
// Available via window.electron.sync

// Trigger manual sync
await window.electron.sync.pullFromServer();

// Get sync status
const status = await window.electron.sync.getStatus();
// Returns: { initialized: true, lastSync: {...}, isOnline: true }

// Check if online
const online = await window.electron.sync.getOnlineStatus();

// Set auth token after login
await window.electron.sync.setAuthToken(token);
```

## Usage Examples

### 1. Display Sync Status in UI
```jsx
'use client';

import { useEffect, useState } from 'react';

export function SyncStatus() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      loadStatus();
      // Refresh status every 10 seconds
      const interval = setInterval(loadStatus, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  async function loadStatus() {
    const s = await window.electron.sync.getStatus();
    setStatus(s);
  }

  async function handleSync() {
    setSyncing(true);
    await window.electron.sync.pullFromServer();
    await loadStatus();
    setSyncing(false);
  }

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status.isOnline ? (
        <span className="text-green-600">● Online</span>
      ) : (
        <span className="text-red-600">● Offline</span>
      )}
      {status.lastSync && (
        <span className="text-gray-600">
          Last synced: {new Date(status.lastSync.timestamp).toLocaleString()}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={!status.isOnline || syncing}
        className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Refresh'}
      </button>
    </div>
  );
}
```

### 2. Disable Write Actions Offline
```jsx
export function CreateInvoiceButton() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (window.electron) {
      window.electron.sync.getOnlineStatus().then(setIsOnline);
    }
  }, []);

  return (
    <button
      disabled={!isOnline}
      className="..."
      title={!isOnline ? "Internet connection required" : ""}
    >
      Create Invoice
    </button>
  );
}
```

### 3. Handle Login + Initial Sync
```jsx
async function handleLogin(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.token) {
    // Store token and trigger sync
    localStorage.setItem('auth-token', data.token);
    
    if (window.electron) {
      await window.electron.sync.setAuthToken(data.token);
      // Sync will happen automatically
    }
  }
}
```

## Building the EXE

### Prerequisites
```bash
npm install
npm install --save-dev electron-store
```

### Build Steps
```bash
# 1. Build Next.js standalone
npm run build:standalone

# 2. Generate Prisma client for Windows
npx prisma generate

# 3. Run prebuild (copies files, generates client)
node scripts/prebuild-electron.js

# 4. Build Windows installer
npm run electron:build
```

Output: `release/Invoify Setup x.x.x.exe`

## Security Notes

- Auth tokens stored with electron-store encryption
- Local SQLite has no sensitive encryption (add if needed)
- All network requests use HTTPS + JWT
- Backend validates all write operations

## Troubleshooting

### Sync not working
1. Check backend URL in .env: `NEXT_PUBLIC_API_URL`
2. Verify auth token is set after login
3. Check network connectivity
4. Look at Electron console logs

### Database errors
1. Check database path: `%APPDATA%/Invoify/database/`
2. Delete database file to reset (will re-sync)
3. Ensure Prisma client generated for Windows

### Build errors
1. Run `npx prisma generate` manually
2. Check `node_modules/.prisma/client` exists
3. Ensure `electron-store` is installed

## Next Steps

1. **Add conflict UI** (if enabling offline writes later)
2. **Implement delta sync** for large datasets (pagination)
3. **Add backup/export** for local database
4. **Metrics/monitoring** for sync health
5. **Encryption** for sensitive local data
