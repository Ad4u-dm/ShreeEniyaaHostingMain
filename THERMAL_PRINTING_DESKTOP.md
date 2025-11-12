# Invoify Windows Desktop - Thermal Printing Guide

## Overview
This guide explains thermal printing in the Windows desktop version of Invoify.

## Key Difference: Web vs Desktop

### Web Version (Browser)
- ❌ Requires Bluetooth Bridge App
- ❌ Manual configuration
- ❌ Complex setup
- Limited printer support

### Desktop Version (Windows App)
- ✅ **NO BRIDGE REQUIRED!**
- ✅ Direct Windows printer access
- ✅ Automatic printer detection
- ✅ Works with any Windows-compatible printer

## Supported Printers

### USB Thermal Printers
- **58mm width**: POS-5890, XP-58, etc.
- **80mm width**: XP-80mm, POS-8220, etc.
- **Manufacturer**: Any ESC/POS compatible

### Bluetooth Thermal Printers
- RPP02N
- MTP-II
- MHT-P10
- Any ESC/POS Bluetooth printer

## Setup Instructions

### Option 1: USB Thermal Printer

#### Step 1: Connect Printer
1. Plug USB cable into computer
2. Turn on the printer
3. Windows will automatically install drivers

#### Step 2: Verify Installation
1. Open Control Panel
2. Go to "Devices and Printers"
3. Your printer should appear
4. Right-click → "Printer properties" → "Print Test Page"

#### Step 3: Configure in Invoify
1. Open Invoify Desktop App
2. Click on Settings (⚙️ icon)
3. Go to "Thermal Printer" section
4. Click "Detect Printers"
5. Select your printer from the list
6. Click "Set as Default"
7. Click "Test Print"

### Option 2: Bluetooth Thermal Printer

#### Step 1: Pair Printer with Windows
1. Turn on Bluetooth printer
2. Open Windows Settings
3. Go to: Settings → Devices → Bluetooth & other devices
4. Click "Add Bluetooth or other device"
5. Select "Bluetooth"
6. Wait for your printer to appear
7. Click on the printer name
8. Enter PIN when prompted (usually: 0000, 1234, or 9999)
9. Wait for "Connected" status

#### Step 2: Add as Printer
1. After pairing, printer should appear in "Devices and Printers"
2. If not, restart Windows
3. Right-click printer → "Printer properties"
4. Click "Print Test Page" to verify

#### Step 3: Configure in Invoify
Same as USB printer steps above.

## Printing Invoices

### Method 1: Direct Print Button
1. Open an invoice
2. Click "Print" button
3. Receipt prints immediately to default thermal printer

### Method 2: Print Preview
1. Open an invoice
2. Click "View" to see invoice details
3. Click "Print" in the modal
4. Choose printer (if multiple available)
5. Print

### Method 3: Keyboard Shortcut
1. Open an invoice
2. Press `Ctrl + P`
3. Select thermal printer
4. Print

## Troubleshooting

### Printer Not Detected

**Problem**: Printer doesn't appear in Invoify settings

**Solutions**:
1. Check printer is ON
2. Verify USB cable connection
3. Check: Control Panel → Devices and Printers
4. Restart Invoify
5. Click "Refresh Printers" in settings

### Print Quality Issues

**Problem**: Faded or unclear prints

**Solutions**:
1. Check paper roll is inserted correctly
2. Clean print head with cleaning card
3. Replace paper roll if old
4. Adjust print density in printer settings
5. Update printer drivers

### Bluetooth Connection Drops

**Problem**: Printer disconnects frequently

**Solutions**:
1. Keep printer closer to computer
2. Remove obstacles between devices
3. Update Bluetooth drivers:
   - Device Manager → Bluetooth
   - Right-click adapter → Update driver
4. Re-pair the printer
5. Check printer battery level

### Wrong Printer Selected

**Problem**: Prints go to wrong printer

**Solutions**:
1. Go to Invoify Settings
2. Select correct printer
3. Click "Set as Default"
4. Restart Invoify

### Nothing Prints

**Problem**: Click print but nothing happens

**Solutions**:
1. Check printer is ON and ready
2. Check paper roll is loaded
3. Verify printer has no error lights
4. Check Windows print queue:
   - Control Panel → Devices and Printers
   - Right-click printer → "See what's printing"
   - Cancel stuck jobs
5. Restart printer
6. Restart Invoify

## Advanced Configuration

### Custom Paper Width
1. Invoify Settings → Thermal Printer
2. Select "Paper Width"
3. Choose: 58mm or 80mm
4. Save settings

### Print Density
1. Windows → Devices and Printers
2. Right-click thermal printer → Printer properties
3. Go to "Device Settings" tab
4. Adjust "Density" or "Darkness"
5. Apply and OK

### Auto-Cut Settings
1. Windows → Devices and Printers
2. Right-click thermal printer → Printer preferences
3. Look for "Auto Cut" or "Paper Cut" option
4. Enable/Disable as needed

## Receipt Format

Invoify prints thermal receipts with:
- Company header
- Invoice/Receipt number
- Customer details
- Item description
- Amounts (Due, Arrear, Received, Balance)
- Total
- Staff name
- Contact information

Width: Optimized for 80mm thermal paper
Height: Auto-adjusts based on content

## Best Practices

### For Best Results:
✅ Use quality thermal paper
✅ Keep printer clean
✅ Update drivers regularly
✅ Test print before customers
✅ Keep spare paper rolls
✅ Charge Bluetooth printers overnight

### Avoid:
❌ Low-quality paper (fades quickly)
❌ Exposing receipts to heat
❌ Storing receipts in sunlight
❌ Using non-thermal paper
❌ Touching print head while hot

## Maintenance

### Weekly:
- Clean printer exterior
- Check paper level
- Test print quality

### Monthly:
- Clean print head with cleaning card
- Check for driver updates
- Verify Windows printer settings

### As Needed:
- Replace paper roll when empty
- Charge Bluetooth printer
- Update firmware if available

## Support

### Can't Find Your Printer?
Email us the printer model:
📧 shreeniyaachitfunds@gmail.com

### Need Driver Help?
Call us:
📞 96266 66527 / 90035 62126

### Printer Not Working?
Check our FAQ or contact support with:
1. Printer model
2. Connection type (USB/Bluetooth)
3. Error message (if any)
4. Screenshot of problem

## Recommended Printers

### Budget-Friendly (₹2,000-5,000):
- Xprinter XP-58IIH (58mm, USB)
- TVS RP 45 (58mm, USB)
- Zebronics POS Printer (80mm, USB)

### Mid-Range (₹5,000-10,000):
- Citizen CT-S310 (80mm, USB)
- Epson TM-m10 (58mm, Bluetooth)
- RPP02N (58mm, Bluetooth)

### Professional (₹10,000+):
- Epson TM-T82 (80mm, USB)
- Star TSP143 (80mm, USB)
- Citizen CT-S4000 (80mm, Network/USB)

All recommended printers are ESC/POS compatible and work perfectly with Invoify Desktop.
