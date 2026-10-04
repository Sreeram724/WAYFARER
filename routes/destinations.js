const express = require("express");
const { db } = require("../db");
const { requireAdmin } = require("./admin");

const router = express.Router();

// GET /api/destinations — optional ?category= and ?region=
router.get("/", (req, res) => {
  const { category, region } = req.query;
  let sql = "SELECT * FROM destinations WHERE 1=1";
  const params = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (region) {
    sql += " AND region = ?";
    params.push(region);
  }
  sql += " ORDER BY id ASC";
  res.json(db.prepare(sql).all(...params));
});

// GET /api/destinations/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM destinations WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Destination not found" });
  res.json(row);
});

// POST /api/destinations — admin only
router.post("/", requireAdmin, (req, res) => {
  const { name, region, tagline, category, image_url, description } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "name and category are required" });
  }
  const info = db.prepare(`
    INSERT INTO destinations (name, region, tagline, category, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), region || "South India", tagline || "", category, image_url || "", description || "");
  res.status(201).json(db.prepare("SELECT * FROM destinations WHERE id = ?").get(info.lastInsertRowid));
});

// PUT /api/destinations/:id — admin only
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM destinations WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Destination not found" });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE destinations SET name=?, region=?, tagline=?, category=?, image_url=?, description=? WHERE id=?
  `).run(merged.name, merged.region || "South India", merged.tagline, merged.category, merged.image_url, merged.description, req.params.id);
  res.json(db.prepare("SELECT * FROM destinations WHERE id = ?").get(req.params.id));
});

// DELETE /api/destinations/:id — admin only
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM destinations WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Destination not found" });
  db.prepare("DELETE FROM destinations WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
