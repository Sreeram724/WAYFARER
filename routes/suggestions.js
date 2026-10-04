const express = require("express");
const nodemailer = require("nodemailer");
const { db, models, isMongoConnected } = require("../db");

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

// POST /api/suggestions — submit user feedback/suggestion/complaint/request
router.post("/", async (req, res) => {
  const { name, email, category = "suggestion", message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  const userId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const stmt = db.prepare(`
      INSERT INTO suggestions (user_id, name, email, category, message, status)
      VALUES (?, ?, ?, ?, ?, 'unread')
    `);
    const info = stmt.run(userId, name.trim(), email.trim(), category, message.trim());

    if (isMongoConnected() && models && models.Suggestion) {
      models.Suggestion.create({
        sqlite_id: info.lastInsertRowid,
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        category,
        message: message.trim(),
        status: "unread"
      }).catch((err) => console.warn("[MongoDB] Suggestion async sync notice:", err.message));
    }


    // Best-effort email dispatch if configured (safe fallback)
    const transporter = getMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: "hello@wayfarer.travel",
          subject: `[Wayfarer Feedback - ${category.toUpperCase()}] from ${name.trim()}`,
          text: `New ${category} submitted on Wayfarer:\n\nFrom: ${name.trim()} (${email.trim()})\nCategory: ${category}\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${message.trim()}`
        });
      } catch (mailErr) {
        console.warn("Notice: Feedback email notification could not be dispatched:", mailErr.message);
      }
    }

    const created = db.prepare("SELECT * FROM suggestions WHERE id = ?").get(info.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Thank you for your valuable feedback! Our team has received your submission.",
      suggestion: created
    });
  } catch (err) {
    console.error("Error saving suggestion:", err);
    res.status(500).json({ error: "Unable to save your submission. Please try again." });
  }
});

// GET /api/suggestions/my-suggestions — view traveler's own suggestions
router.get("/my-suggestions", (req, res) => {
  if (!req.session || (!req.session.userId && !req.session.email)) {
    return res.status(401).json({ error: "Sign in required" });
  }

  const email = (req.session.email || req.session.username || "").toLowerCase();
  const userId = req.session.userId || 0;

  const rows = db.prepare(`
    SELECT * FROM suggestions
    WHERE user_id = ? OR LOWER(email) = ?
    ORDER BY created_at DESC
  `).all(userId, email);

  res.json(rows);
});

module.exports = router;
