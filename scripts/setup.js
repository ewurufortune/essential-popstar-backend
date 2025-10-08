#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Essential Popstar Backend Setup');
console.log('=====================================\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
  } else {
    console.log('❌ .env.example not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Read current .env
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('\n🔧 Configuration Check:');
console.log('========================');

// Check each required variable
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'REVENUECAT_WEBHOOK_SECRET',
  'PORT',
  'COFFEE_1_POWER',
  'COFFEE_5_POWER',
  'COFFEE_50_POWER',
  'COFFEE_120_POWER',
  'COFFEE_400_POWER'
];

let missingVars = [];

requiredVars.forEach(varName => {
  const hasVar = envContent.includes(`${varName}=`) && 
                 !envContent.includes(`${varName}=\n`) && 
                 !envContent.includes(`${varName}= `);
  
  if (hasVar) {
    console.log(`✅ ${varName}`);
  } else {
    console.log(`❌ ${varName} - needs configuration`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('\n⚠️  Configuration needed:');
  console.log('==========================');
  console.log('Please edit your .env file and configure these variables:');
  missingVars.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  
  console.log('\n📖 See the README.md for detailed setup instructions.');
} else {
  console.log('\n🎉 All configuration variables are set!');
}

console.log('\n📚 Next Steps:');
console.log('================');
console.log('1. Run the database schema in Supabase SQL editor');
console.log('2. Configure RevenueCat webhook URL');
console.log('3. Start the server: npm run dev');
console.log('4. Test endpoints: curl http://localhost:3000/health');

console.log('\n🔗 Important URLs:');
console.log('==================');
console.log('- Supabase: https://flhjukijsrrbvqhgiekt.supabase.co');
console.log('- Backend Health: http://localhost:3000/health');
console.log('- Webhook Test: http://localhost:3000/webhooks/test');

console.log('\n💡 Pro Tips:');
console.log('=============');
console.log('- Use ngrok for local webhook testing');
console.log('- Check logs for webhook signature verification');
console.log('- Test with RevenueCat sandbox first');

console.log('\nSetup script completed! 🚀\n');