#!/bin/bash

echo "🚀 Setting up Shree Eniyaa Chitfunds Management System..."

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first:"
    echo "   sudo systemctl start mongodb   # On Linux"
    echo "   brew services start mongodb-community   # On macOS"
    exit 1
fi

echo "✅ MongoDB is running"

# Install dependencies (if not already done)
echo "📦 Installing dependencies..."
npm install

# Seed the database
echo "🌱 Seeding database with demo data..."
npm run seed-chitfund

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Demo accounts created:"
echo "👑 Admin:  admin@chitfund.com / admin123"
echo "👷 Staff:  staff@chitfund.com / staff123"
echo "👤 User:   user@chitfund.com / user123"
echo ""
echo "🌐 Open your browser and go to: http://localhost:3000"
echo "📱 You'll be redirected to the login page automatically"
echo ""
echo "✨ Enjoy your Shree Eniyaa Chitfunds Management System!"