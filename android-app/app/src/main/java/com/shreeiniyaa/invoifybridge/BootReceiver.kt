package com.shreeiniyaa.invoifybridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS_NAME = "InvoifyBridgePrefs"
        private const val KEY_PRINTER_ADDRESS = "printer_address"
        private const val KEY_AUTO_START = "auto_start"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || 
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "Boot completed - checking auto-start")
            
            // Check if auto-start is enabled (default: true)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val autoStart = prefs.getBoolean(KEY_AUTO_START, true)
            val printerAddress = prefs.getString(KEY_PRINTER_ADDRESS, null)
            
            if (autoStart && printerAddress != null) {
                Log.d(TAG, "Auto-starting service with printer: $printerAddress")
                
                val serviceIntent = Intent(context, PrinterService::class.java).apply {
                    action = PrinterService.ACTION_START
                    putExtra(PrinterService.EXTRA_PRINTER_ADDRESS, printerAddress)
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else {
                Log.d(TAG, "Auto-start disabled or no printer configured")
            }
        }
    }
}
