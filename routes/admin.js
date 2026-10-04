const express = require("express");
const { db, hashPassword, verifyPassword, isMongoConnected, syncSqliteToMongo, models } = require("../db");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.role === "admin")) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Admin login required" });
}

// POST /api/admin/login — dedicated admin sign in
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Admin ID and password are required" });
  }

  const admin = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username.trim());
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: "Invalid admin credentials. Access denied." });
  }

  req.session.isAdmin = true;
  req.session.role = "admin";
  req.session.username = admin.username;
  req.session.fullName = "Administrator";

  res.json({
    success: true,
    role: "admin",
    username: admin.username
  });
});

// POST /api/admin/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/admin/me
router.get("/me", (req, res) => {
  if (req.session && (req.session.isAdmin || req.session.role === "admin")) {
    return res.json({ loggedIn: true, role: "admin", username: req.session.username });
  }
  res.json({ loggedIn: false, role: null });
});

// POST /api/admin/change-password
router.post("/change-password", requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?")
    .run(hashPassword(newPassword), req.session.username);
  res.json({ success: true, message: "Password updated successfully" });
});

// GET /api/admin/stats — comprehensive dashboard statistics & package popularity
router.get("/stats", requireAdmin, (req, res) => {
  const packagesCount = db.prepare("SELECT COUNT(*) c FROM packages").get().c;
  const destinationsCount = db.prepare("SELECT COUNT(*) c FROM destinations").get().c;
  const totalBookings = db.prepare("SELECT COUNT(*) c FROM bookings").get().c;
  const pendingBookings = db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'pending'").get().c;
  const confirmedBookings = db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'confirmed'").get().c;
  const cancelledBookings = db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'cancelled'").get().c;
  const totalUsers = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  const messagesCount = db.prepare("SELECT COUNT(*) c FROM messages").get().c;

  // Calculate total revenue from paid bookings or completed payments
  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS rev
    FROM bookings
    WHERE payment_status = 'paid' OR status = 'confirmed'
  `).get();
  const totalRevenue = revenueRow ? revenueRow.rev : 0;

  // Package popularity breakdown: package name, number of bookings, total revenue
  const packagePopularity = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.category,
      p.price,
      p.image_url,
      COUNT(b.id) AS bookings_count,
      COALESCE(SUM(b.total_amount), 0) AS package_revenue
    FROM packages p
    LEFT JOIN bookings b ON b.package_id = p.id
    GROUP BY p.id
    ORDER BY bookings_count DESC, package_revenue DESC
  `).all();

  // Total distinct packages booked
  const packagesBookedCount = packagePopularity.filter(p => p.bookings_count > 0).length;

  res.json({
    packages: packagesCount,
    packagesBooked: packagesBookedCount,
    destinations: destinationsCount,
    bookings: totalBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    totalRevenue,
    totalUsers,
    messages: messagesCount,
    guides: db.prepare("SELECT COUNT(*) c FROM guides").get().c,
    completedBookings: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'completed'").get().c,
    packagePopularity
  });
});

// GET /api/admin/payments — view all transaction records
router.get("/payments", requireAdmin, (req, res) => {
  const payments = db.prepare(`
    SELECT
      py.*,
      b.booking_reference,
      b.full_name AS customer_name,
      b.email AS customer_email,
      p.name AS package_name
    FROM payments py
    LEFT JOIN bookings b ON b.id = py.booking_id
    LEFT JOIN packages p ON p.id = b.package_id
    ORDER BY py.paid_at DESC
  `).all();
  res.json(payments);
});

// ---------- TOUR GUIDE MANAGEMENT ----------
// GET /api/admin/guides
router.get("/guides", requireAdmin, (req, res) => {
  const guides = db.prepare(`
    SELECT g.*, COUNT(b.id) AS active_tours
    FROM guides g
    LEFT JOIN bookings b ON b.guide_id = g.id AND b.status IN ('confirmed', 'pending')
    GROUP BY g.id
    ORDER BY g.name ASC
  `).all();
  res.json(guides);
});

// POST /api/admin/guides — add new guide
router.post("/guides", requireAdmin, (req, res) => {
  const { name, email, phone, address, experience, languages, assigned_destination, assigned_package, status, photo_url } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Guide name and phone number are required" });
  }

  const stmt = db.prepare(`
    INSERT INTO guides (name, email, phone, address, experience, languages, assigned_destination, assigned_package, status, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    name.trim(),
    email ? email.trim() : null,
    phone.trim(),
    address ? address.trim() : "",
    experience ? experience.trim() : "5+ Years",
    languages ? languages.trim() : "English, Hindi",
    assigned_destination || "All Destinations",
    assigned_package || "All Packages",
    status || "available",
    photo_url || "assets/avatars/avatar2.jpg"
  );

  const created = db.prepare("SELECT * FROM guides WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ success: true, guide: created });
});

// PUT /api/admin/guides/:id — edit guide
router.put("/guides/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, experience, languages, assigned_destination, assigned_package, status, photo_url } = req.body;

  db.prepare(`
    UPDATE guides
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        experience = COALESCE(?, experience),
        languages = COALESCE(?, languages),
        assigned_destination = COALESCE(?, assigned_destination),
        assigned_package = COALESCE(?, assigned_package),
        status = COALESCE(?, status),
        photo_url = COALESCE(?, photo_url)
    WHERE id = ?
  `).run(name, email, phone, address, experience, languages, assigned_destination, assigned_package, status, photo_url, id);

  const updated = db.prepare("SELECT * FROM guides WHERE id = ?").get(id);
  res.json({ success: true, guide: updated });
});

// DELETE /api/admin/guides/:id
router.delete("/guides/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE bookings SET guide_id = NULL WHERE guide_id = ?").run(id);
  db.prepare("DELETE FROM guides WHERE id = ?").run(id);
  res.json({ success: true, message: "Guide removed successfully" });
});

// GET /api/admin/bookings — list all bookings with complete metadata
router.get("/bookings", requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT
      b.*,
      p.name AS package_name,
      p.destination_name,
      p.duration_label,
      p.duration_days,
      p.category AS package_category,
      p.image_url AS package_image,
      p.highlights,
      py.transaction_id AS payment_txn_id,
      py.payment_method AS paid_via,
      py.paid_at,
      py.gateway,
      g.name AS guide_name,
      g.phone AS guide_phone,
      g.email AS guide_email,
      g.experience AS guide_experience,
      g.languages AS guide_languages,
      g.photo_url AS guide_photo
    FROM bookings b
    LEFT JOIN packages p ON p.id = b.package_id
    LEFT JOIN payments py ON py.booking_id = b.id AND py.status = 'success'
    LEFT JOIN guides g ON g.id = b.guide_id
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/admin/bookings/:id — get complete booking detail
router.get("/bookings/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const booking = db.prepare(`
    SELECT
      b.*,
      p.name AS package_name,
      p.destination_name,
      p.duration_label,
      p.duration_days,
      p.category AS package_category,
      p.image_url AS package_image,
      p.accommodation,
      p.itinerary,
      p.highlights,
      py.transaction_id AS payment_txn_id,
      py.payment_method AS paid_via,
      py.paid_at,
      py.gateway,
      g.name AS guide_name,
      g.phone AS guide_phone,
      g.email AS guide_email,
      g.experience AS guide_experience,
      g.languages AS guide_languages,
      g.photo_url AS guide_photo
    FROM bookings b
    LEFT JOIN packages p ON p.id = b.package_id
    LEFT JOIN payments py ON py.booking_id = b.id AND py.status = 'success'
    LEFT JOIN guides g ON g.id = b.guide_id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id);

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// PUT /api/admin/bookings/:id/assign-guide — assign or change tour guide
router.put("/bookings/:id/assign-guide", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { guide_id } = req.body;

  const guideIdVal = guide_id && parseInt(guide_id, 10) > 0 ? parseInt(guide_id, 10) : null;
  db.prepare("UPDATE bookings SET guide_id = ? WHERE id = ?").run(guideIdVal, id);

  const booking = db.prepare(`
    SELECT b.*, g.name AS guide_name, g.phone AS guide_phone, g.email AS guide_email
    FROM bookings b
    LEFT JOIN guides g ON g.id = b.guide_id
    WHERE b.id = ?
  `).get(id);

  res.json({ success: true, message: "Tour guide assigned successfully", booking });
});

// PUT /api/admin/bookings/:id/status — update booking status
router.put("/bookings/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;

  if (status) {
    db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
  }
  if (payment_status) {
    db.prepare("UPDATE bookings SET payment_status = ? WHERE id = ?").run(payment_status, id);
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  res.json({ success: true, booking });
});

// DELETE /api/admin/bookings/:id
router.delete("/bookings/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM payments WHERE booking_id = ?").run(id);
  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  res.json({ success: true, message: "Booking removed" });
});

// ---------- USER MANAGEMENT ----------
// GET /api/admin/users — registered users with booking metrics
router.get("/users", requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.role,
      u.created_at,
      COUNT(b.id) AS bookings_count,
      COALESCE(SUM(CASE WHEN b.payment_status = 'paid' OR b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) AS total_spent
    FROM users u
    LEFT JOIN bookings b ON b.user_id = u.id OR LOWER(b.email) = LOWER(u.email)
    GROUP BY u.id
    ORDER BY u.id DESC
  `).all();
  res.json(users);
});

// ---------- PACKAGE MANAGEMENT ----------
// POST /api/admin/packages
router.post("/packages", requireAdmin, (req, res) => {
  const { name, category, region, destination_name, duration_label, duration_days, travel_hours, season, price, child_price, rating, highlights, image_url, description, pickup_locations, drop_locations, accommodation, itinerary, trending, featured } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: "Package name and price are required" });
  }

  const stmt = db.prepare(`
    INSERT INTO packages (name, category, region, destination_name, duration_label, duration_days, travel_hours, season, price, child_price, rating, highlights, image_url, description, pickup_locations, drop_locations, accommodation, itinerary, trending, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    name.trim(),
    category || "Hill Station",
    region || "South India",
    destination_name || name,
    duration_label || "3N/4D",
    parseInt(duration_days, 10) || 4,
    parseInt(travel_hours, 10) || 4,
    season || "Oct-May",
    parseInt(price, 10),
    parseInt(child_price, 10) || Math.round(price * 0.5),
    parseFloat(rating) || 4.8,
    highlights || "",
    image_url || "assets/destinations/munnar.jpg",
    description || "",
    pickup_locations || "",
    drop_locations || "",
    accommodation || "",
    typeof itinerary === "string" ? itinerary : JSON.stringify(itinerary || []),
    trending ? 1 : 0,
    featured ? 1 : 0
  );

  const created = db.prepare("SELECT * FROM packages WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ success: true, package: created });
});

// PUT /api/admin/packages/:id
router.put("/packages/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const p = req.body;

  db.prepare(`
    UPDATE packages
    SET name = COALESCE(@name, name),
        category = COALESCE(@category, category),
        region = COALESCE(@region, region),
        destination_name = COALESCE(@destination_name, destination_name),
        duration_label = COALESCE(@duration_label, duration_label),
        duration_days = COALESCE(@duration_days, duration_days),
        travel_hours = COALESCE(@travel_hours, travel_hours),
        season = COALESCE(@season, season),
        price = COALESCE(@price, price),
        child_price = COALESCE(@child_price, child_price),
        rating = COALESCE(@rating, rating),
        highlights = COALESCE(@highlights, highlights),
        image_url = COALESCE(@image_url, image_url),
        description = COALESCE(@description, description),
        pickup_locations = COALESCE(@pickup_locations, pickup_locations),
        drop_locations = COALESCE(@drop_locations, drop_locations),
        accommodation = COALESCE(@accommodation, accommodation),
        trending = COALESCE(@trending, trending),
        featured = COALESCE(@featured, featured)
    WHERE id = @id
  `).run({ ...p, id });

  const updated = db.prepare("SELECT * FROM packages WHERE id = ?").get(id);
  res.json({ success: true, package: updated });
});

// DELETE /api/admin/packages/:id
router.delete("/packages/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM packages WHERE id = ?").run(id);
  res.json({ success: true, message: "Package removed" });
});

// ---------- DESTINATION MANAGEMENT ----------
// POST /api/admin/destinations
router.post("/destinations", requireAdmin, (req, res) => {
  const { name, region, tagline, category, image_url, description } = req.body;
  if (!name) return res.status(400).json({ error: "Destination name is required" });

  const stmt = db.prepare(`
    INSERT INTO destinations (name, region, tagline, category, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    name.trim(),
    region || "South India",
    tagline || "",
    category || "Hill Stations",
    image_url || "assets/destinations/munnar.jpg",
    description || ""
  );

  const created = db.prepare("SELECT * FROM destinations WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ success: true, destination: created });
});

// PUT /api/admin/destinations/:id
router.put("/destinations/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const d = req.body;

  db.prepare(`
    UPDATE destinations
    SET name = COALESCE(@name, name),
        region = COALESCE(@region, region),
        tagline = COALESCE(@tagline, tagline),
        category = COALESCE(@category, category),
        image_url = COALESCE(@image_url, image_url),
        description = COALESCE(@description, description)
    WHERE id = @id
  `).run({ ...d, id });

  const updated = db.prepare("SELECT * FROM destinations WHERE id = ?").get(id);
  res.json({ success: true, destination: updated });
});

// DELETE /api/admin/destinations/:id
router.delete("/destinations/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM destinations WHERE id = ?").run(id);
  res.json({ success: true, message: "Destination removed" });
});

// ---------- SUGGESTIONS / FEEDBACK MANAGEMENT ----------
// GET /api/admin/suggestions
router.get("/suggestions", requireAdmin, (req, res) => {
  const list = db.prepare("SELECT * FROM suggestions ORDER BY created_at DESC").all();
  res.json(list);
});

// PUT /api/admin/suggestions/:id/status
router.put("/suggestions/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare("UPDATE suggestions SET status = ? WHERE id = ?").run(status || "read", id);
  res.json({ success: true });
});

// DELETE /api/admin/suggestions/:id
router.delete("/suggestions/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM suggestions WHERE id = ?").run(id);
  res.json({ success: true });
});

// ---------- MONGODB MANAGEMENT & SYNC ----------
// GET /api/admin/mongo-status
router.get("/mongo-status", requireAdmin, async (req, res) => {
  const connected = isMongoConnected();
  let counts = {};
  if (connected && models) {
    try {
      counts = {
        packages: await models.Package.countDocuments(),
        destinations: await models.Destination.countDocuments(),
        users: await models.User.countDocuments(),
        adminUsers: await models.AdminUser.countDocuments(),
        bookings: await models.Booking.countDocuments(),
        payments: await models.Payment.countDocuments(),
        guides: await models.Guide.countDocuments(),
        messages: await models.Message.countDocuments(),
        suggestions: await models.Suggestion.countDocuments()
      };
    } catch (e) {
      counts = { error: e.message };
    }
  }
  res.json({
    connected,
    uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@") : null,
    counts
  });
});

// POST /api/admin/mongo-sync
router.post("/mongo-sync", requireAdmin, async (req, res) => {
  if (!isMongoConnected()) {
    return res.status(503).json({
      success: false,
      error: "MongoDB is not currently connected. Please ensure MongoDB is running and MONGODB_URI is configured in .env."
    });
  }
  try {
    const result = await syncSqliteToMongo();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

module.exports.requireAdmin = requireAdmin;
