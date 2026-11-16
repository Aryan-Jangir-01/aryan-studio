const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// In-Memory store for OTPs and Rate Limiting
const otpStore = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Email Transporter Setup
let emailTransporter = null;

async function getTransporter() {
  if (emailTransporter) return emailTransporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Gmail SMTP Transport
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim()
      }
    });
    console.log(`[EMAIL] Connected to Gmail SMTP (${process.env.EMAIL_USER})`);
  } else {
    // Ethereal Test Transport (Fallback if credentials not provided)
    const testAccount = await nodemailer.createTestAccount();
    emailTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`[EMAIL] Running in Ethereal Test Mode. Add EMAIL_USER and EMAIL_PASS to .env for real Gmail delivery.`);
  }

  return emailTransporter;
}

// Helper: Hash OTP for secure storage
function hashOtp(otp, salt) {
  return crypto.createHash('sha256').update(otp + salt).digest('hex');
}

// Helper: Standardize email format
function normalizeEmail(email) {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Helper: Send Beautiful HTML OTP Email
async function sendOtpEmail(toEmail, otp) {
  const transporter = await getTransporter();
  const sender = process.env.EMAIL_USER || 'no-reply@authsystem.local';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #f8fafc; }
        .card { max-width: 500px; margin: 0 auto; background: #131b2e; border-radius: 24px; padding: 40px 32px; border: 1px solid #1e293b; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7); }
        .brand-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .brand-logo { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #a855f7); display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #ffffff; text-align: center; line-height: 42px; }
        .brand-name { font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
        .brand-subtitle { font-size: 11px; color: #94a3b8; font-weight: 500; }
        
        .welcome-box { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
        .welcome-box strong { color: #e0e7ff; font-weight: 600; }
        
        h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; }
        p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; }
        
        .otp-box { background: #0b0f19; border: 2px dashed #6366f1; border-radius: 16px; padding: 22px 24px; text-align: center; margin: 24px 0; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.3); }
        .timer-warning { font-size: 12px; color: #f59e0b; font-weight: 600; text-align: center; margin-top: 10px; }
        
        .notice-box { background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border-radius: 8px 12px 12px 8px; padding: 14px 18px; font-size: 12px; line-height: 1.6; color: #cbd5e1; margin-top: 24px; }
        .notice-box strong { color: #fde68a; }
        
        .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <!-- Brand Header -->
        <table style="width: 100%; margin-bottom: 24px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 48px; vertical-align: middle;">
              <div class="brand-logo">A</div>
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <div class="brand-name">Aryan Jangir Studio</div>
              <div class="brand-subtitle">Design • Development • Media</div>
            </td>
          </tr>
        </table>

        <!-- Point 1: Welcome Greeting -->
        <div class="welcome-box">
          👋 <strong>Welcome to Aryan Jangir Studio!</strong><br>
          Humare platform par aane ke liye shukriya. Aapka secure login verification code neeche taiyaar hai:
        </div>

        <!-- Point 2: OTP Section -->
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="timer-warning">⏱️ Valid for exactly 1 minute (60 seconds)</div>
        </div>

        <!-- Point 2: Custom Instructions / Notice -->
        <div class="notice-box">
          🛡️ <strong>Security Instructions:</strong><br>
          Ye OTP aapke account verification ke liye hai. Kripya kisi ke sath bhi apna OTP share na karein. Humari team aapse kabhi bhi aapka OTP nahi maangti.
        </div>

        <div class="footer">
          Sent with care by <strong>Aryan Jangir Studio</strong><br>
          If you did not request this code, you can safely ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: `"Aryan Jangir Studio" <${sender}>`,
    to: toEmail,
    subject: `🔐 Your Verification Code: ${otp} | Aryan Jangir Studio`,
    text: `Welcome to Aryan Jangir Studio!\n\nYour OTP is: ${otp}\nValid for 1 minute.\n\nSecurity Notice: Ye OTP aapke account verification ke liye hai. Kisi ke sath share na karein.`,
    html: htmlContent
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { info, previewUrl };
}

// -------------------------------------------------------------
// POST /api/auth/send-otp (Sends Real Email OTP)
// -------------------------------------------------------------
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    const now = Date.now();
    const existingRecord = otpStore.get(normalizedEmail);

    // 1. Rate Limiting: 60-second cooldown (1 minute)
    if (existingRecord && now - existingRecord.lastSentAt < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - existingRecord.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // 2. Rate Limiting: Max 10 OTPs per hour per email
    let countThisHour = 1;
    let hourResetAt = now + 60 * 60 * 1000;

    if (existingRecord) {
      if (now < existingRecord.hourResetAt) {
        if (existingRecord.countThisHour >= 10) {
          const resetMinutes = Math.ceil((existingRecord.hourResetAt - now) / (60 * 1000));
          return res.status(429).json({
            success: false,
            message: `Too many OTP requests. Try again in ${resetMinutes} minutes.`
          });
        }
        countThisHour = existingRecord.countThisHour + 1;
        hourResetAt = existingRecord.hourResetAt;
      }
    }

    // Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedOtp = hashOtp(rawOtp, salt);
    const expiresAt = now + 1 * 60 * 1000; // 1 minute validity (60 seconds)

    console.log(`[EMAIL AUTH] Dispatching OTP to: ${normalizedEmail}...`);
    const emailResult = await sendOtpEmail(normalizedEmail, rawOtp);
    console.log(`[EMAIL AUTH] Email sent! Message ID: ${emailResult.info.messageId}`);
    if (emailResult.previewUrl) {
      console.log(`[EMAIL AUTH] Test Preview URL: ${emailResult.previewUrl}`);
    }

    // Save in store
    otpStore.set(normalizedEmail, {
      salt,
      otpHash: hashedOtp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      countThisHour,
      hourResetAt
    });

    return res.json({
      success: true,
      message: 'Verification code sent to your email! Check your inbox.',
      email: normalizedEmail,
      expiresInSeconds: 60,
      previewUrl: emailResult.previewUrl || null
    });

  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP email.'
    });
  }
});

// -------------------------------------------------------------
// POST /api/auth/verify-otp
// -------------------------------------------------------------
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Both email and OTP are required.'
    });
  }

  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'No active OTP found. Please request a new OTP.'
    });
  }

  const now = Date.now();

  // Check expiration (1 minute)
  if (now > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({
      success: false,
      message: 'OTP has expired (validity was 1 minute). Please request a new code.'
    });
  }

  // Brute-force protection: Max 3 attempts
  if (record.attempts >= 3) {
    otpStore.delete(normalizedEmail);
    return res.status(403).json({
      success: false,
      message: 'Too many incorrect attempts. This OTP has been invalidated for security.'
    });
  }

  // Verify hash
  const computedHash = hashOtp(otp.trim(), record.salt);
  if (computedHash !== record.otpHash) {
    record.attempts += 1;
    const remaining = 3 - record.attempts;
    return res.status(400).json({
      success: false,
      message: `Invalid OTP. You have ${remaining} attempt(s) remaining.`
    });
  }

  // Verification successful! Invalidate used OTP immediately
  otpStore.delete(normalizedEmail);

  // Generate JWT Session Token
  const token = jwt.sign(
    {
      email: normalizedEmail,
      verifiedAt: new Date().toISOString(),
      role: 'user'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    message: 'Email address verified successfully!',
    token,
    user: {
      email: normalizedEmail,
      verified: true
    }
  });
});

// -------------------------------------------------------------
// Middleware: Authenticate Token for Protected Routes
// -------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// GET /api/auth/session (Protected)
// -------------------------------------------------------------
app.get('/api/auth/session', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'User session active and verified.',
    user: req.user
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
