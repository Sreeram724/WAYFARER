const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
const Database = require("better-sqlite3");

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "wayfarer.db"));
db.pragma("journal_mode = WAL");

// Standard legacy sha256 hash
function hash(pw) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

// Salted PBKDF2 password hashing for extra security
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString("hex");
  const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hashed}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // If legacy sha256 hash without salt separator
  if (!storedHash.includes(":")) {
    return hash(password) === storedHash;
  }
  const [salt, hashed] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hashed === testHash;
}

// Helper to safely add column if missing
function ensureColumn(table, column, definition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = columns.some((c) => c.name === column);
    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (err) {
    console.error(`Error ensuring column ${column} in ${table}:`, err.message);
  }
}

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  region TEXT DEFAULT 'South India',
  destination_name TEXT,
  duration_label TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  travel_hours INTEGER DEFAULT 4,
  season TEXT NOT NULL,
  price INTEGER NOT NULL,
  child_price INTEGER DEFAULT 0,
  rating REAL DEFAULT 4.8,
  highlights TEXT,
  image_url TEXT,
  description TEXT,
  pickup_locations TEXT,
  drop_locations TEXT,
  accommodation TEXT,
  itinerary TEXT,
  trending INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  region TEXT DEFAULT 'South India',
  tagline TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  phone TEXT,
  google_id TEXT,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT UNIQUE,
  user_id INTEGER,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  package_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  pickup_location TEXT,
  drop_location TEXT,
  pickup_time TEXT,
  estimated_arrival TEXT,
  special_requests TEXT,
  subtotal INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  travel_dates_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  booking_reference TEXT,
  transaction_id TEXT UNIQUE NOT NULL,
  payment_method TEXT NOT NULL,
  gateway TEXT DEFAULT 'Razorpay',
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'success',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  experience TEXT,
  languages TEXT,
  assigned_destination TEXT,
  assigned_package TEXT,
  status TEXT DEFAULT 'available',
  photo_url TEXT,
  rating REAL DEFAULT 4.9,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT DEFAULT 'suggestion',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Run migrations for any existing databases that lacked these columns
ensureColumn("packages", "region", "TEXT DEFAULT 'South India'");
ensureColumn("packages", "destination_name", "TEXT");
ensureColumn("packages", "travel_hours", "INTEGER DEFAULT 4");
ensureColumn("packages", "child_price", "INTEGER DEFAULT 0");
ensureColumn("packages", "pickup_locations", "TEXT");
ensureColumn("packages", "drop_locations", "TEXT");
ensureColumn("packages", "accommodation", "TEXT");
ensureColumn("packages", "itinerary", "TEXT");

ensureColumn("destinations", "region", "TEXT DEFAULT 'South India'");

ensureColumn("users", "full_name", "TEXT");
ensureColumn("users", "email", "TEXT");
ensureColumn("users", "phone", "TEXT");
ensureColumn("users", "google_id", "TEXT");
ensureColumn("users", "role", "TEXT DEFAULT 'user'");
ensureColumn("users", "created_at", "TEXT");

ensureColumn("admin_users", "email", "TEXT");
ensureColumn("admin_users", "role", "TEXT DEFAULT 'admin'");
ensureColumn("admin_users", "created_at", "TEXT");

ensureColumn("bookings", "booking_reference", "TEXT");
ensureColumn("bookings", "user_id", "INTEGER");
ensureColumn("bookings", "guide_id", "INTEGER");
ensureColumn("bookings", "phone", "TEXT");
ensureColumn("bookings", "start_date", "TEXT");
ensureColumn("bookings", "end_date", "TEXT");
ensureColumn("bookings", "adults", "INTEGER DEFAULT 1");
ensureColumn("bookings", "children", "INTEGER DEFAULT 0");
ensureColumn("bookings", "rooms", "INTEGER DEFAULT 1");
ensureColumn("bookings", "pickup_location", "TEXT");
ensureColumn("bookings", "drop_location", "TEXT");
ensureColumn("bookings", "pickup_time", "TEXT");
ensureColumn("bookings", "estimated_arrival", "TEXT");
ensureColumn("bookings", "special_requests", "TEXT");
ensureColumn("bookings", "subtotal", "INTEGER DEFAULT 0");
ensureColumn("bookings", "tax_amount", "INTEGER DEFAULT 0");
ensureColumn("bookings", "total_amount", "INTEGER DEFAULT 0");
ensureColumn("bookings", "payment_status", "TEXT DEFAULT 'pending'");
ensureColumn("bookings", "payment_method", "TEXT");
ensureColumn("bookings", "transaction_id", "TEXT");
ensureColumn("bookings", "coupon_code", "TEXT");
ensureColumn("bookings", "discount_amount", "INTEGER DEFAULT 0");

// Backfill any missing booking references
const unreferenced = db.prepare("SELECT id FROM bookings WHERE booking_reference IS NULL OR booking_reference = ''").all();
for (const b of unreferenced) {
  const ref = `WF-2026-${String(b.id).padStart(4, '0')}`;
  db.prepare("UPDATE bookings SET booking_reference = ? WHERE id = ?").run(ref, b.id);
}

try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_ref ON bookings(booking_reference);");
} catch (e) {}

// Seed / Update admin account in admin_users
const adminExists = db.prepare("SELECT * FROM admin_users WHERE username = ? OR email = ?").get("admin", "admin@wayfarer.travel");
if (!adminExists) {
  db.prepare("INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)").run(
    "admin",
    hashPassword("wayfarer123"),
    "admin@wayfarer.travel",
    "admin"
  );
} else {
  db.prepare("UPDATE admin_users SET email = 'admin@wayfarer.travel', password_hash = ?, role = 'admin' WHERE id = ?").run(
    hashPassword("wayfarer123"),
    adminExists.id
  );
}

// Seed / Update admin account in users table (guarantees login via traveler portal also gives ADMIN role)
const adminInUsers = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get("admin@wayfarer.travel", "admin@wayfarer.travel");
if (!adminInUsers) {
  db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    "admin@wayfarer.travel",
    "Wayfarer Administrator",
    "admin@wayfarer.travel",
    hashPassword("wayfarer123"),
    "+91 98765 00000",
    "admin"
  );
} else {
  db.prepare("UPDATE users SET email = 'admin@wayfarer.travel', password_hash = ?, role = 'admin' WHERE id = ?").run(
    hashPassword("wayfarer123"),
    adminInUsers.id
  );
}

// Seed default traveler user
const userExists = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get("traveler", "traveler@wayfarer.travel");
if (!userExists) {
  db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    "traveler",
    "Arun Kumar",
    "traveler@wayfarer.travel",
    hashPassword("wayfarer123"),
    "+91 98765 01234",
    "user"
  );
} else {
  db.prepare("UPDATE users SET email = 'traveler@wayfarer.travel', password_hash = ?, role = 'user' WHERE id = ?").run(
    hashPassword("wayfarer123"),
    userExists.id
  );
}

// Seed certified guides
const guidesCount = db.prepare("SELECT COUNT(*) AS c FROM guides").get().c;
if (guidesCount === 0) {
  const seedGuides = [
    {
      name: "Rajesh Nair",
      email: "rajesh.nair@wayfarer.travel",
      phone: "+91 94471 28930",
      address: "Munnar Valley Road, Idukki, Kerala",
      experience: "10+ Years",
      languages: "English, Malayalam, Hindi, Tamil",
      assigned_destination: "Munnar",
      assigned_package: "Munnar Cloud Country & Tea Estate Retreat",
      status: "available",
      photo_url: "assets/avatars/avatar2.jpg",
      rating: 4.9
    },
    {
      name: "Kavitha Menon",
      email: "kavitha.menon@wayfarer.travel",
      phone: "+91 94472 55102",
      address: "Finishing Point Road, Alleppey, Kerala",
      experience: "8+ Years",
      languages: "English, Malayalam, Hindi",
      assigned_destination: "Alleppey",
      assigned_package: "Alleppey Luxury Houseboat & Canal Life",
      status: "available",
      photo_url: "assets/avatars/avatar3.jpg",
      rating: 4.9
    },
    {
      name: "Suresh Gowda",
      email: "suresh.gowda@wayfarer.travel",
      phone: "+91 98452 31094",
      address: "Madikeri Town, Coorg, Karnataka",
      experience: "9+ Years",
      languages: "English, Kannada, Hindi, Kodava",
      assigned_destination: "Coorg",
      assigned_package: "Coorg Coffee Trails & Abbey Waterfalls",
      status: "available",
      photo_url: "assets/avatars/avatar4.jpg",
      rating: 4.8
    },
    {
      name: "Anandhan Raman",
      email: "anandhan.raman@wayfarer.travel",
      phone: "+91 97892 45120",
      address: "Commercial Road, Ooty, Tamil Nadu",
      experience: "12+ Years",
      languages: "English, Tamil, Hindi, Badaga",
      assigned_destination: "Ooty",
      assigned_package: "Ooty & Nilgiri Toy Train Heritage",
      status: "available",
      photo_url: "assets/avatars/avatar2.jpg",
      rating: 5.0
    },
    {
      name: "Vijay Kulkarni",
      email: "vijay.kulkarni@wayfarer.travel",
      phone: "+91 99014 87652",
      address: "Hampi Bazaar Road, Vijayanagara, Karnataka",
      experience: "11+ Years",
      languages: "English, Kannada, Hindi, Telugu",
      assigned_destination: "Hampi",
      assigned_package: "Hampi: Forgotten Vijayanagara Stone Empire",
      status: "available",
      photo_url: "assets/avatars/avatar4.jpg",
      rating: 4.9
    },
    {
      name: "Antonio Fernandes",
      email: "antonio.fernandes@wayfarer.travel",
      phone: "+91 98221 40938",
      address: "Fontainhas Latin Quarter, Panaji, Goa",
      experience: "9+ Years",
      languages: "English, Konkani, Hindi, Portuguese",
      assigned_destination: "Goa",
      assigned_package: "Goa Sun, Sand & Portuguese Charm",
      status: "available",
      photo_url: "assets/avatars/avatar2.jpg",
      rating: 4.8
    }
  ];

  const insertGuide = db.prepare(`
    INSERT INTO guides (name, email, phone, address, experience, languages, assigned_destination, assigned_package, status, photo_url, rating)
    VALUES (@name, @email, @phone, @address, @experience, @languages, @assigned_destination, @assigned_package, @status, @photo_url, @rating)
  `);
  for (const g of seedGuides) {
    insertGuide.run(g);
  }

  // Assign a guide to existing confirmed bookings if not yet assigned
  db.prepare("UPDATE bookings SET guide_id = 1 WHERE guide_id IS NULL AND (status = 'confirmed' OR payment_status = 'paid')").run();
}

// Seed all requested destinations with UNIQUE dedicated images
const allDestinations = [
  {
    name: "Munnar",
    region: "South India",
    tagline: "Misty tea hills of Kerala",
    category: "Hill Stations",
    image_url: "assets/destinations/munnar.jpg",
    description: "Rolling emerald tea plantations, cool climate, and the Western Ghats at their most majestic."
  },
  {
    name: "Alleppey",
    region: "South India",
    tagline: "Houseboat backwaters",
    category: "Backwaters",
    image_url: "assets/destinations/alleppey.jpg",
    description: "Glide past paddy fields, coconut palms, and serene lagoons aboard a traditional Kerala houseboat."
  },
  {
    name: "Wayanad",
    region: "South India",
    tagline: "Green valleys and ancient caves",
    category: "Hill Stations",
    image_url: "assets/destinations/wayanad.jpg",
    description: "Lush spice plantations, Edakkal prehistoric caves, bamboo forests, and breathtaking waterfalls."
  },
  {
    name: "Kochi",
    region: "South India",
    tagline: "Queen of the Arabian Sea",
    category: "Heritage",
    image_url: "assets/destinations/kochi.jpg",
    description: "Colonial Portuguese architecture, Chinese fishing nets at sunset, spice markets, and art cafes."
  },
  {
    name: "Ooty",
    region: "South India",
    tagline: "The queen of hill stations",
    category: "Hill Stations",
    image_url: "assets/destinations/ooty.jpg",
    description: "Colonial-era Nilgiri hill town famous for its historic UNESCO toy train, botanical gardens, and pine woods."
  },
  {
    name: "Kodaikanal",
    region: "South India",
    tagline: "Star-shaped lake, pine forests",
    category: "Hill Stations",
    image_url: "assets/destinations/kodaikanal.jpg",
    description: "A tranquil hill town wrapped in pine and eucalyptus forests, mist-covered cliffs, and romantic boating."
  },
  {
    name: "Coorg",
    region: "South India",
    tagline: "Coffee hills of Karnataka",
    category: "Hill Stations",
    image_url: "assets/destinations/coorg.jpg",
    description: "Aromatic coffee plantations, misty valleys, Abbey Falls, and the rich warrior culture of Kodagu."
  },
  {
    name: "Mysore",
    region: "South India",
    tagline: "Palaces lit gold at dusk",
    category: "Heritage",
    image_url: "assets/destinations/mysore.jpg",
    description: "Karnataka's royal capital, renowned for the illuminated Mysuru Palace, silk sarees, and sandalwood."
  },
  {
    name: "Hampi",
    region: "South India",
    tagline: "Ruins of a forgotten empire",
    category: "Heritage",
    image_url: "assets/destinations/hampi.jpg",
    description: "Boulder-strewn surreal landscapes scattered with the grand stone temples of the Vijayanagara empire."
  },
  {
    name: "Pondicherry",
    region: "South India",
    tagline: "French charm by the sea",
    category: "Heritage",
    image_url: "assets/destinations/pondicherry.jpg",
    description: "Pastel-coloured French villas, bougainvillea-lined seaside promenades, Auroville, and tranquil beaches."
  },
  {
    name: "Rameswaram",
    region: "South India",
    tagline: "Sacred island and azure seas",
    category: "Heritage",
    image_url: "assets/destinations/rameswaram.jpg",
    description: "The magnificent Ramanathaswamy Temple corridors, historic Pamban cantilever sea bridge, and Dhanushkodi."
  },
  {
    name: "Madurai",
    region: "South India",
    tagline: "City of the temple towers",
    category: "Heritage",
    image_url: "assets/destinations/madurai.jpg",
    description: "Ancient city home to the breathtaking sculpted gopurams of the iconic Meenakshi Amman Temple."
  },
  {
    name: "Kumarakom",
    region: "South India",
    tagline: "Tranquil lotus waters of Vembanad",
    category: "Backwaters",
    image_url: "assets/destinations/kumarakom.jpg",
    description: "Peaceful village on the edge of Vembanad Lake, famous for migratory bird sanctuary and luxury Ayurvedic resorts."
  },
  {
    name: "Thekkady",
    region: "South India",
    tagline: "Periyar wildlife and elephant sanctuary",
    category: "Hill Stations",
    image_url: "assets/destinations/thekkady.jpg",
    description: "Lush Periyar National Park where wild elephants roam the lake shores, cardamom hills, and bamboo rafting."
  },
  {
    name: "Varkala",
    region: "South India",
    tagline: "Cliffs above the Arabian Sea",
    category: "Beaches",
    image_url: "assets/destinations/varkala.jpg",
    description: "Dramatic red laterite cliffs overlooking golden sands, yoga shacks, and panoramic sunset views over the sea."
  },
  {
    name: "Gokarna",
    region: "South India",
    tagline: "Pristine beaches & coastal tranquility",
    category: "Beaches",
    image_url: "assets/destinations/gokarna.jpg",
    description: "Unspoiled coves including Om Beach, Kudle Beach, cliffside trails, and ancient coastal temples."
  },
  {
    name: "Goa",
    region: "South India",
    tagline: "Golden beaches, laid-back days",
    category: "Beaches",
    image_url: "assets/destinations/goa.jpg",
    description: "Sun, golden sand, water sports, and Portuguese-era architecture along India's most popular coastline."
  },
  {
    name: "Varanasi",
    region: "North India",
    tagline: "Spiritual ghats of the Ganges",
    category: "Heritage",
    image_url: "assets/destinations/varanasi.jpg",
    description: "One of the world's oldest living cities, famous for its twilight Ganga Aarti, historic ghats, and silk weaving."
  },
  {
    name: "Jaipur",
    region: "North India",
    tagline: "The Pink City of Rajasthan",
    category: "Heritage",
    image_url: "assets/destinations/jaipur.jpg",
    description: "Regal desert capital boasting Amber Fort, Hawa Mahal, City Palace, vibrant bazaars, and royal heritage."
  },
  {
    name: "Manali",
    region: "North India",
    tagline: "Snow peaks and alpine valleys",
    category: "Hill Stations",
    image_url: "assets/destinations/manali.jpg",
    description: "High Himalayan mountain retreat featuring pine forests, Solang valley adventures, and snow-capped peaks."
  }
];

const insertOrUpdateDest = db.prepare(`
  INSERT INTO destinations (name, region, tagline, category, image_url, description)
  VALUES (@name, @region, @tagline, @category, @image_url, @description)
`);

for (const dest of allDestinations) {
  const existing = db.prepare("SELECT id FROM destinations WHERE name = ?").get(dest.name);
  if (!existing) {
    insertOrUpdateDest.run(dest);
  } else {
    db.prepare(`
      UPDATE destinations
      SET region = @region, tagline = @tagline, category = @category, image_url = @image_url, description = @description
      WHERE name = @name
    `).run(dest);
  }
}

// Complete rich Tour Packages for each destination
const fullPackages = [
  {
    name: "Kerala Signature: Hills, Backwaters & Coast",
    category: "Backwaters",
    region: "South India",
    destination_name: "Alleppey",
    duration_label: "5N/6D",
    duration_days: 6,
    travel_hours: 6,
    season: "Sep-Mar",
    price: 13999,
    child_price: 6499,
    rating: 4.9,
    highlights: "Munnar Tea Hills, Alleppey Private Houseboat, Kochi Fort Heritage",
    image_url: "assets/destinations/kerala.jpg",
    description: "Our signature Kerala tour: Wake up above the clouds in Munnar, glide through serene backwaters on a private houseboat, and explore colonial Fort Kochi.",
    pickup_locations: "Cochin International Airport (COK), Ernakulam Junction Railway Station",
    drop_locations: "Cochin International Airport (COK), Ernakulam Junction Railway Station",
    accommodation: "4-Star Hill Resort in Munnar (2N), Deluxe A/C Houseboat in Alleppey (1N), Heritage Boutique Hotel in Fort Kochi (2N)",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Kochi & Scenic Drive to Munnar", details: "Pickup from Cochin Airport. Drive through Cheeyappara & Valara waterfalls into the misty tea hills of Munnar. Check-in and evening at leisure." },
      { day: 2, title: "Munnar Tea Gardens & Eravikulam National Park", details: "Morning visit to Eravikulam National Park (Nilgiri Tahr habitat). Tour the Tata Tea Museum, Mattupetty Dam, and Echo Point. Sunset tea tasting." },
      { day: 3, title: "Munnar to Alleppey Houseboat Cruise", details: "Descend to Alleppey. Board your traditional Kerala private houseboat at 12:00 PM. Enjoy authentic Kerala lunch while cruising through Vembanad backwaters. Dinner and overnight stay on water." },
      { day: 4, title: "Alleppey to Fort Kochi Heritage Quarter", details: "Morning canal cruise followed by check-out. Drive to Fort Kochi. Stroll through the Jewish Synagogue, Dutch Palace, and iconic Chinese Fishing Nets at sunset." },
      { day: 5, title: "Kochi Art, Spice Markets & Kathakali Performance", details: "Explore Mattancherry spice bazaar, art cafes, and St. Francis Church. Evening Kathakali dance show with traditional makeup demonstration." },
      { day: 6, title: "Departure from Cochin", details: "Morning breakfast and souvenir shopping. Drop-off at Cochin International Airport / Railway station with unforgettable memories." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Munnar Cloud Country & Tea Estate Retreat",
    category: "Hill Station",
    region: "South India",
    destination_name: "Munnar",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 4,
    season: "All Year",
    price: 7499,
    child_price: 3499,
    rating: 4.8,
    highlights: "Top Station Viewpoint, Kolukkumalai Sunrise Jeep Safari, Tea Tasting",
    image_url: "assets/destinations/munnar.jpg",
    description: "A restorative mountain holiday nestled inside organic tea gardens. Experience breathtaking valley sunrises and refreshing mountain air.",
    pickup_locations: "Cochin International Airport (COK), Aluva Railway Station, Ernakulam",
    drop_locations: "Cochin International Airport (COK), Aluva Railway Station",
    accommodation: "4-Star Mountain View Villa with Balcony overlooking Tea Valleys",
    itinerary: JSON.stringify([
      { day: 1, title: "Scenic Transfer to Munnar", details: "Pickup from Kochi. Stop at Cheeyappara and Valara falls. Check-in to resort with welcome cardamom tea. Evening walk in tea gardens." },
      { day: 2, title: "Kolukkumalai Sunrise & Mountain Trek", details: "Early 4x4 Jeep ride to Kolukkumalai (world's highest organic tea estate) for sunrise over cloud beds. Afternoon visit to Blossom Park and Mattupetty Lake." },
      { day: 3, title: "Eravikulam & Anamudi Vista", details: "Explore Rajamalai national park to witness Nilgiri Tahr. Visit Kundala Lake for pedal boating and Echo Point. Campfire dinner at resort." },
      { day: 4, title: "Tea Tasting & Return Transfer", details: "Morning guided tea factory tour and tasting session. Return drive to Kochi airport or railway hub." }
    ]),
    trending: 1,
    featured: 0
  },
  {
    name: "Alleppey Luxury Houseboat & Canal Life",
    category: "Backwaters",
    region: "South India",
    destination_name: "Alleppey",
    duration_label: "2N/3D",
    duration_days: 3,
    travel_hours: 3,
    season: "Sep-Apr",
    price: 5999,
    child_price: 2799,
    rating: 4.9,
    highlights: "Exclusive A/C Houseboat, Traditional Karimeen Fry, Shikhara Canoe Ride",
    image_url: "assets/destinations/alleppey.jpg",
    description: "Drift along the emerald canals of Kerala aboard an exclusive luxury houseboat with private chef serving freshly caught fish and traditional delicacies.",
    pickup_locations: "Cochin International Airport, Alleppey Railway Station, Marari Beach",
    drop_locations: "Cochin International Airport, Alleppey Railway Station",
    accommodation: "Private Air-Conditioned Premium Houseboat with Sundeck (2N)",
    itinerary: JSON.stringify([
      { day: 1, title: "Boarding Houseboat at Punnamada Lake", details: "Embark on your private luxury houseboat at 12 PM. Welcome tender coconut drink. Cruise through narrow palm-shaded village canals while chef prepares Kerala lunch." },
      { day: 2, title: "Kuttanad Rural Backwaters & Kayaking", details: "Morning canoe trip into narrow waterways impossible for big boats to reach. Witness village duck farming, coir weaving, and sunset over Vembanad Lake." },
      { day: 3, title: "Morning Cruise & Alleppey Beach Departure", details: "Sunrise breakfast cruise. Check out at 9:30 AM. Short visit to Alleppey Old Pier Lighthouse before drop-off at Cochin or Alleppey station." }
    ]),
    trending: 1,
    featured: 0
  },
  {
    name: "Wayanad Rainforest & Wildlife Sanctuary",
    category: "Hill Station",
    region: "South India",
    destination_name: "Wayanad",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 5,
    season: "Sep-May",
    price: 7999,
    child_price: 3799,
    rating: 4.8,
    highlights: "Edakkal Prehistoric Caves, Banasura Sagar Dam, Muthanga Safari",
    image_url: "assets/destinations/wayanad.jpg",
    description: "Explore prehistoric rock carvings, Asia's 2nd largest earthen dam, spice plantations, and elephant sightings in Wayanad's misty rainforests.",
    pickup_locations: "Calicut (Kozhikode) Airport (CCJ), Calicut Railway Station",
    drop_locations: "Calicut Airport, Calicut Railway Station",
    accommodation: "Eco-Luxury Rainforest Treehouse & Plantation Resort",
    itinerary: JSON.stringify([
      { day: 1, title: "Calicut to Wayanad Ghat Road", details: "Scenic climb through 9 hairpin bends with valley viewpoints. Check-in to plantation resort. Evening nature walk and spice garden tour." },
      { day: 2, title: "Banasura Sagar Dam & Soochipara Falls", details: "Speedboat ride on Banasura Sagar reservoir islands. Trek down to the thunderous three-tiered Soochipara waterfalls." },
      { day: 3, title: "Edakkal Caves & Muthanga Wildlife Safari", details: "Hike up Ambukuthi Hills to explore Neolithic petroglyphs at Edakkal Caves. Afternoon jeep safari in Muthanga Wildlife Sanctuary." },
      { day: 4, title: "Pookode Lake & Return Transfer", details: "Boating on freshwater Pookode lake surrounded by evergreen forests. Scenic drive down to Calicut for departure." }
    ]),
    trending: 0,
    featured: 0
  },
  {
    name: "Ooty & Nilgiri Toy Train Heritage",
    category: "Hill Station",
    region: "South India",
    destination_name: "Ooty",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 4,
    season: "All Year",
    price: 7499,
    child_price: 3499,
    rating: 4.7,
    highlights: "UNESCO Nilgiri Mountain Railway, Doddabetta Peak, Pykara Lake & Falls",
    image_url: "assets/destinations/ooty.jpg",
    description: "Ride the legendary steam-hauled UNESCO mountain railway, stand atop the Nilgiris highest peak, and row on sparkling alpine lakes.",
    pickup_locations: "Coimbatore International Airport (CJB), Coimbatore Junction Railway Station",
    drop_locations: "Coimbatore Airport, Coimbatore Junction",
    accommodation: "Colonial British Heritage Hotel with Fireplace & Gardens",
    itinerary: JSON.stringify([
      { day: 1, title: "Coimbatore to Ooty via Coonoor", details: "Pickup and scenic drive through tea-clad Nilgiri slopes. Check-in to heritage bungalow. Evening stroll at Ooty Lake & Boat Club." },
      { day: 2, title: "UNESCO Toy Train Experience & Coonoor", details: "Ride the vintage mountain train across stone viaducts to Coonoor. Visit Sim's Park, Dolphin's Nose viewpoint, and tea factories." },
      { day: 3, title: "Doddabetta Peak, Pine Forest & Pykara", details: "Spectacular 360-degree views from Doddabetta (2,637m). Walk through shooting point pine woods and speedboating at Pykara Lake." },
      { day: 4, title: "Botanical Gardens & Return to Coimbatore", details: "Tour the 175-year-old Government Botanical Gardens. Return drive down the Nilgiris to Coimbatore." }
    ]),
    trending: 1,
    featured: 0
  },
  {
    name: "Kodaikanal Mist & Star Lake Getaway",
    category: "Hill Station",
    region: "South India",
    destination_name: "Kodaikanal",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 4,
    season: "All Year",
    price: 7499,
    child_price: 3499,
    rating: 4.7,
    highlights: "Star-Shaped Kodai Lake, Pillar Rocks, Coaker's Walk, Silver Cascade",
    image_url: "assets/destinations/kodaikanal.jpg",
    description: "Escape to the tranquil Princess of Hill Stations. Stroll along misty cliff edges, cycle around the iconic star lake, and breathe fresh pine scents.",
    pickup_locations: "Madurai Airport (IXM), Madurai Junction, Dindigul Junction",
    drop_locations: "Madurai Airport, Madurai Junction",
    accommodation: "4-Star Lakeside Resort with Valley Views",
    itinerary: JSON.stringify([
      { day: 1, title: "Madurai to Kodaikanal Hills", details: "Scenic drive from Madurai ascending Palani hills. Stop at Silver Cascade waterfall. Check-in and evening bicycle ride around Kodai Lake." },
      { day: 2, title: "Pillar Rocks, Guna Caves & Coaker's Walk", details: "View the 400-foot vertical Pillar Rocks cliff. Walk the misty cliff path of Coaker's Walk with binoculars view of the plains." },
      { day: 3, title: "Berijam Lake & Pine Forest Walk", details: "Morning forest safari into the restricted Berijam sanctuary. Walk among towering 100-year-old pine trees. Evening handmade chocolate shopping." },
      { day: 4, title: "Bryant Park & Madurai Drop-off", details: "Visit Bryant botanical garden. Descend to Madurai for airport/train drop." }
    ]),
    trending: 0,
    featured: 0
  },
  {
    name: "Coorg Coffee Trails & Abbey Waterfalls",
    category: "Hill Station",
    region: "South India",
    destination_name: "Coorg",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 5,
    season: "Oct-May",
    price: 8499,
    child_price: 3999,
    rating: 4.8,
    highlights: "Golden Temple Bylakuppe, Abbey Falls, Raja's Seat Sunset, Coffee Roasting",
    image_url: "assets/destinations/coorg.jpg",
    description: "Immerse yourself in India's coffee heartland. Stay amid arabica trees, witness Tibetan monastic culture, and marvel at roaring waterfalls.",
    pickup_locations: "Mangalore Airport (IXE), Mysore Junction, Bangalore Airport (BLR)",
    drop_locations: "Mangalore Airport, Mysore Junction, Bangalore Airport",
    accommodation: "Luxury Coffee Estate Plantation Bungalow with Pool",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival & Tibetan Golden Temple", details: "Pickup and drive to Coorg. Stop at Namdroling Monastery (Golden Temple) in Bylakuppe. Check-in to coffee estate bungalow with estate walk." },
      { day: 2, title: "Abbey Falls, Madikeri Fort & Raja's Seat", details: "Visit cascading Abbey Falls framed by spice trees. Explore 17th-century Madikeri Fort. Catch a magnificent sunset over the hills at Raja's Seat." },
      { day: 3, title: "Talakaveri & Dubare Elephant Camp", details: "Journey to Talakaveri (sacred origin of river Kaveri) in Brahmagiri hills. Afternoon interactive session at Dubare Elephant Camp." },
      { day: 4, title: "Fresh Coffee Tasting & Departure", details: "Guided coffee plucking, processing & brewing masterclass. Departure transfer to airport/station." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Mysore Royal Heritage & Palaces",
    category: "Heritage",
    region: "South India",
    destination_name: "Mysore",
    duration_label: "2N/3D",
    duration_days: 3,
    travel_hours: 3,
    season: "Oct-Mar",
    price: 6499,
    child_price: 2999,
    rating: 4.7,
    highlights: "Grand Illuminated Mysore Palace, Chamundi Hills, Brindavan Garden Fountains",
    image_url: "assets/destinations/mysore.jpg",
    description: "Step into royal Karnataka history with the world-famous Mysore Palace illuminated by nearly 100,000 golden bulbs, Chamundeshwari temple, and silk looms.",
    pickup_locations: "Bangalore Airport (BLR), Mysore Junction, Bangalore City",
    drop_locations: "Bangalore Airport, Mysore Junction",
    accommodation: "4-Star Royal Heritage Palace Hotel in Central Mysuru",
    itinerary: JSON.stringify([
      { day: 1, title: "Bangalore to Mysore via Srirangapatna", details: "Pickup from Bangalore. Stop at Tipu Sultan's summer palace in Srirangapatna. Check-in at Mysuru hotel. Sunset visit to Chamundeshwari Temple atop Chamundi Hills." },
      { day: 2, title: "Mysore Palace & Brindavan Musical Gardens", details: "Guided tour through the durbar halls and stained glass ceilings of Mysore Palace. Visit the Government Silk Weaving Factory. Evening musical fountain spectacle at Brindavan Gardens." },
      { day: 3, title: "St. Philomena's Cathedral & Return", details: "Visit the grand Neo-Gothic St. Philomena's Cathedral and Devaraja market for fragrant sandalwood. Return transfer to Bangalore." }
    ]),
    trending: 0,
    featured: 0
  },
  {
    name: "Hampi: Forgotten Vijayanagara Stone Empire",
    category: "Heritage",
    region: "South India",
    destination_name: "Hampi",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 6,
    season: "Oct-Mar",
    price: 8999,
    child_price: 4199,
    rating: 4.9,
    highlights: "Vittala Stone Chariot, Virupaksha Temple, Coracle Boat Ride on Tungabhadra",
    image_url: "assets/destinations/hampi.jpg",
    description: "Walk among the UNESCO World Heritage monuments of the 14th-century Vijayanagara Empire amidst giant granite boulders and the flowing Tungabhadra river.",
    pickup_locations: "Jindal Vijayanagar Airport (VDY), Hubli Airport, Hospet Junction",
    drop_locations: "Hospet Junction, Hubli Airport",
    accommodation: "Luxury Heritage Boutique Resort reflecting Vijayanagara Architecture",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Hampi & Virupaksha Temple", details: "Pickup from Hospet. Check-in to resort. Sunset hike up Hemakuta Hill for panoramic temple vistas. Evening blessings at active Virupaksha Temple." },
      { day: 2, title: "Royal Enclosure & Vittala Temple", details: "Marvel at the musical pillars and iconic Stone Chariot at Vittala Temple complex. Explore Lotus Mahal, Queen's Bath, and Elephant Stables." },
      { day: 3, title: "Anegundi, Sanapur Lake & Coracle Ride", details: "Cross Tungabhadra on a traditional round coracle boat to Hippie Island & Anegundi. Visit Anjaneya Hill (birthplace of Hanuman) for unforgettable sunset." },
      { day: 4, title: "Archeological Museum & Departure", details: "Morning visit to Kamalapur Archeological Museum. Drop-off at Hospet station or Hubli airport." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Pondicherry French Promenade & Auroville",
    category: "Heritage",
    region: "South India",
    destination_name: "Pondicherry",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 3,
    season: "Oct-Mar",
    price: 8499,
    child_price: 3999,
    rating: 4.8,
    highlights: "French White Town Walk, Auroville Matrimandir, Paradise Beach Boat Ride",
    image_url: "assets/destinations/pondicherry.jpg",
    description: "Experience the romance of the French Riviera in India. Walk cobblestone streets lined with mustard-yellow colonial mansions, surf at Serenity Beach, and visit Auroville.",
    pickup_locations: "Chennai International Airport (MAA), Chennai Central, Puducherry Station",
    drop_locations: "Chennai Airport, Puducherry Railway Station",
    accommodation: "French Quarter Heritage Villa with Courtyard Pool (3N)",
    itinerary: JSON.stringify([
      { day: 1, title: "Chennai via Mahabalipuram to Pondicherry", details: "Scenic East Coast Road drive. Stop at Shore Temple in Mahabalipuram. Check-in to French villa. Evening promenade walk along the Bay of Bengal." },
      { day: 2, title: "French White Town & Sri Aurobindo Ashram", details: "Guided walking tour of the French Quarter, Notre Dame des Anges church, and Sri Aurobindo Ashram. Sunset cafe hopping." },
      { day: 3, title: "Auroville Matrimandir & Paradise Beach", details: "Morning meditation view of the golden geodesic dome of Matrimandir at Auroville. Afternoon ferry across Chunnambar river to Paradise Beach." },
      { day: 4, title: "Serenity Beach & Chennai Departure", details: "Morning coffee & French croissants at a heritage boulangerie. Coastal drive back to Chennai for flight/train." }
    ]),
    trending: 0,
    featured: 1
  },
  {
    name: "Rameswaram Sacred Island & Pamban Sea Bridge",
    category: "Heritage",
    region: "South India",
    destination_name: "Rameswaram",
    duration_label: "2N/3D",
    duration_days: 3,
    travel_hours: 4,
    season: "Oct-Mar",
    price: 5999,
    child_price: 2799,
    rating: 4.8,
    highlights: "Ramanathaswamy Temple 1000-Pillar Hall, Pamban Cantilever Bridge, Dhanushkodi Ghost Town",
    image_url: "assets/destinations/rameswaram.jpg",
    description: "Cross the historic Pamban cantilever bridge over turquoise ocean waters. Experience the 22 sacred wells of Ramanathaswamy and the haunting beauty of Dhanushkodi.",
    pickup_locations: "Madurai Airport (IXM), Rameswaram Railway Station",
    drop_locations: "Madurai Airport, Rameswaram Railway Station",
    accommodation: "Beachfront 4-Star Pilgrim & Leisure Resort in Rameswaram",
    itinerary: JSON.stringify([
      { day: 1, title: "Madurai to Rameswaram via Pamban Sea Bridge", details: "Pickup from Madurai. Cross the Indian Ocean on the Pamban Sea Bridge with breathtaking ocean views. Check-in and evening temple darshan." },
      { day: 2, title: "Ramanathaswamy Corridors & Dhanushkodi", details: "Marvel at the world's longest sculpted temple corridor. Afternoon 4x4 drive to Dhanushkodi ghost town and Ram Setu viewpoint overlooking Sri Lanka." },
      { day: 3, title: "Agni Theertham & Return Transfer", details: "Morning ocean sunrise at Agni Theertham. Return drive to Madurai with drop-off at airport or railway station." }
    ]),
    trending: 0,
    featured: 0
  },
  {
    name: "Madurai Ancient Temple Towers & Cultural Trail",
    category: "Heritage",
    region: "South India",
    destination_name: "Madurai",
    duration_label: "2N/3D",
    duration_days: 3,
    travel_hours: 3,
    season: "Oct-Mar",
    price: 5499,
    child_price: 2499,
    rating: 4.8,
    highlights: "Meenakshi Amman Temple Gopurams, Thirumalai Nayakkar Palace, Night Ceremony",
    image_url: "assets/destinations/madurai.jpg",
    description: "Immerse yourself in one of the oldest continuously inhabited cities on earth. Witness towering temple gopurams with thousands of carved deities and night processions.",
    pickup_locations: "Madurai International Airport (IXM), Madurai Junction",
    drop_locations: "Madurai Airport, Madurai Junction",
    accommodation: "4-Star Heritage Hotel near Meenakshi Amman Temple",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Madurai & Night Chariot Ceremony", details: "Pickup and check-in. Evening visit to Meenakshi Amman Temple to witness the awe-inspiring nightly silver palanquin procession." },
      { day: 2, title: "Thirumalai Nayakkar Palace & Gandhi Museum", details: "Explore the giant Italianate pillars of Thirumalai Nayakkar Palace. Visit Gandhi Memorial Museum and sample famous Madurai Jigarthanda." },
      { day: 3, title: "Alagar Kovil & Departure", details: "Morning trip to scenic Alagar Kovil temple foothills. Transfer to Madurai airport/station." }
    ]),
    trending: 0,
    featured: 0
  },
  {
    name: "Varanasi Spiritual Ghats & Ganga Aarti",
    category: "Heritage",
    region: "North India",
    destination_name: "Varanasi",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 3,
    season: "Oct-Mar",
    price: 8499,
    child_price: 3999,
    rating: 4.9,
    highlights: "Dashashwamedh Evening Aarti by Boat, Sunrise Ganges Rowing, Sarnath Buddhist Stupa",
    image_url: "assets/destinations/varanasi.jpg",
    description: "Witness the sacred eternal city of light. Experience the mesmerizing fire rituals of Ganga Aarti from a private boat and explore ancient silk weaving lanes.",
    pickup_locations: "Lal Bahadur Shastri International Airport (VNS), Varanasi Junction",
    drop_locations: "Varanasi Airport, Varanasi Junction",
    accommodation: "Luxury Heritage Haveli on the Ghats overlooking the River Ganges",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Varanasi & Grand Evening Ganga Aarti", details: "Pickup from airport. Check-in to riverside haveli. At sunset, board a private decorated wooden boat to witness the majestic Dashashwamedh Ghat Aarti." },
      { day: 2, title: "Sunrise Rowing, Kashi Vishwanath & Old Alleyways", details: "Dawn rowing boat along Manikarnika and Assi Ghats. Visit the golden-spire Kashi Vishwanath Temple corridor. Walking tour of ancient bazaars." },
      { day: 3, title: "Sarnath: First Teachings of Buddha", details: "Short drive to sacred Sarnath where Lord Buddha gave his first sermon. Tour the Dhamek Stupa, archeological museum, and Ashoka Pillar." },
      { day: 4, title: "Banarasi Silk Looms & Departure", details: "Visit traditional master weavers of Banarasi silk sarees. Transfer to Varanasi airport for onward journey." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Jaipur Royal Forts & Pink City Palaces",
    category: "Heritage",
    region: "North India",
    destination_name: "Jaipur",
    duration_label: "3N/4D",
    duration_days: 4,
    travel_hours: 4,
    season: "Sep-Apr",
    price: 9499,
    child_price: 4499,
    rating: 4.9,
    highlights: "Amber Fort Elephant / Jeep, Hawa Mahal Palace of Winds, City Palace, Jal Mahal",
    image_url: "assets/destinations/jaipur.jpg",
    description: "Step into the glamorous world of Rajasthan's maharajas. Marvel at honeycomb facades of Hawa Mahal, mirror mosaics of Sheesh Mahal, and grand hilltop fortresses.",
    pickup_locations: "Jaipur International Airport (JAI), Jaipur Junction",
    drop_locations: "Jaipur Airport, Jaipur Junction",
    accommodation: "4-Star Royal Heritage Palace Hotel with Traditional Rajasthani Hospitality",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Jaipur & Chokhi Dhani Folk Village", details: "Pickup from airport. Check-in to heritage palace hotel. Evening visit to Chokhi Dhani ethnic village for folk dances, camel rides, and royal thali." },
      { day: 2, title: "Amber Fort, Jal Mahal & Nahargarh Sunset", details: "Ascend to magnificent Amber Fort with Sheesh Mahal. Photo stop at water palace Jal Mahal. Panoramic sunset over the Pink City from Nahargarh Fort." },
      { day: 3, title: "City Palace, Jantar Mantar & Hawa Mahal", details: "Guided royal tour of City Palace residence, UNESCO solar observatory Jantar Mantar, and iconic 953-window Hawa Mahal facade. Johari Bazaar shopping." },
      { day: 4, title: "Albert Hall Museum & Departure", details: "Visit Indo-Saracenic Albert Hall Museum. Transfer to Jaipur airport or railway station." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Manali Alpine Snow Peaks & Solang Valley",
    category: "Hill Station",
    region: "North India",
    destination_name: "Manali",
    duration_label: "4N/5D",
    duration_days: 5,
    travel_hours: 6,
    season: "All Year",
    price: 9999,
    child_price: 4799,
    rating: 4.8,
    highlights: "Solang Valley Adventures, Atal Tunnel to Sissu, Hadimba Temple, Old Manali Cafes",
    image_url: "assets/destinations/manali.jpg",
    description: "Breathe crisp Himalayan mountain air in Manali. Cross the engineering marvel Atal Tunnel to Lahaul valley, ride cable cars in Solang, and wander apple orchards.",
    pickup_locations: "Bhuntar (Kullu) Airport (KUU), Chandigarh Airport (IXC), Manali Bus Terminal",
    drop_locations: "Bhuntar Airport, Chandigarh Airport, Manali Bus Terminal",
    accommodation: "4-Star Alpine Cedar Wood Resort overlooking Snow-Capped Himalayan Peaks",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Manali & Hadimba Temple", details: "Pickup and transfer along the roaring Beas river into Manali. Check-in to resort. Visit the ancient wooden Hadimba Devi Temple in cedar forest." },
      { day: 2, title: "Solang Valley Snow & Adventure Hub", details: "Full day in Solang Valley for cable car ropeway, paragliding, zorbing, and winter snow activities surrounded by glaciated summits." },
      { day: 3, title: "Atal Tunnel & Sissu Waterfalls (Lahaul)", details: "Drive through the 9km Atal Tunnel into the dramatic arid mountains of Lahaul. Marvel at the frozen Sissu waterfall and spend time by Chandra river." },
      { day: 4, title: "Old Manali, Vashisht Hot Springs & Mall Road", details: "Dip in natural mineral sulfur springs at Vashisht. Stroll among quaint cafes of Old Manali. Evening souvenir shopping on the vibrant Mall Road." },
      { day: 5, title: "Naggar Castle & Departure", details: "Visit historic wooden Naggar Castle and Nicholas Roerich art gallery on return drive for departure." }
    ]),
    trending: 1,
    featured: 1
  },
  {
    name: "Goa Sun, Sand & Portuguese Charm",
    category: "Beach",
    region: "South India",
    destination_name: "Goa",
    duration_label: "4N/5D",
    duration_days: 5,
    travel_hours: 4,
    season: "Oct-May",
    price: 8999,
    child_price: 4199,
    rating: 4.8,
    highlights: "North Goa Beach Clubs, Old Goa Basilicas, Mandovi River Sunset Cruise",
    image_url: "assets/destinations/goa.jpg",
    description: "Golden shores, palm groves, Portuguese mansions, fresh seafood shacks, and vibrant beach sunsets along India's favourite coastline.",
    pickup_locations: "Goa Dabolim Airport (GOI), Manohar International Airport Mopa (GOX), Madgaon Station",
    drop_locations: "Goa Dabolim Airport, Mopa Airport, Madgaon Station",
    accommodation: "4-Star Beachfront Boutique Resort with Pool",
    itinerary: JSON.stringify([
      { day: 1, title: "Arrival in Goa & Beach Sunset", details: "Pickup and transfer to beachfront resort. Welcome cocktail. Evening relaxation on the golden sands and beach shack dinner." },
      { day: 2, title: "North Goa Beaches & Fort Aguada", details: "Visit 17th-century Portuguese Fort Aguada lighthouse. Explore Calangute, Baga, and Anjuna beaches with optional water sports." },
      { day: 3, title: "Old Goa UNESCO Heritage & Fontainhas", details: "Explore Basilica of Bom Jesus and Se Cathedral. Walk through Fontainhas Latin Quarter with colourful Portuguese homes. Sunset Mandovi cruise." },
      { day: 4, title: "South Goa Serene Shores & Spice Plantation", details: "Guided tour through Sahakari spice farm with authentic Goan lunch. Afternoon at quiet Palolem or Colva beach." },
      { day: 5, title: "Departure Transfer", details: "Breakfast by the sea and departure drop to airport/railway station." }
    ]),
    trending: 1,
    featured: 0
  }
];

const insertPkgStmt = db.prepare(`
  INSERT INTO packages (
    name, category, region, destination_name, duration_label, duration_days, travel_hours,
    season, price, child_price, rating, highlights, image_url, description,
    pickup_locations, drop_locations, accommodation, itinerary, trending, featured
  )
  VALUES (
    @name, @category, @region, @destination_name, @duration_label, @duration_days, @travel_hours,
    @season, @price, @child_price, @rating, @highlights, @image_url, @description,
    @pickup_locations, @drop_locations, @accommodation, @itinerary, @trending, @featured
  )
`);

const updatePkgStmt = db.prepare(`
  UPDATE packages SET
    category = @category, region = @region, destination_name = @destination_name,
    duration_label = @duration_label, duration_days = @duration_days, travel_hours = @travel_hours,
    season = @season, price = @price, child_price = @child_price, rating = @rating,
    highlights = @highlights, image_url = @image_url, description = @description,
    pickup_locations = @pickup_locations, drop_locations = @drop_locations,
    accommodation = @accommodation, itinerary = @itinerary, trending = @trending, featured = @featured
  WHERE name = @name
`);

for (const pkg of fullPackages) {
  const existing = db.prepare("SELECT id FROM packages WHERE name = ?").get(pkg.name);
  if (!existing) {
    insertPkgStmt.run(pkg);
  } else {
    updatePkgStmt.run(pkg);
  }
}

// Clean up legacy stub packages (IDs 1-8) and safely remap any bookings
const legacyRemap = [
  { legacyName: 'Kerala Highlights', targetName: 'Kerala Signature: Hills, Backwaters & Coast' },
  { legacyName: 'Munnar Tea Country Escape', targetName: 'Munnar Cloud Country & Tea Estate Retreat' },
  { legacyName: 'Goa Beach Retreat', targetName: 'Goa Sun, Sand & Portuguese Charm' },
  { legacyName: 'Alleppey Backwater Cruise', targetName: 'Alleppey Luxury Houseboat & Canal Life' },
  { legacyName: 'Kodaikanal Lake Escape', targetName: 'Kodaikanal Mist & Star Lake Getaway' },
  { legacyName: 'Mysuru Royal Heritage', targetName: 'Mysore Royal Heritage & Palaces' },
  { legacyName: 'Tamil Nadu Heritage Trail', targetName: 'Madurai Ancient Temple Towers & Cultural Trail' },
  { legacyName: 'Karnataka Explorer', targetName: 'Coorg Coffee Trails & Abbey Waterfalls' }
];

for (const map of legacyRemap) {
  const legacy = db.prepare("SELECT id FROM packages WHERE name = ?").get(map.legacyName);
  const target = db.prepare("SELECT id FROM packages WHERE name = ?").get(map.targetName);
  if (legacy && target) {
    db.prepare("UPDATE bookings SET package_id = ? WHERE package_id = ?").run(target.id, legacy.id);
    db.prepare("DELETE FROM packages WHERE id = ?").run(legacy.id);
  }
}

db.prepare("UPDATE destinations SET image_url = 'assets/destinations/mysore.jpg' WHERE name = 'Mysuru'").run();
db.prepare("UPDATE destinations SET image_url = 'assets/destinations/kumarakom.jpg' WHERE name = 'Kumarakom'").run();
db.prepare("UPDATE destinations SET image_url = 'assets/destinations/thekkady.jpg' WHERE name = 'Thekkady'").run();
db.prepare("UPDATE destinations SET image_url = 'assets/destinations/varkala.jpg' WHERE name = 'Varkala'").run();
db.prepare("UPDATE destinations SET image_url = 'assets/destinations/gokarna.jpg' WHERE name = 'Gokarna'").run();
db.prepare("UPDATE destinations SET image_url = 'assets/destinations/kochi.jpg' WHERE name = 'Kochi'").run();

// -------------------------------------------------------------
// MongoDB / Mongoose Database Integration
// -------------------------------------------------------------
const mongo = require("./db/mongo");

// Asynchronously attempt to connect to MongoDB and auto-seed if empty
mongo.connectMongo(db).catch((err) => {
  // Gracefully handled inside connectMongo
});

module.exports = {
  db,
  hash,
  hashPassword,
  verifyPassword,
  // MongoDB / Mongoose exports
  mongoose: mongo.mongoose,
  mongoDb: mongo.mongoDb,
  models: mongo.models,
  Package: mongo.Package,
  Destination: mongo.Destination,
  User: mongo.User,
  AdminUser: mongo.AdminUser,
  Booking: mongo.Booking,
  Payment: mongo.Payment,
  Guide: mongo.Guide,
  Message: mongo.Message,
  Suggestion: mongo.Suggestion,
  OtpCode: mongo.OtpCode,
  connectMongo: mongo.connectMongo,
  syncSqliteToMongo: () => mongo.syncSqliteToMongo(db),
  isMongoConnected: mongo.isMongoConnected
};

