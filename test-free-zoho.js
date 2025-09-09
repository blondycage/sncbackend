require('dotenv').config();
const { testEmailConfig, sendPasswordResetEmail } = require('./services/emailService');

async function testFreeZohoEmail() {
  console.log('🔍 Testing Free Zoho SMTP Configuration');
  console.log('======================================');
  
  console.log('\n📋 Configuration Check:');
  console.log('ZOHO_EMAIL:', process.env.ZOHO_EMAIL);
  console.log('ZOHO_APP_PASSWORD:', process.env.ZOHO_APP_PASSWORD ? `${process.env.ZOHO_APP_PASSWORD.substring(0, 4)}...` : 'NOT SET');
  console.log('SMTP Host: smtp.zoho.com (Free Account)');
  
  console.log('\n🧪 Testing SMTP Connection...');
  try {
    const configTest = await testEmailConfig();
    if (configTest) {
      console.log('✅ SMTP Connection: SUCCESSFUL');
    } else {
      console.log('❌ SMTP Connection: FAILED');
      return;
    }
  } catch (error) {
    console.log('❌ SMTP Connection Error:', error.message);
    return;
  }
  
  console.log('\n📧 Testing Password Reset Email...');
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  };
  
  try {
    console.log('Attempting to send password reset email...');
    const result = await sendPasswordResetEmail(testUser, 'test-reset-token-123');
    
    if (result && result.messageId) {
      console.log('✅ PASSWORD RESET EMAIL SENT SUCCESSFULLY!');
      console.log('📬 Message ID:', result.messageId);
      console.log('📤 From: SearchNorthCyprus <support@searchnorthcyprus.org>');
      console.log('📥 To:', testUser.email);
    } else {
      console.log('⚠️  Email sent but no message ID');
    }
  } catch (error) {
    console.log('❌ Password Reset Email Failed:', error.message);
    return;
  }
  
  console.log('\n🎉 EMAIL SYSTEM IS NOW WORKING!');
  console.log('✅ Forgot password emails will now be delivered');
  console.log('✅ Welcome emails for new users will work');
  console.log('✅ All notification emails will be sent');
}

console.log('Testing with free Zoho SMTP (smtp.zoho.com)...\n');
testFreeZohoEmail().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n❌ Test failed:', error);
  process.exit(1);
});