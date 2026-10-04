const express = require("express");
const { db, models, isMongoConnected } = require("../db");
const { requireAdmin } = require("./admin");

const router = express.Router();

// POST /api/contact — public, submit a contact message
router.post("/", (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email and message are required" });
  }
  const info = db.prepare(`
    INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)
  `).run(name, email, subject || "", message);

  if (isMongoConnected() && models && models.Message) {
    models.Message.create({
      sqlite_id: info.lastInsertRowid,
      name,
      email,
      subject: subject || "",
      message
    }).catch((err) => console.warn("[MongoDB] Message async sync notice:", err.message));
  }

  res.status(201).json({ message: "Thanks — we'll get back to you within one business day.", id: info.lastInsertRowid });
});


// GET /api/contact — admin only, list messages
router.get("/", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all());
});

module.exports = router;
