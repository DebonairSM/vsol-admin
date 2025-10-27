#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up VSol Admin...\n');

// Check if .env exists
const envPath = path.join(__dirname, 'apps', 'api', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NODE_ENV="development"`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

// Generate database migrations
console.log('\n📊 Generating database migrations...');
try {
  execSync('pnpm --filter @vsol-admin/api db:generate', { stdio: 'inherit' });
  console.log('✅ Database migrations generated');
} catch (error) {
  console.log('⚠️  Migration generation failed - this is normal for first setup');
}

// Run migrations
console.log('\n🗄️  Running database migrations...');
try {
  execSync('pnpm --filter @vsol-admin/api db:migrate', { stdio: 'inherit' });
  console.log('✅ Database migrations completed');
} catch (error) {
  console.log('⚠️  Migration failed - database may already be set up');
}

// Seed database
console.log('\n🌱 Seeding database with sample data...');
try {
  execSync('pnpm --filter @vsol-admin/api db:seed', { stdio: 'inherit' });
  console.log('✅ Database seeded successfully');
} catch (error) {
  console.log('⚠️  Seeding failed - data may already exist');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: pnpm dev');
console.log('2. Open: http://localhost:5173');
console.log('3. Login with: rommel / admin123');
console.log('\n💡 The October 2025 cycle is pre-loaded with sample data');
console.log('🔗 API docs: http://localhost:3000/health');
