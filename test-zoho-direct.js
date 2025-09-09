require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔍 Testing Zoho SMTP with Debug Info');
console.log('====================================');

console.log('Email:', process.env.ZOHO_EMAIL);
console.log('Password length:', process.env.ZOHO_APP_PASSWORD ? process.env.ZOHO_APP_PASSWORD.length : 0);
console.log('Password first 4 chars:', process.env.ZOHO_APP_PASSWORD ? process.env.ZOHO_APP_PASSWORD.substring(0, 4) : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true,
  logger: true
});

async function testAuth() {
  try {
    console.log('\n🧪 Testing SMTP verification...');
    await transporter.verify();
    console.log('✅ SMTP verification successful!');
  } catch (error) {
    console.log('❌ SMTP verification failed:', error.message);
    
    if (error.message.includes('535')) {
      console.log('\n💡 Authentication Failed (535) - Possible Solutions:');
      console.log('1. Generate a NEW App Password at: https://accounts.zoho.com/home#security/app-password');
      console.log('2. Make sure "Email Client" is selected when generating');
      console.log('3. Delete the old app password and create a fresh one');
      console.log('4. Verify that support@searchnorthcyprus.org is your actual Zoho email');
      console.log('5. Check if 2FA is enabled and properly configured');
    }
  }
}

testAuth();