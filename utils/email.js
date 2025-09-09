const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

const createTransporter = () => {
  // Check if Zoho credentials are available
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    console.log('📧 Email service disabled - missing Zoho SMTP credentials');
    return null;
  }
 
  // Use Zoho SMTP for all environments
  transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false, // Use TLS
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
  
  return transporter;
};

/**
 * Send basic email
 * @param {Object} options - Email options
 * @returns {Promise} Send result
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      transporter = createTransporter();
    }

    // If transporter is null (development mode), just log and return
    if (!transporter) {
      console.log(`📧 [DEV MODE] Would send email to ${options.to}: ${options.subject}`);
      return { messageId: 'dev-mode-' + Date.now() };
    }

    const mailOptions = {
      from: `SearchNorthCyprus <admin@searchnorthcyprus.org>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // In development, don't throw error to avoid breaking functionality
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] Email failed but continuing anyway: ${options.subject}`);
      return { messageId: 'dev-failed-' + Date.now() };
    }
    
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

/**
 * Send welcome email with verification
 * @param {Object} user - User object
 * @param {string} verificationToken - Email verification token
 */
const sendWelcomeEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to SearchNorthCyprus</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #3B82F6; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SearchNorthCyprus!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName || 'there'}!</h2>
          <p>Thank you for joining SearchNorthCyprus, the premier platform for listings in North Cyprus.</p>
          <p>To complete your registration, please verify your email address:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link: ${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 SearchNorthCyprus. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Welcome to SearchNorthCyprus - Verify Your Email',
    text: `Welcome to SearchNorthCyprus! Please verify your email by visiting: ${verificationUrl}`,
    html
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} resetToken - Password reset token
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .warning { background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.firstName || 'there'}!</h2>
          <p>You requested a password reset for your SearchNorthCyprus account.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy this link: ${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 SearchNorthCyprus</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request - SearchNorthCyprus',
    text: `Reset your password by visiting: ${resetUrl}`,
    html
  });
};

/**
 * Test email configuration
 * @returns {Promise<boolean>} Whether email is working
 */
const testEmailConfig = async () => {
  try {
    if (!transporter) {
      transporter = createTransporter();
    }
    
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConfig
}; 