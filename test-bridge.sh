#!/bin/bash

# Bluetooth Bridge Test Script
# Run this to verify the bridge is working correctly

echo "=================================================="
echo "🖨️  Bluetooth Bridge Test Script"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get local IP
echo "📍 Detecting your IP address..."
if command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
elif command -v ip &> /dev/null; then
    LOCAL_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -n1)
else
    LOCAL_IP="localhost"
fi

echo -e "${GREEN}✅ Your IP: $LOCAL_IP${NC}"
echo ""

# Test 1: Check if bridge is running
echo "Test 1: Checking if bridge is running..."
if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bridge is running on localhost${NC}"
else
    echo -e "${RED}❌ Bridge is NOT running on localhost${NC}"
    echo "   Start it with: node scripts/bridge.js"
    exit 1
fi
echo ""

# Test 2: Check health endpoint
echo "Test 2: Testing health endpoint..."
HEALTH=$(curl -s http://localhost:9000/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 3: Check if accessible from network
echo "Test 3: Testing network accessibility..."
if [ "$LOCAL_IP" != "localhost" ]; then
    if curl -s http://$LOCAL_IP:9000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Bridge accessible from network${NC}"
        echo "   Access from phone: http://$LOCAL_IP:9000"
    else
        echo -e "${YELLOW}⚠️  Bridge may not be accessible from network${NC}"
        echo "   Check firewall settings"
    fi
else
    echo -e "${YELLOW}⚠️  Could not detect network IP${NC}"
fi
echo ""

# Test 4: Send test print
echo "Test 4: Sending test print job..."
TEST_RESULT=$(curl -s -X POST http://localhost:9000/test)
if echo "$TEST_RESULT" | grep -q "success"; then
    echo -e "${GREEN}✅ Test print sent successfully${NC}"
    echo "   Check your printer!"
else
    echo -e "${RED}❌ Test print failed${NC}"
    echo "   Response: $TEST_RESULT"
fi
echo ""

# Test 5: Test base64 decoding
echo "Test 5: Testing base64 decoding..."
BASE64_DATA="SGVsbG8gZnJvbSBUZXN0IFNjcmlwdCE="  # "Hello from Test Script!" in base64
PRINT_RESULT=$(curl -s -X POST http://localhost:9000/print \
  -H "Content-Type: application/json" \
  -d "{\"data\": \"$BASE64_DATA\"}")

if echo "$PRINT_RESULT" | grep -q "success"; then
    echo -e "${GREEN}✅ Base64 decoding test passed${NC}"
else
    echo -e "${RED}❌ Base64 decoding test failed${NC}"
    echo "   Response: $PRINT_RESULT"
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo ""
echo "Bridge Status: Running ✅"
echo "Network IP: $LOCAL_IP"
echo "Access URL: http://$LOCAL_IP:9000"
echo ""
echo "To print from phone:"
echo "  1. Connect phone to same WiFi"
echo "  2. Go to: http://$LOCAL_IP:3000"
echo "  3. Print any invoice"
echo ""
echo "For troubleshooting, see:"
echo "  📄 BLUETOOTH_FIX_SUMMARY.md"
echo "  📄 BLUETOOTH_PRINTING_TROUBLESHOOTING.md"
echo ""
echo "=================================================="
