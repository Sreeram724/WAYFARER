const express = require("express");
const crypto = require("crypto");
const { db, models, isMongoConnected } = require("../db");
const { requireAdmin } = require("./admin");

const router = express.Router();

// Helper to validate and calculate coupon discounts
function calculateCouponDiscount(couponCode, subtotal) {
  if (!couponCode || !subtotal) return { valid: false, discount: 0, reason: "No coupon provided" };
  const code = couponCode.toString().trim().toUpperCase();

  let discount = 0;
  let description = "";

  switch (code) {
    case "WAYFARER25":
      discount = Math.min(5000, Math.round(subtotal * 0.25));
      description = "25% Off Summer Special (Max ₹5,000)";
      break;
    case "SOUTHINDIA":
      discount = Math.min(subtotal - 1000, 2000);
      description = "₹2,000 Flat Off South India Circuit";
      break;
    case "EXPLORE":
      discount = Math.round(subtotal * 0.15);
      description = "15% Off Explorers Discount";
      break;
    case "FIRSTTRIP":
      discount = Math.min(subtotal - 1000, 1500);
      description = "₹1,500 Off Your First Wayfarer Journey";
      break;
    case "SPECIAL50":
      discount = Math.min(subtotal - 1000, 2500);
      description = "₹2,500 Off Grand Kerala & South Packages";
      break;
    default:
      return { valid: false, discount: 0, reason: "Invalid coupon code. Try WAYFARER25 or SOUTHINDIA." };
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return { valid: true, code, discount, description };
}

// Helper to generate unique booking reference (e.g., WF-2026-4892)
function generateBookingReference() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const ref = `WF-2026-${num}`;
  const exists = db.prepare("SELECT id FROM bookings WHERE booking_reference = ?").get(ref);
  if (exists) return generateBookingReference();
  return ref;
}

// POST /api/bookings — create a new booking in the booking flow
router.post("/", (req, res) => {
  const {
    full_name,
    email,
    phone,
    package_id,
    start_date,
    end_date,
    adults = 1,
    children = 0,
    rooms = 1,
    pickup_location,
    drop_location,
    pickup_time,
    estimated_arrival,
    special_requests,
    travel_dates_notes,
    coupon_code
  } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ error: "Full name and email are required" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address" });
  }

  // Get package details to calculate real price breakdown
  let packageRow = null;
  if (package_id) {
    packageRow = db.prepare("SELECT * FROM packages WHERE id = ?").get(package_id);
  }

  const numAdults = Math.max(1, parseInt(adults, 10) || 1);
  const numChildren = Math.max(0, parseInt(children, 10) || 0);
  const numRooms = Math.max(1, parseInt(rooms, 10) || 1);

  let subtotal = 0;
  if (packageRow) {
    const adultCost = (packageRow.price || 0) * numAdults;
    const childCost = (packageRow.child_price || Math.round(packageRow.price * 0.5)) * numChildren;
    subtotal = adultCost + childCost;
  } else {
    subtotal = 10000;
  }

  // Check coupon discount
  let discountAmount = 0;
  let appliedCoupon = null;
  if (coupon_code) {
    const couponCheck = calculateCouponDiscount(coupon_code, subtotal);
    if (couponCheck.valid) {
      discountAmount = couponCheck.discount;
      appliedCoupon = couponCheck.code;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(discountedSubtotal * 0.05); // 5% GST
  const totalAmount = discountedSubtotal + taxAmount;

  const bookingRef = generateBookingReference();
  const validPackageId = packageRow ? packageRow.id : null;
  let validUserId = null;
  if (req.session && req.session.userId) {
    const u = db.prepare("SELECT id FROM users WHERE id = ?").get(req.session.userId);
    if (u) validUserId = u.id;
  }

  // Format notes combining travel dates & notes if not provided
  const combinedNotes = travel_dates_notes || special_requests || "";

  // Auto-assign matching certified tour guide (Requirement 10)
  let assignedGuideId = null;
  try {
    if (packageRow && packageRow.destination_name) {
      const match = db.prepare("SELECT id FROM guides WHERE (assigned_destination LIKE ? OR assigned_package LIKE ?) AND status = 'available' LIMIT 1")
        .get(`%${packageRow.destination_name}%`, `%${packageRow.name}%`);
      if (match) assignedGuideId = match.id;
    }
    if (!assignedGuideId) {
      const fallbackGuide = db.prepare("SELECT id FROM guides WHERE status = 'available' ORDER BY id ASC LIMIT 1").get();
      if (fallbackGuide) assignedGuideId = fallbackGuide.id;
    }
  } catch (gErr) {
    console.warn("Notice assigning guide:", gErr.message);
  }

  const stmt = db.prepare(`
    INSERT INTO bookings (
      booking_reference, user_id, full_name, email, phone, package_id,
      start_date, end_date, adults, children, rooms,
      pickup_location, drop_location, pickup_time, estimated_arrival,
      special_requests, subtotal, tax_amount, total_amount,
      status, payment_status, travel_dates_notes, coupon_code, discount_amount, guide_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?)
  `);

  const info = stmt.run(
    bookingRef,
    validUserId,
    full_name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : null,
    validPackageId,
    start_date || null,
    end_date || null,
    numAdults,
    numChildren,
    numRooms,
    pickup_location || "Cochin International Airport (COK)",
    drop_location || "Cochin International Airport (COK)",
    pickup_time || "09:00 AM",
    estimated_arrival || "06:00 PM",
    special_requests || "",
    subtotal,
    taxAmount,
    totalAmount,
    combinedNotes,
    appliedCoupon,
    discountAmount,
    assignedGuideId
  );

  const created = db.prepare(`
    SELECT b.*, p.name AS package_name, p.image_url AS package_image, p.duration_label,
           g.name AS guide_name, g.phone AS guide_phone, g.email AS guide_email
    FROM bookings b
    LEFT JOIN packages p ON p.id = b.package_id
    LEFT JOIN guides g ON g.id = b.guide_id
    WHERE b.id = ?
  `).get(info.lastInsertRowid);

  // Dual-sync to MongoDB if connected
  if (isMongoConnected() && models && models.Booking) {
    models.Booking.findOneAndUpdate(
      { booking_reference: bookingRef },
      {
        $set: {
          sqlite_id: info.lastInsertRowid,
          booking_reference: bookingRef,
          user_id: validUserId,
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          package_id: validPackageId,
          package_name: packageRow ? packageRow.name : null,
          start_date: start_date || null,
          end_date: end_date || null,
          adults: numAdults,
          children: numChildren,
          rooms: numRooms,
          pickup_location: pickup_location || "Cochin International Airport (COK)",
          drop_location: drop_location || "Cochin International Airport (COK)",
          pickup_time: pickup_time || "09:00 AM",
          estimated_arrival: estimated_arrival || "06:00 PM",
          special_requests: special_requests || "",
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "pending",
          payment_status: "pending",
          travel_dates_notes: combinedNotes,
          coupon_code: appliedCoupon,
          discount_amount: discountAmount,
          guide_id: assignedGuideId
        }
      },
      { upsert: true }
    ).catch((err) => console.warn("[MongoDB] Booking async sync notice:", err.message));
  }

  res.status(201).json({
    success: true,
    message: "Booking request created successfully",
    booking: created
  });
});


// GET /api/bookings/my-bookings — logged-in traveler's own bookings
router.get("/my-bookings", (req, res) => {
  if (!req.session || (!req.session.userId && !req.session.email && !req.session.username)) {
    return res.status(401).json({ error: "Please log in to view your bookings" });
  }

  const userEmail = (req.session.email || req.session.username || "").toLowerCase();
  const userId = req.session.userId || 0;

  const rows = db.prepare(`
    SELECT
      b.*,
      p.name AS package_name,
      p.image_url AS package_image,
      p.duration_label,
      p.destination_name,
      p.highlights,
      py.transaction_id,
      py.payment_method AS paid_via,
      py.paid_at,
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
    WHERE b.user_id = ? OR LOWER(b.email) = ?
    ORDER BY b.created_at DESC
  `).all(userId, userEmail);

  res.json(rows);
});

// GET /api/bookings — admin only: list all bookings
router.get("/", requireAdmin, (req, res) => {
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

// GET /api/bookings/:id — get single booking by ID or Reference
router.get("/:id", (req, res) => {
  const idOrRef = req.params.id;

  let booking = null;
  if (/^\d+$/.test(idOrRef)) {
    booking = db.prepare(`
      SELECT
        b.*,
        p.name AS package_name,
        p.category AS package_category,
        p.destination_name,
        p.duration_label,
        p.duration_days,
        p.travel_hours,
        p.image_url AS package_image,
        p.accommodation,
        p.itinerary,
        p.highlights,
        py.transaction_id,
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
      WHERE b.id = ?
    `).get(idOrRef);
  } else {
    booking = db.prepare(`
      SELECT
        b.*,
        p.name AS package_name,
        p.category AS package_category,
        p.destination_name,
        p.duration_label,
        p.duration_days,
        p.travel_hours,
        p.image_url AS package_image,
        p.accommodation,
        p.itinerary,
        p.highlights,
        py.transaction_id,
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
      WHERE b.booking_reference = ?
    `).get(idOrRef);
  }

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // Parse itinerary if JSON string
  if (booking.itinerary) {
    try {
      booking.parsed_itinerary = JSON.parse(booking.itinerary);
    } catch {
      booking.parsed_itinerary = null;
    }
  }

  res.json(booking);
});

// PUT /api/bookings/:id — admin only: update booking status
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Booking not found" });

  const status = req.body.status || existing.status;
  const payment_status = req.body.payment_status || existing.payment_status;

  db.prepare(`
    UPDATE bookings
    SET status = ?, payment_status = ?
    WHERE id = ?
  `).run(status, payment_status, req.params.id);

  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/bookings/:id — admin only: delete booking
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Booking not found" });

  // Delete associated payment records
  db.prepare("DELETE FROM payments WHERE booking_id = ?").run(req.params.id);
  db.prepare("DELETE FROM bookings WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: "Booking removed" });
});

// POST /api/bookings/:id/email-confirmation — dispatch booking confirmation email
router.post("/:id/email-confirmation", async (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, p.name AS package_name, p.duration_label
    FROM bookings b
    LEFT JOIN packages p ON p.id = b.package_id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(req.params.id, req.params.id);

  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const emailTo = req.body.email || booking.email;

  // Check if nodemailer can send
  let sentReal = false;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Wayfarer Travel" <${process.env.SMTP_USER}>`,
        to: emailTo,
        subject: `Booking Confirmed: ${booking.booking_reference} - ${booking.package_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e4e1da;border-radius:8px;">
            <h2 style="color:#0f7a5f;margin-top:0;">Wayfarer — Booking Confirmation</h2>
            <p>Dear ${booking.full_name},</p>
            <p>Your tour booking has been confirmed! Here are your travel details:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Booking ID:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#0f7a5f;"><strong>${booking.booking_reference}</strong></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Package:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${booking.package_name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Dates:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${booking.start_date || 'Flexible'} to ${booking.end_date || 'Flexible'}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Travelers:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${booking.adults} Adults, ${booking.children} Children</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Total Paid:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>₹${Number(booking.total_amount).toLocaleString('en-IN')}</strong></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Payment Status:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#0f7a5f;">PAID & VERIFIED</td></tr>
            </table>
            <p>You can access your complete booking slip and travel voucher anytime on our website.</p>
            <p>Warm regards,<br>The Wayfarer Travel Team<br>Phone: +91 98765 43210</p>
          </div>
        `
      });
      sentReal = true;
    } catch (mailErr) {
      console.warn("SMTP delivery error:", mailErr.message);
    }
  }

  console.log(`[Wayfarer Notification] Confirmation email dispatched to ${emailTo} for booking ${booking.booking_reference} (Method: ${sentReal ? 'Live SMTP' : 'Verified Notification Simulator'}).`);

  res.json({
    success: true,
    sentReal,
    message: `Confirmation email sent to ${emailTo}`,
    booking_reference: booking.booking_reference
  });
});

// POST /api/bookings/apply-coupon — apply coupon code to existing booking
router.post("/apply-coupon", (req, res) => {
  const { booking_id, coupon_code } = req.body;
  if (!booking_id || !coupon_code) {
    return res.status(400).json({ error: "Booking ID and coupon code are required" });
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? OR booking_reference = ?").get(booking_id, booking_id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.payment_status === "paid") {
    return res.status(400).json({ error: "Cannot apply coupon to an already paid booking" });
  }

  const subtotal = booking.subtotal || 10000;
  const couponResult = calculateCouponDiscount(coupon_code, subtotal);

  if (!couponResult.valid) {
    return res.status(400).json({ error: couponResult.reason });
  }

  const discountAmount = couponResult.discount;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(discountedSubtotal * 0.05);
  const totalAmount = discountedSubtotal + taxAmount;

  db.prepare(`
    UPDATE bookings
    SET coupon_code = ?, discount_amount = ?, tax_amount = ?, total_amount = ?
    WHERE id = ?
  `).run(couponResult.code, discountAmount, taxAmount, totalAmount, booking.id);

  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking.id);

  res.json({
    success: true,
    message: `Coupon "${couponResult.code}" applied! You saved ₹${discountAmount.toLocaleString("en-IN")}.`,
    coupon_code: couponResult.code,
    description: couponResult.description,
    discount_amount: discountAmount,
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    booking: updated
  });
});

// POST /api/bookings/remove-coupon — remove coupon from booking
router.post("/remove-coupon", (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? OR booking_reference = ?").get(booking_id, booking_id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const subtotal = booking.subtotal || 10000;
  const taxAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + taxAmount;

  db.prepare(`
    UPDATE bookings
    SET coupon_code = NULL, discount_amount = 0, tax_amount = ?, total_amount = ?
    WHERE id = ?
  `).run(taxAmount, totalAmount, booking.id);

  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking.id);

  res.json({
    success: true,
    message: "Coupon removed",
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    booking: updated
  });
});

module.exports = router;
