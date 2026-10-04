const express = require("express");
const { db } = require("../db");
const { requireAdmin } = require("./admin");

const router = express.Router();

// GET /api/packages  — list all, with optional filters
// query params: category, region, destination, q, sort, trending=1, featured=1
router.get("/", (req, res) => {
  const { category, region, destination, q, sort, trending, featured } = req.query;
  let sql = "SELECT * FROM packages WHERE 1=1";
  const params = [];

  if (category) {
    const cat = category.trim().toLowerCase();
    if (cat === "hill stations" || cat === "hill station") {
      sql += " AND (category = 'Hill Station' OR category = 'Hill Stations')";
    } else if (cat === "beaches" || cat === "beach") {
      sql += " AND (category = 'Beach' OR category = 'Beaches')";
    } else {
      sql += " AND (LOWER(category) = LOWER(?) OR LOWER(category) LIKE LOWER(?))";
      params.push(cat, `${cat}%`);
    }
  }
  if (region) {
    sql += " AND LOWER(region) = LOWER(?)";
    params.push(region.trim());
  }
  if (destination) {
    sql += " AND (destination_name LIKE ? OR highlights LIKE ? OR name LIKE ?)";
    params.push(`%${destination}%`, `%${destination}%`, `%${destination}%`);
  }
  if (q) {
    const term = `%${q.trim()}%`;
    sql += " AND (name LIKE ? OR destination_name LIKE ? OR highlights LIKE ? OR description LIKE ? OR category LIKE ?)";
    params.push(term, term, term, term, term);
  }
  if (trending) {
    sql += " AND trending = 1";
  }
  if (featured) {
    sql += " AND featured = 1";
  }

  // Sorting
  if (sort === "price_asc") {
    sql += " ORDER BY price ASC";
  } else if (sort === "price_desc") {
    sql += " ORDER BY price DESC";
  } else if (sort === "rating") {
    sql += " ORDER BY rating DESC, price ASC";
  } else if (sort === "duration") {
    sql += " ORDER BY duration_days ASC";
  } else {
    sql += " ORDER BY featured DESC, trending DESC, id ASC";
  }

  const rows = db.prepare(sql).all(...params);

  rows.forEach(row => {
    if (row.itinerary && typeof row.itinerary === "string") {
      try {
        row.parsed_itinerary = JSON.parse(row.itinerary);
      } catch {
        row.parsed_itinerary = null;
      }
    }
  });

  res.json(rows);
});

// GET /api/packages/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM packages WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Package not found" });

  if (row.itinerary && typeof row.itinerary === "string") {
    try {
      row.parsed_itinerary = JSON.parse(row.itinerary);
    } catch {
      row.parsed_itinerary = null;
    }
  }

  res.json(row);
});

// POST /api/packages  — admin only
router.post("/", requireAdmin, (req, res) => {
  const {
    name, category, region, destination_name, duration_label, duration_days, travel_hours, season,
    price, child_price, rating, highlights, image_url, description,
    pickup_locations, drop_locations, accommodation, itinerary, trending, featured
  } = req.body;

  if (!name || !category || !duration_label || !price) {
    return res.status(400).json({ error: "name, category, duration_label and price are required" });
  }

  const formattedItinerary = typeof itinerary === "object" ? JSON.stringify(itinerary) : (itinerary || "");

  const stmt = db.prepare(`
    INSERT INTO packages (
      name, category, region, destination_name, duration_label, duration_days, travel_hours, season,
      price, child_price, rating, highlights, image_url, description,
      pickup_locations, drop_locations, accommodation, itinerary, trending, featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    name.trim(),
    category.trim(),
    region || "South India",
    destination_name || "",
    duration_label.trim(),
    duration_days || 0,
    travel_hours || 4,
    season || "",
    Number(price) || 0,
    Number(child_price) || 0,
    Number(rating) || 4.8,
    highlights || "",
    image_url || "",
    description || "",
    pickup_locations || "",
    drop_locations || "",
    accommodation || "",
    formattedItinerary,
    trending ? 1 : 0,
    featured ? 1 : 0
  );

  const created = db.prepare("SELECT * FROM packages WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/packages/:id  — admin only
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM packages WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Package not found" });

  const merged = { ...existing, ...req.body };
  const formattedItinerary = typeof merged.itinerary === "object"
    ? JSON.stringify(merged.itinerary)
    : (merged.itinerary || "");

  db.prepare(`
    UPDATE packages SET
      name=?, category=?, region=?, destination_name=?, duration_label=?, duration_days=?,
      travel_hours=?, season=?, price=?, child_price=?, rating=?, highlights=?,
      image_url=?, description=?, pickup_locations=?, drop_locations=?,
      accommodation=?, itinerary=?, trending=?, featured=?
    WHERE id=?
  `).run(
    merged.name,
    merged.category,
    merged.region || "South India",
    merged.destination_name || "",
    merged.duration_label,
    merged.duration_days,
    merged.travel_hours || 4,
    merged.season,
    Number(merged.price),
    Number(merged.child_price || 0),
    Number(merged.rating || 4.8),
    merged.highlights,
    merged.image_url,
    merged.description,
    merged.pickup_locations,
    merged.drop_locations,
    merged.accommodation,
    formattedItinerary,
    merged.trending ? 1 : 0,
    merged.featured ? 1 : 0,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM packages WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/packages/:id  — admin only
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM packages WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Package not found" });
  db.prepare("DELETE FROM packages WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
