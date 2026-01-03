'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatusType {
  initialized: boolean;
  lastSync?: {
    success: boolean;
    timestamp: string;
    changesReceived?: number;
    applied?: number;
    errors?: number;
    error?: string;
  };
  isOnline: boolean;
}

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      setIsElectron(true);
      loadStatus();
      
      // Poll status every 10 seconds
      const interval = setInterval(loadStatus, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  async function loadStatus() {
    try {
      const s = await (window as any).electron.sync.getStatus();
      setStatus(s);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  async function handleManualSync() {
    if (!status?.isOnline) {
      alert('Cannot sync: Device is offline');
      return;
    }

    setSyncing(true);
    try {
      const result = await (window as any).electron.sync.pullFromServer();
      await loadStatus();
      
      if (result.success) {
        alert(`Sync completed: ${result.applied} items updated`);
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed. Check your internet connection.');
    } finally {
      setSyncing(false);
    }
  }

  // Don't render if not in Electron
  if (!isElectron || !status) {
    return null;
  }

  const lastSyncTime = status.lastSync?.timestamp 
    ? new Date(status.lastSync.timestamp).toLocaleString()
    : 'Never';

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border border-gray-200 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {status.isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          Sync Status
        </h3>
        
        <button
          onClick={handleManualSync}
          disabled={!status.isOnline || syncing}
          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600">Last synced:</span>
          <span className="font-medium">{lastSyncTime}</span>
        </div>

        {status.lastSync && (
          <div className="flex items-center gap-2">
            {status.lastSync.success ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-700">
                  {status.lastSync.applied || 0} items synced
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span className="text-red-700">
                  Sync failed: {status.lastSync.error}
                </span>
              </>
            )}
          </div>
        )}

        {!status.isOnline && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Offline Mode</div>
                <div className="text-xs mt-1">
                  You can view data, but creating or editing requires an internet connection.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
