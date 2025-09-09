# 📧 Email System Setup Guide

This guide explains how to set up and configure the email system for SearchNorthCyprus.

## 🔧 Current Configuration

The email system is configured to use **ONLY Zoho Mail** SMTP service for professional email delivery from `support@searchnorthcyprus.org`.

## ⚠️ **IMPORTANT: Current Issue**

The provided app password `i0xhd6kbSrr2` is not working with Zoho SMTP. You need to generate a new valid app password.

### Development Mode

In development, if `ZOHO_APP_PASSWORD` is not configured, the system will:
- ✅ Log email attempts to console instead of sending
- ✅ Continue normal operation without breaking functionality
- ✅ Display helpful debug messages

### Production Mode

In production, emails will be sent using the configured Zoho SMTP credentials.

## 🚀 Production Setup

### 1. Zoho Mail Account Setup

1. **Create Zoho Mail Account**
   - Visit [Zoho Mail](https://www.zoho.com/mail/)
   - Set up `support@searchnorthcyprus.org`

2. **Generate App Password**
   - Log into Zoho Mail
   - Go to Settings → Security → App Passwords
   - Generate a new app password for "Email Client"
   - Copy the generated password (e.g., `i0xhd6kbSrr2`)

### 2. Environment Variables

Add these variables to your production `.env` file:

```bash
# Zoho Mail Configuration
ZOHO_EMAIL=support@searchnorthcyprus.org
ZOHO_APP_PASSWORD=your_actual_app_password_here

# Frontend URLs (update for production)
CLIENT_URL=https://searchnorthcyprus.org
FRONTEND_URL=https://searchnorthcyprus.org
```

### 3. Verify Configuration

Test the email configuration:

```bash
# In backend directory
node -e "
const { testEmailConfig } = require('./services/emailService');
testEmailConfig().then(result => {
  console.log('Email test result:', result ? 'SUCCESS' : 'FAILED');
  process.exit(result ? 0 : 1);
});
"
```

## 📨 Email Types & Triggers

### Authentication Emails
- **Welcome Email**: Sent when user registers
- **Password Reset**: Sent when user requests password reset

### Moderation Emails
- **Listing Approved/Rejected**: Sent when admin moderates listings
- **Job Approved/Rejected**: Sent when admin moderates job postings

### Payment Emails
- **Promotion Approved/Rejected**: Sent when admin reviews promotion payments
- **Service Payment Approved/Rejected**: Sent when admin verifies service payments

## 🎨 Email Templates

All emails use professional, responsive templates with:
- ✅ SearchNorthCyprus branding
- ✅ Mobile-friendly design
- ✅ Clear call-to-action buttons
- ✅ Consistent styling
- ✅ Professional appearance

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Failed (535 Error)
```
Error: Invalid login: 535 Authentication Failed
```
**Solutions:**
- Verify `ZOHO_EMAIL` and `ZOHO_APP_PASSWORD` are correct
- Ensure app password is generated specifically for email clients
- Check that Zoho account is active and verified

#### 2. Connection Timeout
```
Error: Connection timeout
```
**Solutions:**
- Check internet connectivity
- Verify SMTP host (`smtp.zoho.com`) and port (587)
- Ensure firewall allows outbound connections on port 587

#### 3. TLS/SSL Issues
```
Error: unable to verify the first certificate
```
**Solutions:**
- Try setting `secure: false` and `tls: { rejectUnauthorized: false }`
- Update Node.js to latest version
- Check system certificate store

### Development vs Production

#### Development Behavior
```bash
# If ZOHO_APP_PASSWORD is not set:
NODE_ENV=development
# Result: Emails logged to console, no actual sending

# If ZOHO_APP_PASSWORD is set:
NODE_ENV=development
ZOHO_APP_PASSWORD=your_password
# Result: Actual emails sent using Zoho SMTP
```

#### Production Behavior
```bash
NODE_ENV=production
ZOHO_APP_PASSWORD=required
# Result: All emails sent using Zoho SMTP, errors thrown on failure
```

## 📊 Monitoring & Logs

### Success Logs
```
📧 Email sent successfully to user@example.com: messageId-12345
```

### Development Mode Logs
```
📧 [DEV MODE] Would send email to user@example.com: Welcome to SearchNorthCyprus
📧 [DEV MODE] Email failed but continuing anyway: Password Reset Request
```

### Error Logs
```
❌ Email sending failed to user@example.com: Authentication failed
```

## 🔧 Alternative SMTP Providers

If you need to switch from Zoho, update these settings:

### Gmail
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
}
```

### SendGrid
```javascript
{
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: 'your-sendgrid-api-key'
  }
}
```

### AWS SES
```javascript
{
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  auth: {
    user: 'your-access-key-id',
    pass: 'your-secret-access-key'
  }
}
```

## 🚨 Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Enable 2FA** on your email provider account
4. **Use app passwords** instead of regular passwords
5. **Monitor email logs** for suspicious activity
6. **Set up SPF/DKIM records** for better deliverability

## 📈 Production Checklist

- [ ] Zoho Mail account created and verified
- [ ] App password generated and tested
- [ ] Environment variables configured
- [ ] Email configuration test passed
- [ ] SPF/DKIM records configured
- [ ] Email logs monitored
- [ ] Backup SMTP provider configured (optional)

## 🆘 Support

If you encounter issues:

1. **Check logs** in server console
2. **Verify credentials** in Zoho Mail dashboard
3. **Test configuration** using the test script
4. **Review firewall settings** for outbound SMTP
5. **Contact Zoho support** for provider-specific issues

---

**Note**: This email system is designed to be fault-tolerant in development and reliable in production. Always test thoroughly before deploying to production!