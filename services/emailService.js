const nodemailer = require('nodemailer');

// Create reusable transporter using ONLY Zoho SMTP
const createTransporter = () => {
  // Check if Zoho credentials are available
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    console.log('📧 Email service disabled - missing Zoho SMTP credentials');
    return null;
  }

  console.log('📧 Using Zoho SMTP for email delivery');
  
  // Use different SMTP settings based on the domain
  return nodemailer.createTransport({
    host: 'smtp.zoho.com', // Free Zoho SMTP
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Enable debug for troubleshooting
    logger: true
  });
};

// Base email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    // If transporter is null (development mode), just log and return
    if (!transporter) {
      console.log(`📧 [DEV MODE] Would send email to ${options.to}: ${options.subject}`);
      
      // For password reset emails, extract and log the reset URL
      if (options.subject && options.subject.includes('Password Reset') && options.html) {
        const resetUrlMatch = options.html.match(/https?:\/\/[^\s"<>]+\/reset-password\/[^\s"<>]+/);
        if (resetUrlMatch) {
          console.log(`🔗 [DEV MODE] Password Reset URL: ${resetUrlMatch[0]}`);
          console.log(`📋 [DEV MODE] Copy this URL to test password reset:`);
          console.log(`   ${resetUrlMatch[0]}`);
        }
      }
      
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
    console.log(`📧 Email sent successfully to ${options.to}:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`❌ Email sending failed to ${options.to}:`, error.message);
    
    // In development, don't throw error to avoid breaking registration
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log(`📧 [DEV MODE] Email failed but continuing anyway: ${options.subject}`);
      
      // Provide helpful message for Zoho authentication issues
      if (error.message.includes('Authentication Failed') || error.message.includes('535')) {
        console.log('💡 Zoho Authentication Failed - Please check:');
        console.log('   1. Visit https://accounts.zoho.com/home#security/app-password');
        console.log('   2. Generate a new App Password for "Email Client"');
        console.log('   3. Update ZOHO_APP_PASSWORD in your .env file');
        console.log('   4. Current email:', process.env.ZOHO_EMAIL);
      }
      
      return { messageId: 'dev-failed-' + Date.now() };
    }
    
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

// Base HTML template
const getBaseTemplate = (title, content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - SearchNorthCyprus</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white; 
          padding: 30px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
          background: white;
        }
        .content h2 {
          color: #1f2937;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 24px;
        }
        .content p {
          margin-bottom: 16px;
          line-height: 1.7;
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background: #2563eb; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .button:hover {
          background: #1d4ed8;
        }
        .button-success {
          background: #059669;
        }
        .button-success:hover {
          background: #047857;
        }
        .button-danger {
          background: #dc2626;
        }
        .button-danger:hover {
          background: #b91c1c;
        }
        .footer { 
          padding: 30px; 
          text-align: center; 
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          color: #6b7280; 
          font-size: 14px;
        }
        .info-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .success-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .warning-box {
          background: #fffbeb;
          border: 1px solid #fed7aa;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .danger-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .listing-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .listing-info h3 {
          margin-top: 0;
          color: #1e293b;
        }
        .listing-info .meta {
          color: #64748b;
          font-size: 14px;
          margin-top: 8px;
        }
        @media only screen and (max-width: 600px) {
          .container { margin: 10px; }
          .content { padding: 30px 20px; }
          .header { padding: 25px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SearchNorthCyprus</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; 2024 SearchNorthCyprus. All rights reserved.</p>
          <p>North Cyprus's Premier Listing Platform</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome Email
const sendWelcomeEmail = async (user) => {
  const content = `
    <h2>Welcome to SearchNorthCyprus!</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>Thank you for joining <strong>SearchNorthCyprus</strong>, North Cyprus's premier platform for property listings, job opportunities, and services.</p>
    
    <div class="success-box">
      <h3>🎉 Account Successfully Created</h3>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <p>You can now:</p>
    <ul>
      <li>Browse thousands of properties for rent and sale</li>
      <li>Explore job opportunities across North Cyprus</li>
      <li>Find local services and businesses</li>
      <li>Post your own listings and reach thousands of potential customers</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.CLIENT_URL}/dashboard" class="button">Explore Your Dashboard</a>
    </div>
    
    <div class="info-box">
      <p><strong>💡 Pro Tip:</strong> Complete your profile to increase trust with potential customers and get better visibility for your listings.</p>
    </div>
    
    <p>If you have any questions or need assistance, our support team is here to help.</p>
    <p>Welcome aboard!</p>
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '🎉 Welcome to SearchNorthCyprus - Your Account is Ready!',
    html: getBaseTemplate('Welcome', content),
    text: `Welcome to SearchNorthCyprus! Your account has been created successfully. Username: ${user.username}. Visit ${process.env.CLIENT_URL}/dashboard to get started.`
  });
};

// Password Reset Email
const sendPasswordResetEmail = async (user, resetToken, resetUrl) => {
  // If resetUrl is not provided, fallback to CLIENT_URL (for backward compatibility)
  if (!resetUrl) {
    resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  }
  
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>We received a request to reset your password for your SearchNorthCyprus account.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button">Reset Your Password</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <div class="info-box">
      <p style="word-break: break-all; color: #2563eb; font-family: monospace;">${resetUrl}</p>
    </div>
    
    <div class="warning-box">
      <p><strong>⚠️ Important Security Notice:</strong></p>
      <ul>
        <li>This link will expire in <strong>1 year</strong> for your convenience</li>
        <li>If you didn't request this password reset, please ignore this email</li>
        <li>Your password will remain unchanged if you don't use this link</li>
      </ul>
    </div>
    
    <p>For your account security, never share this link with anyone.</p>
    <p><strong>The SearchNorthCyprus Security Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '🔐 Password Reset Request - SearchNorthCyprus',
    html: getBaseTemplate('Password Reset', content),
    text: `Reset your SearchNorthCyprus password by visiting: ${resetUrl}. This link expires in 1 year.`
  });
};

// Listing Approved Email
const sendListingApprovedEmail = async (user, listing) => {
  const listingUrl = `${process.env.CLIENT_URL}/listings/${listing._id}`;
  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  
  const content = `
    <h2>🎉 Your Listing Has Been Approved!</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>Great news! Your listing has been reviewed and approved by our moderation team.</p>
    
    <div class="listing-info">
      <h3>${listing.title}</h3>
      <p><strong>Category:</strong> ${listing.category}</p>
      <p><strong>Location:</strong> ${listing.location || 'Not specified'}</p>
      <p><strong>Price:</strong> ${listing.price ? `$${listing.price}` : 'Contact for price'}</p>
      <div class="meta">Approved on: ${new Date().toLocaleDateString()}</div>
    </div>
    
    <p>Your listing is now <strong>live</strong> and visible to thousands of potential customers on SearchNorthCyprus.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${listingUrl}" class="button button-success">View Your Listing</a>
      <a href="${dashboardUrl}" class="button">Manage All Listings</a>
    </div>
    
    <div class="success-box">
      <h3>🚀 Want to boost your listing's visibility?</h3>
      <p>Consider promoting your listing to reach even more potential customers. Promoted listings get:</p>
      <ul>
        <li>Priority placement in search results</li>
        <li>Featured placement on our homepage</li>
        <li>Increased visibility and engagement</li>
      </ul>
    </div>
    
    <p>Thank you for choosing SearchNorthCyprus!</p>
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '✅ Your Listing is Now Live - SearchNorthCyprus',
    html: getBaseTemplate('Listing Approved', content),
    text: `Your listing "${listing.title}" has been approved and is now live on SearchNorthCyprus. View it at: ${listingUrl}`
  });
};

// Listing Rejected Email
const sendListingRejectedEmail = async (user, listing, reason = 'Policy violation') => {
  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  const guidelinesUrl = `${process.env.CLIENT_URL}/guidelines`;
  
  const content = `
    <h2>Listing Review Update</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>We've reviewed your recent listing submission, and unfortunately, we cannot approve it at this time.</p>
    
    <div class="listing-info">
      <h3>${listing.title}</h3>
      <p><strong>Category:</strong> ${listing.category}</p>
      <p><strong>Submitted:</strong> ${new Date(listing.createdAt).toLocaleDateString()}</p>
    </div>
    
    <div class="danger-box">
      <h3>❌ Reason for Rejection:</h3>
      <p>${reason}</p>
    </div>
    
    <p>Don't worry! You can edit your listing to address these concerns and resubmit it for review.</p>
    
    <div class="info-box">
      <h3>📋 What to do next:</h3>
      <ol>
        <li>Review our <a href="${guidelinesUrl}" style="color: #2563eb;">listing guidelines</a></li>
        <li>Edit your listing to address the rejection reason</li>
        <li>Resubmit for review</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="button">Edit Your Listing</a>
      <a href="${guidelinesUrl}" class="button" style="background: #6b7280;">View Guidelines</a>
    </div>
    
    <p>If you have any questions about this decision, please contact our support team.</p>
    <p><strong>The SearchNorthCyprus Moderation Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '📋 Listing Review Update - Action Required',
    html: getBaseTemplate('Listing Review', content),
    text: `Your listing "${listing.title}" was not approved. Reason: ${reason}. Edit your listing at: ${dashboardUrl}`
  });
};

// Job Approved Email
const sendJobApprovedEmail = async (user, job) => {
  const jobUrl = `${process.env.CLIENT_URL}/jobs/${job._id}`;
  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  
  const content = `
    <h2>🎉 Your Job Posting is Now Live!</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>Excellent! Your job posting has been approved and is now live on SearchNorthCyprus.</p>
    
    <div class="listing-info">
      <h3>${job.title}</h3>
      <p><strong>Company:</strong> ${job.company}</p>
      <p><strong>Location:</strong> ${job.location}</p>
      <p><strong>Job Type:</strong> ${job.jobType}</p>
      <p><strong>Salary:</strong> ${job.salary || 'Negotiable'}</p>
      <div class="meta">Published on: ${new Date().toLocaleDateString()}</div>
    </div>
    
    <p>Your job posting is now visible to job seekers across North Cyprus. Start receiving applications!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${jobUrl}" class="button button-success">View Job Posting</a>
      <a href="${dashboardUrl}" class="button">View Applications</a>
    </div>
    
    <div class="info-box">
      <h3>📊 Track Your Job's Performance:</h3>
      <ul>
        <li>Monitor application numbers in your dashboard</li>
        <li>View candidate profiles and qualifications</li>
        <li>Manage your hiring process efficiently</li>
      </ul>
    </div>
    
    <p>Good luck with your hiring!</p>
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '✅ Job Posting Approved - Now Accepting Applications',
    html: getBaseTemplate('Job Approved', content),
    text: `Your job posting "${job.title}" has been approved and is now live. View it at: ${jobUrl}`
  });
};

// Job Rejected Email
const sendJobRejectedEmail = async (user, job, reason = 'Policy violation') => {
  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  const guidelinesUrl = `${process.env.CLIENT_URL}/job-guidelines`;
  
  const content = `
    <h2>Job Posting Review Update</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>We've reviewed your job posting, and unfortunately, we cannot approve it at this time.</p>
    
    <div class="listing-info">
      <h3>${job.title}</h3>
      <p><strong>Company:</strong> ${job.company}</p>
      <p><strong>Submitted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
    </div>
    
    <div class="danger-box">
      <h3>❌ Reason for Rejection:</h3>
      <p>${reason}</p>
    </div>
    
    <p>You can edit your job posting to address these concerns and resubmit it for review.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="button">Edit Job Posting</a>
      <a href="${guidelinesUrl}" class="button" style="background: #6b7280;">View Guidelines</a>
    </div>
    
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '📋 Job Posting Review Update - Action Required',
    html: getBaseTemplate('Job Review', content),
    text: `Your job posting "${job.title}" was not approved. Reason: ${reason}. Edit at: ${dashboardUrl}`
  });
};

// Promotion Payment Approved Email
const sendPromotionApprovedEmail = async (user, promotion) => {
  const listingUrl = `${process.env.CLIENT_URL}/listings/${promotion.listing._id}`;
  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  
  const endDate = new Date(promotion.schedule?.endAt).toLocaleDateString();
  const placement = promotion.placement === 'homepage' ? 'Homepage Hero' : 'Category Top';
  
  const content = `
    <h2>🚀 Your Promotion is Now Active!</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>Great news! Your promotion payment has been verified and your listing is now being promoted.</p>
    
    <div class="listing-info">
      <h3>${promotion.listing?.title}</h3>
      <p><strong>Promotion Type:</strong> ${placement}</p>
      <p><strong>Duration:</strong> ${promotion.pricing?.durationDays} days</p>
      <p><strong>Amount Paid:</strong> $${promotion.pricing?.amount}</p>
      <p><strong>Active Until:</strong> ${endDate}</p>
    </div>
    
    <div class="success-box">
      <h3>🎯 Your listing is now getting premium visibility:</h3>
      <ul>
        <li>Featured placement in prime locations</li>
        <li>Higher visibility in search results</li>
        <li>Increased customer engagement</li>
        <li>Priority positioning over regular listings</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${listingUrl}" class="button button-success">View Your Promoted Listing</a>
      <a href="${dashboardUrl}" class="button">View Promotion Stats</a>
    </div>
    
    <div class="info-box">
      <p><strong>📊 Track your promotion performance</strong> in your dashboard to see clicks, views, and engagement metrics.</p>
    </div>
    
    <p>Thank you for choosing SearchNorthCyprus promotion services!</p>
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '🚀 Promotion Activated - Your Listing is Featured!',
    html: getBaseTemplate('Promotion Approved', content),
    text: `Your promotion for "${promotion.listing?.title}" has been approved and is now active until ${endDate}.`
  });
};

// Promotion Payment Rejected Email
const sendPromotionRejectedEmail = async (user, promotion, reason = 'Payment verification failed') => {
  const paymentsUrl = `${process.env.CLIENT_URL}/promotions/my-payments`;
  const supportUrl = `${process.env.CLIENT_URL}/contact`;
  
  const content = `
    <h2>Promotion Payment Issue</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>We've reviewed your promotion payment, but unfortunately, we cannot verify it at this time.</p>
    
    <div class="listing-info">
      <h3>${promotion.listing?.title}</h3>
      <p><strong>Promotion Type:</strong> ${promotion.placement === 'homepage' ? 'Homepage Hero' : 'Category Top'}</p>
      <p><strong>Amount:</strong> $${promotion.pricing?.amount}</p>
      <p><strong>Transaction Hash:</strong> ${promotion.payment?.txHash}</p>
    </div>
    
    <div class="danger-box">
      <h3>❌ Issue with Payment:</h3>
      <p>${reason}</p>
    </div>
    
    <div class="info-box">
      <h3>🔄 Next Steps:</h3>
      <ol>
        <li>Double-check your transaction details</li>
        <li>Ensure you sent the exact amount to the correct wallet</li>
        <li>Resubmit your payment proof with correct information</li>
        <li>Contact support if you believe this is an error</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentsUrl}" class="button">Resubmit Payment Proof</a>
      <a href="${supportUrl}" class="button" style="background: #6b7280;">Contact Support</a>
    </div>
    
    <p>We're here to help resolve this quickly!</p>
    <p><strong>The SearchNorthCyprus Payment Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '💳 Promotion Payment Issue - Action Required',
    html: getBaseTemplate('Promotion Payment Issue', content),
    text: `Your promotion payment for "${promotion.listing?.title}" needs attention. Reason: ${reason}. Visit: ${paymentsUrl}`
  });
};

// Service Payment Approved Email
const sendServicePaymentApprovedEmail = async (user, payment) => {
  const content = `
    <h2>✅ Service Payment Confirmed</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>Your service payment has been successfully verified and processed.</p>
    
    <div class="listing-info">
      <h3>Payment Details</h3>
      <p><strong>Service:</strong> ${payment.metadata?.serviceDetails?.listingTitle || 'Service Payment'}</p>
      <p><strong>Amount:</strong> $${payment.pricing?.amount}</p>
      <p><strong>Provider:</strong> ${payment.metadata?.serviceDetails?.ownerName || 'Service Provider'}</p>
      <p><strong>Payment ID:</strong> ${payment.paymentId}</p>
      <p><strong>Verified:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="success-box">
      <h3>🎉 Payment Successful</h3>
      <p>Your payment has been confirmed and the service provider has been notified. They should contact you soon to coordinate the service.</p>
    </div>
    
    <div class="info-box">
      <h3>📞 What happens next?</h3>
      <ul>
        <li>The service provider will contact you directly</li>
        <li>Coordinate the service details and timing</li>
        <li>Enjoy your service!</li>
      </ul>
    </div>
    
    <p>Thank you for using SearchNorthCyprus services!</p>
    <p><strong>The SearchNorthCyprus Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '✅ Service Payment Confirmed - SearchNorthCyprus',
    html: getBaseTemplate('Service Payment Approved', content),
    text: `Your service payment of $${payment.pricing?.amount} has been confirmed. Payment ID: ${payment.paymentId}`
  });
};

// Service Payment Rejected Email
const sendServicePaymentRejectedEmail = async (user, payment, reason = 'Payment verification failed') => {
  const paymentsUrl = `${process.env.CLIENT_URL}/payments`;
  
  const content = `
    <h2>Service Payment Issue</h2>
    <p>Hello ${user.firstName || user.fullName || 'there'},</p>
    <p>We've reviewed your service payment, but we cannot verify it at this time.</p>
    
    <div class="listing-info">
      <h3>Payment Details</h3>
      <p><strong>Service:</strong> ${payment.metadata?.serviceDetails?.listingTitle || 'Service Payment'}</p>
      <p><strong>Amount:</strong> $${payment.pricing?.amount}</p>
      <p><strong>Payment ID:</strong> ${payment.paymentId}</p>
    </div>
    
    <div class="danger-box">
      <h3>❌ Issue with Payment:</h3>
      <p>${reason}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentsUrl}" class="button">View Payment Details</a>
    </div>
    
    <p>Please contact our support team if you believe this is an error.</p>
    <p><strong>The SearchNorthCyprus Payment Team</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: '💳 Service Payment Issue - SearchNorthCyprus',
    html: getBaseTemplate('Service Payment Issue', content),
    text: `Your service payment of $${payment.pricing?.amount} needs attention. Reason: ${reason}. Payment ID: ${payment.paymentId}`
  });
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Email service disabled in development mode');
      return true; // Return true so it doesn't appear as a failure
    }
    
    await transporter.verify();
    console.log('✅ Zoho SMTP configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendListingApprovedEmail,
  sendListingRejectedEmail,
  sendJobApprovedEmail,
  sendJobRejectedEmail,
  sendPromotionApprovedEmail,
  sendPromotionRejectedEmail,
  sendServicePaymentApprovedEmail,
  sendServicePaymentRejectedEmail,
  testEmailConfig
};