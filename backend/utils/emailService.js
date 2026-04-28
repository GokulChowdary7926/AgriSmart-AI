const nodemailer = require('nodemailer');
const logger = require('./logger');

function isEmailConfigured() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

let transporter = null;

function getTransporter() {
  if (!transporter && isEmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    transporter.verify().then(
      () => {
        logger.info('Email service is ready to send messages');
      },
      (error) => {
        logger.warn('Email service verification failed', { error: error.message });
      }
    );
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject) {
    logger.warn('sendEmail called without required fields', { hasTo: !!to, hasSubject: !!subject });
    return;
  }

  if (!isEmailConfigured()) {
    logger.warn('Email service not configured. Skipping real email send.', { to, subject });
    logger.info('Email content (simulation)', { to, subject, text, html });
    return;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    };

    const client = getTransporter();
    if (!client) {
      logger.warn('Email transporter not available even though configuration is set');
      return;
    }

    const info = await client.sendMail(mailOptions);
    logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
  } catch (error) {
    logger.error('Error sending email', { to, subject, error: error.message });
  }
}

async function sendPasswordResetEmail(user, resetToken) {
  if (!user || !user.email) {
    logger.warn('sendPasswordResetEmail called without valid user');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl.replace(/\/+$/, '')}/reset-password/${resetToken}`;

  const subject = 'AgriSmart AI - Password Reset';
  const text = `Hello ${user.name || 'Farmer'},

You requested to reset your password for AgriSmart AI.

Please click the link below (or paste it into your browser) to set a new password:
${resetUrl}

This link will expire in 10 minutes. If you did not request a password reset, you can ignore this email.

Thanks,
AgriSmart AI Team`;

  const html = `
    <p>Hello ${user.name || 'Farmer'},</p>
    <p>You requested to reset your password for <strong>AgriSmart AI</strong>.</p>
    <p>Please click the button below to set a new password:</p>
    <p>
      <a href="${resetUrl}" style="
        display: inline-block;
        padding: 10px 16px;
        background-color: #2e7d32;
        color: #ffffff;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      ">
        Reset Password
      </a>
    </p>
    <p>Or open this link in your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 10 minutes. If you did not request a password reset, you can ignore this email.</p>
    <p>Thanks,<br/>AgriSmart AI Team</p>
  `;

  await sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
}

async function sendVerificationEmail(user, verificationToken) {
  if (!user || !user.email) {
    logger.warn('sendVerificationEmail called without valid user');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl.replace(/\/+$/, '')}/verify-email?token=${verificationToken}`;

  const subject = 'AgriSmart AI - Verify Your Email';
  const text = `Hello ${user.name || 'Farmer'},

Welcome to AgriSmart AI!

Please verify your email address by clicking the link below:
${verifyUrl}

This link will expire in 24 hours. If you did not create this account, you can ignore this email.

Thanks,
AgriSmart AI Team`;

  const html = `
    <p>Hello ${user.name || 'Farmer'},</p>
    <p>Welcome to <strong>AgriSmart AI</strong>!</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p>
      <a href="${verifyUrl}" style="
        display: inline-block;
        padding: 10px 16px;
        background-color: #2e7d32;
        color: #ffffff;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      ">
        Verify Email
      </a>
    </p>
    <p>Or open this link in your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>This link will expire in 24 hours. If you did not create this account, you can ignore this email.</p>
    <p>Thanks,<br/>AgriSmart AI Team</p>
  `;

  await sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
};
