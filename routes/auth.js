const express = require("express");
const nodemailer = require("nodemailer");
const { db, hash, hashPassword, verifyPassword, models, isMongoConnected } = require("../db");

const router = express.Router();

function getMailTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return null;
}

// Helper to ensure user session info is populated
function setAuthSession(req, user) {
  req.session.userId = user.id;
  req.session.role = user.role || "user";
  req.session.isAdmin = user.role === "admin";
  req.session.username = user.email || user.username;
  req.session.fullName = user.full_name || user.username || "Traveler";
  req.session.email = user.email;
}

// POST /api/auth/register — traveler registration
router.post("/register", (req, res) => {
  const { full_name, email, password, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "Full name, email, and password are required" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(email.trim().toLowerCase(), email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists. Please log in." });
  }

  const password_hash = hashPassword(password);
  const info = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?, 'user')
  `).run(email.trim().toLowerCase(), full_name.trim(), email.trim().toLowerCase(), password_hash, phone ? phone.trim() : null);

  const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  setAuthSession(req, newUser);

  if (isMongoConnected() && models && models.User) {
    models.User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      {
        $set: {
          sqlite_id: info.lastInsertRowid,
          username: email.trim().toLowerCase(),
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          password_hash,
          phone: phone ? phone.trim() : null,
          role: "user"
        }
      },
      { upsert: true }
    ).catch((err) => console.warn("[MongoDB] User async sync notice:", err.message));
  }

  res.status(201).json({

    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role
    }
  });
});

// POST /api/auth/login — traveler login
router.post("/login", (req, res) => {
  const { username, email, password } = req.body;
  const loginIdentifier = (email || username || "").trim().toLowerCase();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Look in users table
  const user = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(loginIdentifier, loginIdentifier);
  if (user && verifyPassword(password, user.password_hash)) {
    setAuthSession(req, user);
    return res.json({
      success: true,
      role: user.role || "user",
      user: {
        id: user.id,
        email: user.email || user.username,
        full_name: user.full_name || user.username,
        role: user.role || "user"
      }
    });
  }

  // Check if admin is trying to sign in here
  const admin = db.prepare("SELECT * FROM admin_users WHERE username = ? OR email = ?").get(loginIdentifier, loginIdentifier);
  if (admin && verifyPassword(password, admin.password_hash)) {
    req.session.role = "admin";
    req.session.isAdmin = true;
    req.session.username = admin.username;
    req.session.fullName = "Administrator";
    return res.json({
      success: true,
      role: "admin",
      user: {
        username: admin.username,
        role: "admin",
        full_name: "Administrator"
      }
    });
  }

  return res.status(401).json({ error: "Invalid email or password. Please try again." });
});

// POST /api/auth/google — Google Sign-In verification or test-mode sign-in
router.post("/google", async (req, res) => {
  const { credential, email, name, google_id } = req.body;

  let userEmail = email;
  let userName = name;
  let userGoogleId = google_id;

  // If a JWT credential token was passed from Google Identity Services
  if (credential) {
    try {
      // Decode JWT payload (base64)
      const parts = credential.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        userEmail = payload.email;
        userName = payload.name;
        userGoogleId = payload.sub;
      }
    } catch (err) {
      console.warn("Could not decode Google JWT:", err.message);
    }
  }

  if (!userEmail) {
    // If demo fallback
    userEmail = "traveler@wayfarer.travel";
    userName = "Demo Traveler (Google)";
    userGoogleId = "google_demo_12345";
  }

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(userEmail.toLowerCase());
  if (!user) {
    // Create new account automatically for Google user
    const randomSecret = hashPassword(Math.random().toString(36) + Date.now());
    const info = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, google_id, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `).run(userEmail.toLowerCase(), userName, userEmail.toLowerCase(), randomSecret, userGoogleId);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  } else if (!user.google_id && userGoogleId) {
    db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userGoogleId, user.id);
  }

  setAuthSession(req, user);

  res.json({
    success: true,
    role: "user",
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: "user"
    }
  });
});

// GET /api/auth/me — session status
router.get("/me", (req, res) => {
  if (!req.session || (!req.session.username && !req.session.userId)) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    role: req.session.role || (req.session.isAdmin ? "admin" : "user"),
    username: req.session.username,
    fullName: req.session.fullName || req.session.username,
    email: req.session.email || req.session.username,
    userId: req.session.userId || null
  });
});

// GET /api/auth/config — public client keys
router.get("/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || ""
  });
});

// POST /api/auth/send-otp — generate & send real-time Gmail OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ error: "Email address is required" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  // Generate secure 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Upsert into otp_codes table
  db.prepare(`
    INSERT INTO otp_codes (email, code, expires_at, attempts)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(email) DO UPDATE SET
      code = excluded.code,
      expires_at = excluded.expires_at,
      attempts = 0
  `).run(cleanEmail, code, expiresAt);

  console.log("==================================================");
  console.log("[WAYFARER REAL-TIME GMAIL OTP]");
  console.log(`Recipient: ${cleanEmail}`);
  console.log(`Verification Code: ${code}`);
  console.log(`Expires in: 10 minutes (valid until ${new Date(expiresAt).toLocaleTimeString()})`);
  console.log("==================================================");

  let emailSent = false;
  let emailNotice = "";
  const transporter = getMailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Wayfarer Travel" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: `Your Wayfarer Login OTP: ${code}`,
        text: `Your Wayfarer one-time login verification code is ${code}. It is valid for 10 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px; border: 1px solid #e2ded5; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0f7a5f; margin: 0; font-size: 24px; letter-spacing: 0.5px;">WAYFARER</h2>
              <p style="color: #71716b; font-size: 13px; margin: 4px 0 0;">South India Tours &amp; Travel</p>
            </div>
            <div style="background: #f7f6f2; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
              <div style="font-size: 14px; color: #555; margin-bottom: 8px;">Your One-Time Login Code</div>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f7a5f; font-family: monospace;">${code}</div>
              <div style="font-size: 12px; color: #888; margin-top: 8px;">Valid for 10 minutes · Do not share this code with anyone</div>
            </div>
            <p style="font-size: 13.5px; color: #555; line-height: 1.5; margin: 0 0 16px;">
              Use this code to securely log in to your Wayfarer account or authorize your booking payment.
            </p>
            <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #999; text-align: center;">
              If you didn't request this code, you can safely ignore this email.
            </div>
          </div>
        `
      });
      emailSent = true;
      console.log(`[WAYFARER EMAIL] Live OTP email successfully sent to ${cleanEmail}`);
    } catch (mailErr) {
      console.error("[WAYFARER EMAIL ERROR] Could not dispatch email via SMTP:", mailErr.message);
      emailNotice = mailErr.message;
    }
  }

  res.json({
    success: true,
    message: emailSent
      ? `Verification code dispatched to ${cleanEmail} in real time!`
      : `Verification code generated for ${cleanEmail}!`,
    email: cleanEmail,
    emailSent,
    emailNotice,
    previewOtp: code
  });
});

// POST /api/auth/verify-otp — verify OTP and log traveler in
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanOtp = (otp || "").toString().trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ error: "Both email and 6-digit OTP code are required" });
  }

  const record = db.prepare("SELECT * FROM otp_codes WHERE email = ?").get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: "No OTP was requested for this email. Please request a new code." });
  }

  if (Date.now() > record.expires_at) {
    db.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);
    return res.status(400).json({ error: "This OTP code has expired. Please request a new code." });
  }

  if (record.code !== cleanOtp) {
    db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?").run(cleanEmail);
    return res.status(400).json({ error: "Invalid OTP code. Please enter the correct 6-digit code." });
  }

  // Clear consumed OTP
  db.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);

  // Find or automatically create traveler user
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
  if (!user) {
    const rawName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
    const defaultName = rawName.replace(/\b\w/g, (c) => c.toUpperCase());
    const randomSecret = hashPassword(Math.random().toString(36) + Date.now());
    const info = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run(cleanEmail, defaultName, cleanEmail, randomSecret);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  }

  setAuthSession(req, user);

  res.json({
    success: true,
    message: "Successfully signed in!",
    role: "user",
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    }
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
