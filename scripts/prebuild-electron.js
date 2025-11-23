#!/usr/bin/env node
/**
 * Pre-build script for Electron
 * Ensures all dependencies are ready for Windows build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting pre-build tasks for Electron...\n');

// 1. Check if standalone build exists
console.log('✓ Checking Next.js standalone build...');
const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
if (!fs.existsSync(standalonePath)) {
  console.error('❌ Standalone build not found! Run "npm run build:standalone" first.');
  process.exit(1);
}
console.log('  ✓ Standalone build found\n');

// 2. Generate Prisma Client for Windows
console.log('✓ Generating Prisma Client for Windows target...');
try {
  // Set DATABASE_URL for generation
  process.env.DATABASE_URL = 'file:./prisma/local_chitfund.db';
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('  ✓ Prisma Client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client:', error.message);
  process.exit(1);
}

// 3. Copy environment template
console.log('✓ Preparing environment files...');
const envPath = path.join(__dirname, '..', '.env');
const standAloneEnvPath = path.join(standalonePath, '.env');

if (fs.existsSync(envPath)) {
  // Create .env content for production
  const envContent = `
# Embedded Environment Variables for Electron App
NODE_ENV=production
PORT=3000
HOSTNAME=localhost

# Database - will be set dynamically by Electron
DATABASE_URL=file:./database/local_chitfund.db

# Add your MongoDB URI if needed (for online sync)
MONGODB_URI=${process.env.MONGODB_URI || ''}
`.trim();

  fs.writeFileSync(standAloneEnvPath, envContent);
  console.log('  ✓ Environment file prepared\n');
} else {
  console.warn('  ⚠ No .env file found, using defaults\n');
}

// 4. Copy Prisma schema and database to standalone
console.log('✓ Copying Prisma files to standalone build...');
const prismaSourceDir = path.join(__dirname, '..', 'prisma');
const prismaTargetDir = path.join(standalonePath, 'prisma');

if (!fs.existsSync(prismaTargetDir)) {
  fs.mkdirSync(prismaTargetDir, { recursive: true });
}

// Copy schema
const schemaSource = path.join(prismaSourceDir, 'schema.prisma');
const schemaTarget = path.join(prismaTargetDir, 'schema.prisma');
if (fs.existsSync(schemaSource)) {
  fs.copyFileSync(schemaSource, schemaTarget);
  console.log('  ✓ Schema copied');
}

// Copy database if exists (template)
const dbSource = path.join(prismaSourceDir, 'local_chitfund.db');
const dbTarget = path.join(prismaTargetDir, 'local_chitfund.db');
if (fs.existsSync(dbSource)) {
  fs.copyFileSync(dbSource, dbTarget);
  console.log('  ✓ Database template copied');
}

console.log('  ✓ Prisma files copied\n');

// 5. Copy Prisma Client to standalone node_modules
console.log('✓ Ensuring Prisma Client is in standalone build...');
const prismaClientSource = path.join(__dirname, '..', 'node_modules', '.prisma');
const prismaClientTarget = path.join(standalonePath, 'node_modules', '.prisma');

if (fs.existsSync(prismaClientSource)) {
  // Copy recursively
  execSync(`cp -r "${prismaClientSource}" "${path.join(standalonePath, 'node_modules')}"`, { stdio: 'inherit' });
  console.log('  ✓ Prisma Client copied to standalone\n');
}

// 6. Verify critical files
console.log('✓ Verifying critical files...');
const criticalFiles = [
  'electron/main-simple.js',
  'electron/preload.js',
  'electron/database-helper.js',
  '.next/standalone/server.js',
  '.next/standalone/package.json'
];

let allFilesExist = true;
for (const file of criticalFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Missing: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`  ✓ ${file}`);
  }
}

if (!allFilesExist) {
  console.error('\n❌ Some critical files are missing!');
  process.exit(1);
}

console.log('\n✅ Pre-build tasks completed successfully!');
console.log('Ready to build Electron app for Windows.\n');
