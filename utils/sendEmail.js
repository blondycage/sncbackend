const nodemailer = require('nodemailer');

// Create transporter using ONLY Zoho SMTP
const createTransporter = () => {
  // Check if Zoho credentials are available
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    console.log('📧 Email service disabled - missing Zoho SMTP credentials');
    return null;
  }

  return nodemailer.createTransport({
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
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    // If transporter is null (development mode), just log and return
    if (!transporter) {
      console.log(`📧 [DEV MODE] Would send email to ${options.email}: ${options.subject}`);
      return { messageId: 'dev-mode-' + Date.now() };
    }

    const message = {
      from: `SearchNorthCyprus <admin@searchnorthcyprus.org>`,
      to: options.email,
      subject: options.subject,
      html: options.html || options.message
    };

    const info = await transporter.sendMail(message);
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // In development, don't throw error to avoid breaking functionality
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] Email failed but continuing anyway: ${options.subject}`);
      return { messageId: 'dev-failed-' + Date.now() };
    }
    
    throw error;
  }
};

// Email templates
const getPasswordResetTemplate = (resetUrl, firstName = '') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - SearchNorthCyprus</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SearchNorthCyprus</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello${firstName ? ` ${firstName}` : ''},</p>
          <p>We received a request to reset your password for your SearchNorthCyprus account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <div class="warning">
            <strong>Important:</strong> This link will expire in 10 minutes for security reasons.
          </div>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>© 2024 SearchNorthCyprus. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeTemplate = (firstName, username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SearchNorthCyprus</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SearchNorthCyprus!</h1>
        </div>
        <div class="content">
          <h2>Account Created Successfully</h2>
          <p>Hello ${firstName},</p>
          <p>Welcome to SearchNorthCyprus! Your account has been created successfully.</p>
          <p><strong>Username:</strong> ${username}</p>
          <p>You can now start exploring and posting listings on our platform.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2024 SearchNorthCyprus. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  getPasswordResetTemplate,
  getWelcomeTemplate
}; 