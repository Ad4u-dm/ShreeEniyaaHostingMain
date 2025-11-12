package com.shreeiniyaa.invoifybridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class PrinterService : Service() {
    
    private var httpServer: HttpServer? = null
    private var bluetoothManager: BluetoothPrinterManager? = null
    private var printerAddress: String? = null
    
    companion object {
        const val ACTION_START = "com.shreeiniyaa.invoifybridge.ACTION_START"
        const val ACTION_STOP = "com.shreeiniyaa.invoifybridge.ACTION_STOP"
        const val ACTION_TEST_PRINT = "com.shreeiniyaa.invoifybridge.ACTION_TEST_PRINT"
        const val EXTRA_PRINTER_ADDRESS = "printer_address"
        
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "PrinterServiceChannel"
        
        var isRunning = false
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                printerAddress = intent.getStringExtra(EXTRA_PRINTER_ADDRESS)
                startForegroundService()
            }
            ACTION_STOP -> {
                stopForegroundService()
            }
            ACTION_TEST_PRINT -> {
                sendTestPrint()
            }
        }
        
        return START_STICKY
    }
    
    private fun startForegroundService() {
        isRunning = true
        
        // Start foreground service with notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Initialize Bluetooth manager
        bluetoothManager = BluetoothPrinterManager(this, printerAddress)
        
        // Start HTTP server on port 9000 (same as desktop bridge)
        httpServer = HttpServer(9000, bluetoothManager!!)
        httpServer?.start()
    }
    
    private fun stopForegroundService() {
        isRunning = false
        
        // Stop HTTP server
        httpServer?.stop()
        httpServer = null
        
        // Disconnect Bluetooth
        bluetoothManager?.disconnect()
        bluetoothManager = null
        
        // Stop foreground service
        stopForeground(true)
        stopSelf()
    }
    
    private fun sendTestPrint() {
        bluetoothManager?.printTestReceipt()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_description)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_message))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopForegroundService()
    }
}
