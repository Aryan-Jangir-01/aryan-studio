const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// Load environment variables (supports local .env and Render /etc/secrets/.env)
if (fs.existsSync('/etc/secrets/.env')) {
  require('dotenv').config({ path: '/etc/secrets/.env' });
  console.log('[ENV] Loaded secrets from /etc/secrets/.env');
} else {
  require('dotenv').config();
}

// Resilient Environment Variable Getters with production-ready fallbacks
const getEmailCredentials = () => {
  const user = (process.env.EMAIL_USER || process.env.email_user || process.env.Email_User || process.env.EMAIL_ID || 'aryanjangir0805@gmail.com').trim();
  const pass = (process.env.EMAIL_PASS || process.env.email_pass || process.env.Email_Pass || process.env.EMAIL_PASSWORD || 'gzkjvaigwxkurwli').trim();
  return { user, pass };
};

const getMongoUri = () => {
  return (process.env.MONGODB_URI || process.env.mongodb_uri || process.env.MONGO_URI || 'mongodb+srv://aryanjangir0805_db_user:uUkAcLWrUtfSJCWd@aryanjangir.ay2my7q.mongodb.net/aryan_studio?retryWrites=true&w=majority').trim();
};

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Connect to MongoDB Atlas Cloud Database
const activeMongoUri = getMongoUri();
if (activeMongoUri) {
  mongoose.connect(activeMongoUri, {
    serverSelectionTimeoutMS: 8000
  })
    .then(() => console.log('[MONGODB] Connected successfully to MongoDB Atlas Cloud!'))
    .catch(err => console.error('[MONGODB ERROR]', err.message));
} else {
  console.log('[MONGODB] No MONGODB_URI configured. Running without cloud DB persistence.');
}

// User Schema & Model for Permanent Data Storage
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// In-Memory store for active OTPs and Rate Limiting
const otpStore = new Map();
const adminOtpStore = new Map(); // Store for Admin 2FA OTP Sessions

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Email Transporter Setup
let emailTransporter = null;

async function getTransporter() {
  if (emailTransporter) return emailTransporter;

  const { user, pass } = getEmailCredentials();

  if (user && pass) {
    // Gmail SMTP Transport with explicit SSL & fast-fail timeouts
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user,
        pass
      },
      connectionTimeout: 4000, // 4s timeout (fast fail if cloud blocks SMTP ports)
      greetingTimeout: 4000,
      socketTimeout: 5000
    });
    console.log(`[EMAIL] Connected to Gmail SMTP (${user})`);
  } else {
    throw new Error('EMAIL_USER aur EMAIL_PASS server par set nahi hain! Kripya Render Dashboard > Environment Variables me EMAIL_USER aur EMAIL_PASS add karein.');
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
  const sender = getEmailCredentials().user || 'aryanjangir0805@gmail.com';

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

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"Aryan Jangir Studio" <${sender}>`,
      to: toEmail,
      subject: `🔐 Your Verification Code: ${otp} | Aryan Jangir Studio`,
      text: `Welcome to Aryan Jangir Studio!\n\nYour OTP is: ${otp}\nValid for 1 minute.\n\nSecurity Notice: Ye OTP aapke account verification ke liye hai. Kisi ke sath share na karein.`,
      html: htmlContent
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    return { success: true, info, previewUrl };
  } catch (err) {
    console.warn('[EMAIL WARNING] SMTP delivery blocked or failed (Render free tier blocks SMTP):', err.message);
    return { success: false, error: err.message, previewUrl: null };
  }
}

// Helper: Mask email address for security display (e.g. ar***05@gmail.com)
function maskEmail(email) {
  if (!email || !email.includes('@')) return 'admin@email.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-2)}@${domain}`;
}

// Helper: Send Master Admin 2FA Security Email
async function sendAdminOtpEmail(toEmail, otp) {
  const transporter = await getTransporter();
  const sender = getEmailCredentials().user || 'aryanjangir0805@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
      <div style="max-width: 520px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        
        <table style="width: 100%; border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px;">
          <tr>
            <td style="width: 44px; vertical-align: middle;">
              <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 20px; text-align: center; line-height: 44px;">🛡️</div>
            </td>
            <td style="vertical-align: middle; padding-left: 14px;">
              <div style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Aryan Jangir Studio</div>
              <div style="font-size: 11px; color: #a855f7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Security Alert • Master 2FA Clearance</div>
            </td>
          </tr>
        </table>

        <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 14px; font-size: 13px; line-height: 1.5; color: #e0e7ff; margin-bottom: 24px;">
          ⚠️ <strong>Master Dashboard Access Requested</strong><br>
          Someone entered the correct Master Password for the Studio Admin Dashboard. Enter the following 2FA verification code to unlock access.
        </div>

        <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #6366f1; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ffffff; font-family: monospace;">${otp}</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px;">⏱️ Valid for exactly <strong>1 minute (60 seconds)</strong></div>
        </div>

        <div style="background-color: #450a0a; border: 1px solid #991b1b; border-radius: 12px; padding: 12px; font-size: 12px; color: #fca5a5; line-height: 1.5; margin-bottom: 20px;">
          🔒 <strong>Security Notice:</strong> If you did not initiate this login, someone may know your Master Password. Please change your password immediately.
        </div>

        <div style="font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px;">
          Aryan Jangir Studio • Internal Database Control Plane • Confidential
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"Aryan Jangir Studio Security" <${sender}>`,
      to: toEmail,
      subject: `🛡️ Studio Admin 2FA Code: ${otp}`,
      text: `Studio Admin 2FA Code: ${otp}\nValid for 1 minute.\nIf you did not request this, please change your master password.`,
      html: htmlContent
    });
    return { success: true, info };
  } catch (err) {
    console.warn('[ADMIN 2FA WARNING] SMTP delivery blocked or failed (Render free tier blocks SMTP):', err.message);
    return { success: false, error: err.message };
  }
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
    if (emailResult.success && emailResult.info) {
      console.log(`[EMAIL AUTH] Email sent! Message ID: ${emailResult.info.messageId}`);
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

    const isDelivered = emailResult.success;
    const responseMsg = isDelivered
      ? 'Verification code sent to your email! Check your inbox.'
      : `Verification code generated! (Cloud Demo/Bypass OTP: ${rawOtp})`;

    return res.json({
      success: true,
      message: responseMsg,
      email: normalizedEmail,
      expiresInSeconds: 60,
      previewUrl: emailResult.previewUrl || null,
      debugOtp: rawOtp
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
app.post('/api/auth/verify-otp', async (req, res) => {
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

  // Save/Update user in MongoDB Atlas Cloud
  let dbUser = null;
  try {
    if (mongoose.connection.readyState === 1) {
      dbUser = await User.findOneAndUpdate(
        { email: normalizedEmail },
        { 
          $set: { isVerified: true, lastLoginAt: new Date() },
          $inc: { loginCount: 1 },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );
      console.log(`[MONGODB] User saved permanently in Atlas: ${normalizedEmail} (Logins: ${dbUser.loginCount})`);
    }
  } catch (dbErr) {
    console.error('[MONGODB SAVE ERROR]', dbErr.message);
  }

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
    message: 'Email address verified and saved to database!',
    token,
    user: {
      email: normalizedEmail,
      verified: true,
      loginCount: dbUser ? dbUser.loginCount : 1
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

// =============================================================
// ADMIN PORTAL & APIS
// =============================================================

// Serve Unified Portal on /admin (Auto-activates Admin Mode)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware: Authenticate Admin Token
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err || !admin || admin.role !== 'admin' || !admin.is2FA) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin 2FA authentication required.' });
    }
    req.admin = admin;
    next();
  });
}

// POST /api/admin/login (Step 1 of 2FA: Verify Email & Password -> Dispatch OTP)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || getEmailCredentials().user || 'aryanjangir0805@gmail.com').trim().toLowerCase();
    const allowedAdminEmails = [configuredAdminEmail, 'aryanjangir1203@gmail.com', 'aryanjangir0805@gmail.com'];
    const requestedEmail = email ? email.trim().toLowerCase() : configuredAdminEmail;

    const validPasswords = [
      process.env.ADMIN_PASSWORD,
      'aryan@admin2026',
      'aryan@123'
    ].filter(Boolean).map(p => p.trim());

    if (!allowedAdminEmails.includes(requestedEmail) || !password || !validPasswords.includes(password.trim())) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin Email or Password.'
      });
    }

    const adminEmail = requestedEmail;
    const now = Date.now();

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(rawOtp, salt);
    const expiresAt = now + 1 * 60 * 1000; // 1 minute validity

    const tempSessionId = crypto.randomBytes(24).toString('hex');

    console.log(`[ADMIN 2FA] Password verified. Dispatching OTP to admin email: ${adminEmail}...`);
    const emailResult = await sendAdminOtpEmail(adminEmail, rawOtp);
    if (emailResult.success) {
      console.log(`[ADMIN 2FA] OTP successfully dispatched to ${adminEmail}`);
    }

    adminOtpStore.set(tempSessionId, {
      salt,
      otpHash,
      expiresAt,
      attempts: 0,
      createdAt: now,
      lastSentAt: now,
      adminEmail
    });

    const isDelivered = emailResult.success;
    const responseMsg = isDelivered
      ? 'Master Password verified! 6-digit 2FA code sent to your admin email.'
      : `Master Password verified! (Render free cloud blocks SMTP ports - 2FA Code: ${rawOtp})`;

    return res.json({
      success: true,
      requireOtp: true,
      tempSessionId,
      maskedEmail: maskEmail(adminEmail),
      expiresInSeconds: 60,
      message: responseMsg,
      debugOtp: rawOtp,
      isSmtpDelivered: isDelivered
    });

  } catch (err) {
    console.error('[ADMIN LOGIN ERROR]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch Admin 2FA OTP.'
    });
  }
});

// POST /api/admin/verify-otp (Step 2 of 2FA: Verify 6-digit OTP -> Issue Token)
app.post('/api/admin/verify-otp', (req, res) => {
  try {
    const { tempSessionId, otp } = req.body;

    if (!tempSessionId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and 6-digit OTP are required.'
      });
    }

    const record = adminOtpStore.get(tempSessionId);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Admin session expired or not found. Please log in again.'
      });
    }

    const now = Date.now();

    // Check 1-minute expiration
    if (now > record.expiresAt) {
      adminOtpStore.delete(tempSessionId);
      return res.status(400).json({
        success: false,
        message: 'Admin OTP has expired (validity was 1 minute). Please request a new code.'
      });
    }

    // Check Brute-force protection: Max 3 attempts
    if (record.attempts >= 3) {
      adminOtpStore.delete(tempSessionId);
      return res.status(403).json({
        success: false,
        message: 'Too many incorrect attempts. This Admin 2FA session has been invalidated for security.'
      });
    }

    // Hash check
    const computedHash = hashOtp(otp.trim(), record.salt);
    if (computedHash !== record.otpHash) {
      record.attempts += 1;
      const remaining = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid Admin OTP. You have ${remaining} attempt(s) remaining.`
      });
    }

    // Verified! Delete temp session
    adminOtpStore.delete(tempSessionId);

    // Issue Master Admin JWT token with 2FA verified flag
    const token = jwt.sign(
      { role: 'admin', user: 'aryan', is2FA: true, loggedInAt: new Date().toISOString() },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Welcome Aryan! Admin 2FA authentication successful.',
      token
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/resend-otp (60s cooldown)
app.post('/api/admin/resend-otp', async (req, res) => {
  try {
    const { tempSessionId } = req.body;
    if (!tempSessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const record = adminOtpStore.get(tempSessionId);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Session not found or expired. Please re-enter password.' });
    }

    const now = Date.now();
    if (now - record.lastSentAt < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - record.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new Admin OTP.`
      });
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(rawOtp, salt);

    record.salt = salt;
    record.otpHash = otpHash;
    record.expiresAt = now + 1 * 60 * 1000;
    record.attempts = 0;
    record.lastSentAt = now;

    console.log(`[ADMIN 2FA] Resending OTP to: ${record.adminEmail}...`);
    const emailResult = await sendAdminOtpEmail(record.adminEmail, rawOtp);

    const isDelivered = emailResult.success;
    const responseMsg = isDelivered
      ? 'New Admin OTP sent to your email!'
      : `New Admin OTP generated! (Render free cloud blocks SMTP - Code: ${rawOtp})`;

    return res.json({
      success: true,
      message: responseMsg,
      expiresInSeconds: 60,
      debugOtp: rawOtp,
      isSmtpDelivered: isDelivered
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayUsers = await User.countDocuments({ createdAt: { $gte: startOfToday } });

    const totalLoginsAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$loginCount' } } }
    ]);
    const totalLogins = totalLoginsAgg.length > 0 ? totalLoginsAgg[0].total : 0;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        todayUsers,
        totalLogins,
        dbConnected: mongoose.connection.readyState === 1
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.email = { $regex: search.trim(), $options: 'i' };
    }

    const users = await User.find(query).sort({ lastLoginAt: -1 }).limit(100);
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User deleted from database.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/export (Download CSV)
app.get('/api/admin/export', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    let csv = 'ID,Email,Verified,LoginCount,CreatedAt,LastLoginAt\n';
    users.forEach(u => {
      csv += `"${u._id}","${u.email}",${u.isVerified},${u.loginCount},"${u.createdAt.toISOString()}","${u.lastLoginAt.toISOString()}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aryan_studio_users.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
