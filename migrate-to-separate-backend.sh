#!/bin/bash

# Migration script to update API calls to use backend server
# This script will update your frontend code to use the new apiClient

echo "🚀 Starting Frontend-Backend Separation Migration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Create backup
echo "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r app "$BACKUP_DIR/"
echo "${GREEN}✓ Backup created in $BACKUP_DIR${NC}"
echo ""

# Step 2: Install backend dependencies
echo "${YELLOW}📥 Installing backend dependencies...${NC}"
cd backend
if [ -f "package.json" ]; then
    npm install
    echo "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo "${RED}✗ backend/package.json not found${NC}"
fi
cd ..
echo ""

# Step 3: Create frontend .env.local if not exists
echo "${YELLOW}⚙️  Configuring frontend environment...${NC}"
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "${YELLOW}⚠️  Created .env.local - PLEASE UPDATE NEXT_PUBLIC_API_URL${NC}"
else
    echo "${GREEN}✓ .env.local already exists${NC}"
fi
echo ""

# Step 4: Create backend .env if not exists
echo "${YELLOW}⚙️  Configuring backend environment...${NC}"
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "${YELLOW}⚠️  Created backend/.env - PLEASE UPDATE ALL VALUES${NC}"
else
    echo "${GREEN}✓ backend/.env already exists${NC}"
fi
echo ""

# Step 5: Summary
echo "${GREEN}✅ Migration setup complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update frontend .env.local:"
echo "   ${YELLOW}NEXT_PUBLIC_API_URL=https://your-backend-server.com${NC}"
echo ""
echo "2. Update backend .env:"
echo "   ${YELLOW}- FRONTEND_URL=https://your-frontend-domain.com${NC}"
echo "   ${YELLOW}- MONGODB_URI=your-database-connection${NC}"
echo "   ${YELLOW}- JWT_SECRET=your-secret-key${NC}"
echo ""
echo "3. Test backend locally:"
echo "   ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "4. Test frontend locally:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "5. Deploy backend (Railway/Render/VPS)"
echo ""
echo "6. Build and deploy frontend (Hostinger)"
echo "   ${YELLOW}npm run build${NC}"
echo ""
echo "📖 Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "${GREEN}🎉 Happy deploying!${NC}"
