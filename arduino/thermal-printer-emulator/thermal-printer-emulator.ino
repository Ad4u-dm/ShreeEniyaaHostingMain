/*
 * Thermal Printer Emulator for Arduino
 * 
 * This sketch emulates a thermal printer by receiving ESC/POS commands
 * via USB Serial and displaying them in a human-readable format.
 * 
 * Upload this to your Arduino, then open Serial Monitor at 115200 baud
 * to see the print data coming from your Android app.
 * 
 * Compatible with: Arduino Uno, Nano, Mega, etc.
 */

// ESC/POS Command Definitions
#define ESC 0x1B
#define GS  0x1D
#define LF  0x0A
#define CR  0x0D

// Buffer for incoming data
String lineBuffer = "";
bool inEscSequence = false;
int escCommandLength = 0;
byte escCommand[10];

void setup() {
  // Initialize serial at 115200 baud (same as thermal printers)
  Serial.begin(115200);
  
  delay(1000);
  
  // Print startup message
  Serial.println(F("\n╔════════════════════════════════════════╗"));
  Serial.println(F("║  THERMAL PRINTER EMULATOR - READY      ║"));
  Serial.println(F("║  Waiting for print data...             ║"));
  Serial.println(F("╚════════════════════════════════════════╝\n"));
}

void loop() {
  if (Serial.available() > 0) {
    byte incomingByte = Serial.read();
    
    // Handle ESC/POS commands
    if (incomingByte == ESC || incomingByte == GS) {
      if (lineBuffer.length() > 0) {
        printLine();
      }
      inEscSequence = true;
      escCommand[0] = incomingByte;
      escCommandLength = 1;
      return;
    }
    
    // Continue collecting ESC sequence
    if (inEscSequence) {
      escCommand[escCommandLength++] = incomingByte;
      
      // Check for complete commands
      if (isCommandComplete()) {
        handleEscCommand();
        inEscSequence = false;
        escCommandLength = 0;
      }
      return;
    }
    
    // Handle regular text and control characters
    switch (incomingByte) {
      case LF: // Line feed
        printLine();
        break;
        
      case CR: // Carriage return (ignore)
        break;
        
      default: // Regular character
        if (incomingByte >= 32 && incomingByte <= 126) {
          lineBuffer += (char)incomingByte;
        }
        break;
    }
  }
}

bool isCommandComplete() {
  // ESC @ (Initialize)
  if (escCommand[0] == ESC && escCommandLength >= 2 && escCommand[1] == '@') {
    return true;
  }
  
  // ESC a (Alignment)
  if (escCommand[0] == ESC && escCommandLength >= 2 && escCommand[1] == 'a') {
    return escCommandLength >= 3;
  }
  
  // ESC E (Bold)
  if (escCommand[0] == ESC && escCommandLength >= 2 && escCommand[1] == 'E') {
    return escCommandLength >= 3;
  }
  
  // ESC d (Feed lines)
  if (escCommand[0] == ESC && escCommandLength >= 2 && escCommand[1] == 'd') {
    return escCommandLength >= 3;
  }
  
  // GS V (Cut paper)
  if (escCommand[0] == GS && escCommandLength >= 2 && escCommand[1] == 'V') {
    return escCommandLength >= 3;
  }
  
  // ESC M (Font selection)
  if (escCommand[0] == ESC && escCommandLength >= 2 && escCommand[1] == 'M') {
    return escCommandLength >= 3;
  }
  
  // Default: assume 2-byte command
  return escCommandLength >= 2;
}

void handleEscCommand() {
  if (escCommand[0] == ESC) {
    switch (escCommand[1]) {
      case '@': // Initialize printer
        Serial.println(F("\n[INIT PRINTER]"));
        lineBuffer = "";
        break;
        
      case 'a': // Set alignment
        if (lineBuffer.length() > 0) printLine();
        if (escCommandLength >= 3) {
          switch (escCommand[2]) {
            case 0:
              Serial.println(F("[ALIGN LEFT]"));
              break;
            case 1:
              Serial.println(F("[ALIGN CENTER]"));
              break;
            case 2:
              Serial.println(F("[ALIGN RIGHT]"));
              break;
          }
        }
        break;
        
      case 'E': // Bold on/off
        if (escCommandLength >= 3) {
          if (escCommand[2] == 1) {
            Serial.print(F("[BOLD ON] "));
          } else {
            Serial.print(F("[BOLD OFF] "));
          }
        }
        break;
        
      case 'd': // Feed lines
        if (escCommandLength >= 3) {
          for (int i = 0; i < escCommand[2]; i++) {
            Serial.println();
          }
        }
        break;
        
      case 'M': // Font selection
        if (escCommandLength >= 3) {
          Serial.print(F("[FONT "));
          Serial.print(escCommand[2]);
          Serial.println(F("]"));
        }
        break;
    }
  } else if (escCommand[0] == GS) {
    switch (escCommand[1]) {
      case 'V': // Cut paper
        Serial.println(F("\n═══════════════ [PAPER CUT] ═══════════════\n"));
        break;
    }
  }
}

void printLine() {
  if (lineBuffer.length() > 0) {
    Serial.println(lineBuffer);
    lineBuffer = "";
  } else {
    Serial.println();
  }
}
