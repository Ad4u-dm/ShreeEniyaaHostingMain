package com.shreeiniyaa.invoifybridge

import com.google.gson.Gson
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject

class HttpServer(
    port: Int,
    private val bluetoothManager: BluetoothPrinterManager
) : NanoHTTPD(port) {
    
    private val gson = Gson()
    
    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        val method = session.method
        
        // Add CORS headers
        val response = when {
            uri == "/health" && method == Method.GET -> handleHealth()
            uri == "/print" && method == Method.POST -> handlePrint(session)
            uri == "/test" && method == Method.POST -> handleTestPrint()
            uri == "/devices" && method == Method.GET -> handleDevices()
            else -> newFixedLengthResponse(
                Response.Status.NOT_FOUND,
                "application/json",
                """{"error": "Not found"}"""
            )
        }
        
        // Add CORS headers to response
        response.addHeader("Access-Control-Allow-Origin", "*")
        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.addHeader("Access-Control-Allow-Headers", "Content-Type")
        
        return response
    }
    
    private fun handleHealth(): Response {
        val status = if (bluetoothManager.isConnected()) "connected" else "disconnected"
        val json = """{"status": "ok", "printer": "$status"}"""
        return newFixedLengthResponse(Response.Status.OK, "application/json", json)
    }
    
    private fun handlePrint(session: IHTTPSession): Response {
        return try {
            // Read POST body
            val files = HashMap<String, String>()
            session.parseBody(files)
            val body = files["postData"] ?: ""
            
            // Parse JSON
            val json = JSONObject(body)
            val data = json.getString("data")
            
            // Print via Bluetooth
            val success = bluetoothManager.print(data)
            
            if (success) {
                newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    """{"success": true}"""
                )
            } else {
                newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    """{"success": false, "error": "Print failed"}"""
                )
            }
        } catch (e: Exception) {
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                """{"success": false, "error": "${e.message}"}"""
            )
        }
    }
    
    private fun handleTestPrint(): Response {
        return try {
            val success = bluetoothManager.printTestReceipt()
            
            if (success) {
                newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    """{"success": true}"""
                )
            } else {
                newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    """{"success": false, "error": "Test print failed"}"""
                )
            }
        } catch (e: Exception) {
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                """{"success": false, "error": "${e.message}"}"""
            )
        }
    }
    
    private fun handleDevices(): Response {
        val devices = bluetoothManager.getPairedDevices()
        val json = gson.toJson(mapOf("devices" to devices))
        return newFixedLengthResponse(Response.Status.OK, "application/json", json)
    }
}
