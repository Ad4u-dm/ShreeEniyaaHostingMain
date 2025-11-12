package com.shreeiniyaa.invoifybridge

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Log
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

class BluetoothPrinterManager(
    private val context: Context,
    private val printerAddress: String?
) {
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    
    companion object {
        private const val TAG = "BluetoothPrinter"
        // Standard UUID for SPP (Serial Port Profile)
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        
        // ESC/POS Commands
        private const val ESC = '\u001B'
        private const val GS = '\u001D'
        
        private val INIT = "$ESC@"
        private val CUT_PAPER = "${GS}V66\u0000"
    }
    
    init {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        
        // Auto-connect to printer
        printerAddress?.let { connect(it) }
    }
    
    fun isConnected(): Boolean {
        return bluetoothSocket?.isConnected == true
    }
    
    @Suppress("MissingPermission")
    fun connect(address: String): Boolean {
        return try {
            val device = bluetoothAdapter?.getRemoteDevice(address)
            bluetoothSocket = device?.createRfcommSocketToServiceRecord(SPP_UUID)
            bluetoothSocket?.connect()
            outputStream = bluetoothSocket?.outputStream
            
            Log.d(TAG, "Connected to printer: $address")
            true
        } catch (e: IOException) {
            Log.e(TAG, "Failed to connect to printer: ${e.message}")
            disconnect()
            false
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied: ${e.message}")
            false
        }
    }
    
    fun disconnect() {
        try {
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e(TAG, "Error closing connection: ${e.message}")
        } finally {
            outputStream = null
            bluetoothSocket = null
        }
    }
    
    fun print(data: String): Boolean {
        if (!isConnected() && printerAddress != null) {
            connect(printerAddress)
        }
        
        return try {
            outputStream?.write(data.toByteArray(Charsets.ISO_8859_1))
            outputStream?.flush()
            Log.d(TAG, "Print successful")
            true
        } catch (e: IOException) {
            Log.e(TAG, "Print failed: ${e.message}")
            disconnect()
            false
        }
    }
    
    fun printTestReceipt(): Boolean {
        val testReceipt = buildString {
            append(INIT)  // Initialize
            append("${ESC}a1")  // Center align
            append("${GS}!17")  // Double size
            append("TEST PRINT\n")
            append("${GS}!0")  // Normal size
            append("${ESC}a0")  // Left align
            append("--------------------------------\n")
            append("Invoify Bridge\n")
            append("Bluetooth Thermal Printing\n")
            append("--------------------------------\n")
            append("Status: Connected\n")
            append("Printer: ${printerAddress ?: "Unknown"}\n")
            append("--------------------------------\n")
            append("${ESC}a1")  // Center
            append("Test Successful!\n\n\n")
            append(CUT_PAPER)  // Cut paper
        }
        
        return print(testReceipt)
    }
    
    @Suppress("MissingPermission")
    fun getPairedDevices(): List<Map<String, String>> {
        return try {
            bluetoothAdapter?.bondedDevices?.map {
                mapOf(
                    "name" to (it.name ?: "Unknown"),
                    "address" to it.address
                )
            } ?: emptyList()
        } catch (e: SecurityException) {
            emptyList()
        }
    }
}
