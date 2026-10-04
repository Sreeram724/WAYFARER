const mongoose = require("mongoose");
const dns = require("dns");

// Configure public DNS resolvers to prevent Windows SRV query failures with mongodb+srv://
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // fallback silently
}


// Configuration: URI from .env or default local connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/wayfarer";

let isConnected = false;

// -------------------------------------------------------------
// 1. MONGOOSE SCHEMAS & MODELS
// -------------------------------------------------------------

// Package Schema
const packageSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, index: true },
    region: { type: String, default: "South India", index: true },
    destination_name: { type: String, index: true },
    duration_label: { type: String, required: true },
    duration_days: { type: Number, required: true },
    travel_hours: { type: Number, default: 4 },
    season: { type: String, required: true },
    price: { type: Number, required: true },
    child_price: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    highlights: [{ type: String }],
    image_url: { type: String },
    description: { type: String },
    pickup_locations: [{ type: String }],
    drop_locations: [{ type: String }],
    accommodation: { type: String },
    itinerary: [
      {
        day: Number,
        title: String,
        desc: String,
        meals: String,
        stay: String
      }
    ],
    trending: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Destination Schema
const destinationSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    region: { type: String, default: "South India", index: true },
    tagline: { type: String },
    category: { type: String, index: true },
    image_url: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);

// User Schema
const userSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    username: { type: String, sparse: true, trim: true },
    full_name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String },
    phone: { type: String },
    google_id: { type: String, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true }
  },
  { timestamps: true }
);

// Admin User Schema
const adminUserSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, default: "admin" }
  },
  { timestamps: true }
);

// Booking Schema
const bookingSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    booking_reference: { type: String, required: true, unique: true, uppercase: true, trim: true },
    user_id: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    package_id: { type: Number },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    package_name: { type: String },
    start_date: { type: String },
    end_date: { type: String },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    rooms: { type: Number, default: 1 },
    pickup_location: { type: String },
    drop_location: { type: String },
    pickup_time: { type: String },
    estimated_arrival: { type: String },
    special_requests: { type: String },
    subtotal: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    coupon_code: { type: String },
    tax_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
      index: true
    },
    payment_method: { type: String },
    transaction_id: { type: String },
    travel_dates_notes: { type: String },
    guide_id: { type: Number },
    guide: { type: mongoose.Schema.Types.ObjectId, ref: "Guide" }
  },
  { timestamps: true }
);

// Payment Schema
const paymentSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    booking_id: { type: Number },
    booking_reference: { type: String, index: true },
    transaction_id: { type: String, required: true, unique: true },
    payment_method: { type: String, required: true },
    gateway: { type: String, default: "Razorpay" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "success" },
    gateway_order_id: { type: String },
    gateway_payment_id: { type: String },
    gateway_signature: { type: String },
    paid_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Guide Schema
const guideSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: { type: String },
    experience: { type: String },
    languages: { type: String },
    assigned_destination: { type: String },
    assigned_package: { type: String },
    status: { type: String, enum: ["available", "assigned", "on_leave"], default: "available" },
    photo_url: { type: String },
    rating: { type: Number, default: 4.9 }
  },
  { timestamps: true }
);

// Message / Contact Schema
const messageSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

// Suggestions / Feedback Schema
const suggestionSchema = new mongoose.Schema(
  {
    sqlite_id: { type: Number, index: true },
    user_id: { type: Number },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, default: "suggestion" },
    message: { type: String, required: true },
    status: { type: String, enum: ["unread", "read", "archived"], default: "unread" }
  },
  { timestamps: true }
);

// OTP Schema
const otpCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    expires_at: { type: Number, required: true },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Compile Mongoose models (prevent re-compilation if already defined)
const Package = mongoose.models.Package || mongoose.model("Package", packageSchema);
const Destination = mongoose.models.Destination || mongoose.model("Destination", destinationSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);
const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
const Guide = mongoose.models.Guide || mongoose.model("Guide", guideSchema);
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const Suggestion = mongoose.models.Suggestion || mongoose.model("Suggestion", suggestionSchema);
const OtpCode = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);

const models = {
  Package,
  Destination,
  User,
  AdminUser,
  Booking,
  Payment,
  Guide,
  Message,
  Suggestion,
  OtpCode
};

// -------------------------------------------------------------
// 2. DATA SYNCHRONIZATION (SQLite -> MongoDB)
// -------------------------------------------------------------

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

async function syncSqliteToMongo(sqliteDb) {
  if (!isConnected) {
    return { success: false, reason: "MongoDB is not connected" };
  }

  const results = {};

  try {
    // 1. Sync Packages
    const packages = sqliteDb.prepare("SELECT * FROM packages").all();
    let pkgCount = 0;
    for (const p of packages) {
      const doc = {
        sqlite_id: p.id,
        name: p.name,
        category: p.category,
        region: p.region || "South India",
        destination_name: p.destination_name,
        duration_label: p.duration_label,
        duration_days: p.duration_days,
        travel_hours: p.travel_hours || 4,
        season: p.season,
        price: p.price,
        child_price: p.child_price || 0,
        rating: p.rating || 4.8,
        highlights: safeJsonParse(p.highlights, []),
        image_url: p.image_url,
        description: p.description,
        pickup_locations: safeJsonParse(p.pickup_locations, []),
        drop_locations: safeJsonParse(p.drop_locations, []),
        accommodation: p.accommodation,
        itinerary: safeJsonParse(p.itinerary, []),
        trending: Boolean(p.trending),
        featured: Boolean(p.featured)
      };
      await Package.findOneAndUpdate({ name: p.name }, { $set: doc }, { upsert: true });
      pkgCount++;
    }
    results.packages = pkgCount;

    // 2. Sync Destinations
    const destinations = sqliteDb.prepare("SELECT * FROM destinations").all();
    let destCount = 0;
    for (const d of destinations) {
      const doc = {
        sqlite_id: d.id,
        name: d.name,
        region: d.region || "South India",
        tagline: d.tagline,
        category: d.category,
        image_url: d.image_url,
        description: d.description
      };
      await Destination.findOneAndUpdate({ name: d.name }, { $set: doc }, { upsert: true });
      destCount++;
    }
    results.destinations = destCount;

    // 3. Sync Admin Users
    const admins = sqliteDb.prepare("SELECT * FROM admin_users").all();
    let adminCount = 0;
    for (const a of admins) {
      const doc = {
        sqlite_id: a.id,
        username: a.username,
        password_hash: a.password_hash,
        email: a.email,
        role: a.role || "admin"
      };
      await AdminUser.findOneAndUpdate({ username: a.username }, { $set: doc }, { upsert: true });
      adminCount++;
    }
    results.adminUsers = adminCount;

    // 4. Sync Users
    const users = sqliteDb.prepare("SELECT * FROM users").all();
    let userCount = 0;
    for (const u of users) {
      const doc = {
        sqlite_id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        password_hash: u.password_hash,
        phone: u.phone,
        google_id: u.google_id,
        role: u.role || "user"
      };
      await User.findOneAndUpdate({ email: u.email }, { $set: doc }, { upsert: true });
      userCount++;
    }
    results.users = userCount;

    // 5. Sync Guides
    const guides = sqliteDb.prepare("SELECT * FROM guides").all();
    let guideCount = 0;
    for (const g of guides) {
      const doc = {
        sqlite_id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        address: g.address,
        experience: g.experience,
        languages: g.languages,
        assigned_destination: g.assigned_destination,
        assigned_package: g.assigned_package,
        status: g.status || "available",
        photo_url: g.photo_url,
        rating: g.rating || 4.9
      };
      await Guide.findOneAndUpdate({ phone: g.phone }, { $set: doc }, { upsert: true });
      guideCount++;
    }
    results.guides = guideCount;

    // 6. Sync Bookings
    const bookings = sqliteDb.prepare("SELECT * FROM bookings").all();
    let bookingCount = 0;
    for (const b of bookings) {
      const doc = {
        sqlite_id: b.id,
        booking_reference: b.booking_reference,
        user_id: b.user_id,
        full_name: b.full_name,
        email: b.email,
        phone: b.phone,
        package_id: b.package_id,
        start_date: b.start_date,
        end_date: b.end_date,
        adults: b.adults || 1,
        children: b.children || 0,
        rooms: b.rooms || 1,
        pickup_location: b.pickup_location,
        drop_location: b.drop_location,
        pickup_time: b.pickup_time,
        estimated_arrival: b.estimated_arrival,
        special_requests: b.special_requests,
        subtotal: b.subtotal || 0,
        discount_amount: b.discount_amount || 0,
        coupon_code: b.coupon_code,
        tax_amount: b.tax_amount || 0,
        total_amount: b.total_amount || 0,
        status: b.status || "pending",
        payment_status: b.payment_status || "pending",
        payment_method: b.payment_method,
        transaction_id: b.transaction_id,
        travel_dates_notes: b.travel_dates_notes,
        guide_id: b.guide_id
      };
      await Booking.findOneAndUpdate(
        { booking_reference: b.booking_reference },
        { $set: doc },
        { upsert: true }
      );
      bookingCount++;
    }
    results.bookings = bookingCount;

    // 7. Sync Payments
    const payments = sqliteDb.prepare("SELECT * FROM payments").all();
    let paymentCount = 0;
    for (const pay of payments) {
      const doc = {
        sqlite_id: pay.id,
        booking_id: pay.booking_id,
        booking_reference: pay.booking_reference,
        transaction_id: pay.transaction_id,
        payment_method: pay.payment_method,
        gateway: pay.gateway || "Razorpay",
        amount: pay.amount,
        currency: pay.currency || "INR",
        status: pay.status || "success",
        gateway_order_id: pay.gateway_order_id,
        gateway_payment_id: pay.gateway_payment_id,
        gateway_signature: pay.gateway_signature,
        paid_at: pay.paid_at ? new Date(pay.paid_at) : new Date()
      };
      await Payment.findOneAndUpdate(
        { transaction_id: pay.transaction_id },
        { $set: doc },
        { upsert: true }
      );
      paymentCount++;
    }
    results.payments = paymentCount;

    console.log("[MongoDB] Synchronization complete:", results);
    return { success: true, results };
  } catch (err) {
    console.error("[MongoDB] Sync error:", err.message);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// 3. CONNECTION INITIALIZATION
// -------------------------------------------------------------

async function connectMongo(sqliteDbInstance = null) {
  let uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/wayfarer";

  mongoose.set("strictQuery", false);

  async function attemptConnect(targetUri, label = "") {
    console.log(`[MongoDB] Connecting ${label}to ${targetUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")} ...`);
    await mongoose.connect(targetUri, {
      dbName: "wayfarer",
      serverSelectionTimeoutMS: 8000
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to MongoDB database "${mongoose.connection.name}"!`);
  }

  try {
    await attemptConnect(uri);
  } catch (err) {
    // If Windows / local ISP blocks SRV DNS lookups, automatically fallback to direct cluster replicaSet connection
    if (err.message && (err.message.includes("querySrv") || err.message.includes("ECONNREFUSED"))) {
      console.warn(`[MongoDB] Notice: SRV lookup blocked by local network. Attempting direct replicaSet connection...`);
      if (uri.includes("cluster0.a5uhk1n.mongodb.net")) {
        const directUri = uri.replace(
          /mongodb\+srv:\/\/([^@]+)@cluster0\.a5uhk1n\.mongodb\.net\/?(.*)/,
          "mongodb://$1@ac-sw0z2bo-shard-00-00.a5uhk1n.mongodb.net:27017,ac-sw0z2bo-shard-00-01.a5uhk1n.mongodb.net:27017,ac-sw0z2bo-shard-00-02.a5uhk1n.mongodb.net:27017/wayfarer?ssl=true&replicaSet=atlas-4fdryh-shard-0&authSource=admin&retryWrites=true&w=majority"
        );
        try {
          await attemptConnect(directUri, "(via direct replicaSet fallback) ");
        } catch (directErr) {
          isConnected = false;
          console.warn(`[MongoDB] Direct connection fallback notice: ${directErr.message}`);
          return false;
        }
      } else {
        isConnected = false;
        return false;
      }
    } else {
      isConnected = false;
      console.warn(
        `[MongoDB] Notice: Could not connect to MongoDB (${err.message}).\n` +
        `          SQLite database remains fully active and operational.\n` +
        `          To enable MongoDB, start MongoDB locally or configure MONGODB_URI in .env`
      );
      return false;
    }
  }

  // Auto-seed if MongoDB package collection is empty and sqlite instance is provided
  if (isConnected && sqliteDbInstance) {
    try {
      const count = await Package.countDocuments();
      if (count === 0) {
        console.log("[MongoDB] Initializing MongoDB collections with Wayfarer seed data...");
        await syncSqliteToMongo(sqliteDbInstance);
      }
    } catch (seedErr) {
      console.warn("[MongoDB] Auto-seed warning:", seedErr.message);
    }
  }

  return isConnected;
}


function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  mongoose,
  mongoDb: mongoose.connection,
  models,
  Package,
  Destination,
  User,
  AdminUser,
  Booking,
  Payment,
  Guide,
  Message,
  Suggestion,
  OtpCode,
  connectMongo,
  syncSqliteToMongo,
  isMongoConnected
};
