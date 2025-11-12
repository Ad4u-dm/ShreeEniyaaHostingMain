package com.shreeiniyaa.invoifybridge

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.shreeiniyaa.invoifybridge.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var selectedPrinter: BluetoothDevice? = null
    private val pairedDevices = mutableListOf<BluetoothDevice>()
    
    companion object {
        private const val REQUEST_BLUETOOTH_PERMISSIONS = 1
        private const val PREFS_NAME = "InvoifyBridgePrefs"
        private const val KEY_PRINTER_ADDRESS = "printer_address"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialize Bluetooth
        val bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        
        if (bluetoothAdapter == null) {
            Toast.makeText(this, R.string.error_no_bluetooth, Toast.LENGTH_LONG).show()
            finish()
            return
        }
        
        // Check and request permissions
        if (!hasBluetoothPermissions()) {
            requestBluetoothPermissions()
        } else {
            setupUI()
        }
    }
    
    private fun hasBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestBluetoothPermissions() {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            )
        }
        
        ActivityCompat.requestPermissions(this, permissions, REQUEST_BLUETOOTH_PERMISSIONS)
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == REQUEST_BLUETOOTH_PERMISSIONS) {
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                setupUI()
            } else {
                Toast.makeText(this, R.string.error_permissions, Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun setupUI() {
        // Load saved printer
        loadSavedPrinter()
        
        // Scan button
        binding.scanButton.setOnClickListener {
            scanForPrinters()
        }
        
        // Start service button
        binding.startServiceButton.setOnClickListener {
            if (selectedPrinter != null) {
                startPrinterService()
            } else {
                Toast.makeText(this, R.string.select_printer_first, Toast.LENGTH_SHORT).show()
            }
        }
        
        // Stop service button
        binding.stopServiceButton.setOnClickListener {
            stopPrinterService()
        }
        
        // Test print button
        binding.testPrintButton.setOnClickListener {
            testPrint()
        }
        
        // Printer spinner
        binding.printerSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (pairedDevices.isNotEmpty() && position < pairedDevices.size) {
                    selectedPrinter = pairedDevices[position]
                    savePrinterAddress(selectedPrinter?.address)
                    updatePrinterStatus()
                }
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {
                selectedPrinter = null
            }
        }
        
        // Initial scan
        scanForPrinters()
        
        // Update service status
        updateServiceStatus()
    }
    
    private fun scanForPrinters() {
        if (!hasBluetoothPermissions()) {
            requestBluetoothPermissions()
            return
        }
        
        if (bluetoothAdapter?.isEnabled == false) {
            Toast.makeText(this, R.string.error_bluetooth_disabled, Toast.LENGTH_SHORT).show()
            return
        }
        
        Toast.makeText(this, R.string.scanning, Toast.LENGTH_SHORT).show()
        
        try {
            pairedDevices.clear()
            val devices = bluetoothAdapter?.bondedDevices ?: emptySet()
            pairedDevices.addAll(devices)
            
            val deviceNames = pairedDevices.map { "${it.name} (${it.address})" }
            val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, deviceNames)
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            binding.printerSpinner.adapter = adapter
            
            // Restore previously selected printer
            val savedAddress = getSavedPrinterAddress()
            val savedIndex = pairedDevices.indexOfFirst { it.address == savedAddress }
            if (savedIndex >= 0) {
                binding.printerSpinner.setSelection(savedIndex)
            }
            
        } catch (e: SecurityException) {
            Toast.makeText(this, R.string.error_permissions, Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun startPrinterService() {
        selectedPrinter?.let { printer ->
            val serviceIntent = Intent(this, PrinterService::class.java).apply {
                action = PrinterService.ACTION_START
                putExtra(PrinterService.EXTRA_PRINTER_ADDRESS, printer.address)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            
            updateServiceStatus()
            Toast.makeText(this, "Service started", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun stopPrinterService() {
        val serviceIntent = Intent(this, PrinterService::class.java).apply {
            action = PrinterService.ACTION_STOP
        }
        startService(serviceIntent)
        
        updateServiceStatus()
        Toast.makeText(this, "Service stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun testPrint() {
        if (selectedPrinter == null) {
            Toast.makeText(this, R.string.select_printer_first, Toast.LENGTH_SHORT).show()
            return
        }
        
        val serviceIntent = Intent(this, PrinterService::class.java).apply {
            action = PrinterService.ACTION_TEST_PRINT
        }
        startService(serviceIntent)
        
        Toast.makeText(this, R.string.test_print_sent, Toast.LENGTH_SHORT).show()
    }
    
    private fun updateServiceStatus() {
        val isRunning = PrinterService.isRunning
        
        binding.statusText.text = if (isRunning) {
            getString(R.string.service_running)
        } else {
            getString(R.string.service_stopped)
        }
        
        binding.statusText.setTextColor(
            ContextCompat.getColor(
                this,
                if (isRunning) R.color.success else R.color.error
            )
        )
        
        binding.startServiceButton.isEnabled = !isRunning
        binding.stopServiceButton.isEnabled = isRunning
    }
    
    private fun updatePrinterStatus() {
        selectedPrinter?.let { printer ->
            binding.printerStatus.text = getString(R.string.printer_connected, printer.name)
            binding.printerStatus.setTextColor(ContextCompat.getColor(this, R.color.success))
        } ?: run {
            binding.printerStatus.text = getString(R.string.no_printer_selected)
            binding.printerStatus.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
        }
    }
    
    private fun savePrinterAddress(address: String?) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putString(KEY_PRINTER_ADDRESS, address)
            .apply()
    }
    
    private fun getSavedPrinterAddress(): String? {
        return getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getString(KEY_PRINTER_ADDRESS, null)
    }
    
    private fun loadSavedPrinter() {
        val savedAddress = getSavedPrinterAddress()
        if (savedAddress != null && hasBluetoothPermissions()) {
            try {
                bluetoothAdapter?.bondedDevices?.find { it.address == savedAddress }?.let {
                    selectedPrinter = it
                }
            } catch (e: SecurityException) {
                // Ignore
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        updateServiceStatus()
    }
}
