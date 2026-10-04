const express = require("express");
const { db } = require("../db");

const router = express.Router();

// Helper to query live knowledge base from DB
function getWayfarerContext() {
  const packages = db.prepare("SELECT * FROM packages ORDER BY trending DESC, rating DESC").all();
  const destinations = db.prepare("SELECT * FROM destinations ORDER BY name ASC").all();
  return { packages, destinations };
}

// POST /api/chat — Intelligent AI Travel Assistant
router.post("/", async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  const query = message.trim();
  const lower = query.toLowerCase();
  const { packages, destinations } = getWayfarerContext();

  // 1. Try calling Google Gemini API if key is configured in environment
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const systemPrompt = `You are "Wayfarer AI", an intelligent, warm, and sophisticated travel concierge for Wayfarer — India's premier bespoke travel booking platform.
You can answer general knowledge questions on any topic, but your primary expertise is planning trips and helping users with Wayfarer packages and destinations.

Here is the current live catalog of Wayfarer packages and destinations:
PACKAGES:
${packages.map(p => `- ID: ${p.id} | ${p.name} | Dest: ${p.destination_name} | Cat: ${p.category} | ${p.duration_label} (${p.duration_days} days) | ₹${p.price}/person | Rating: ${p.rating} | Highlights: ${p.highlights}`).join("\n")}

DESTINATIONS:
${destinations.map(d => `- ${d.name} (${d.category}, ${d.region}): ${d.tagline} - ${d.description}`).join("\n")}

Guidelines:
1. Always be conversational, helpful, and polite.
2. If the user specifies travelers (e.g. single person, couple, family), budget, duration, or dates, recommend matching packages from the catalog with exact prices and durations.
3. Suggest the user can click on the recommendation cards to book directly.
4. If asked general questions, answer accurately and warmly.`;

      // Build contents with past history
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach(h => {
          contents.push({
            role: h.role === "assistant" || h.role === "bot" ? "model" : "user",
            parts: [{ text: h.content || h.text || "" }]
          });
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
      });

      // Try gemini-1.5-flash endpoint
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          const matched = findRelevantPackages(lower, packages);
          return res.json({
            reply: replyText,
            packages: matched.slice(0, 3)
          });
        }
      }
    } catch (e) {
      console.warn("Notice: Gemini API call failed, falling back to local travel AI engine:", e.message);
    }
  }

  // 2. High-Intelligence Built-in Local Travel AI Engine
  const result = generateLocalAIResponse(query, lower, packages, destinations);
  res.json(result);
});

// Helper to filter and match packages based on user intent
function findRelevantPackages(lower, packages) {
  // Check price/budget mentions
  let maxBudget = Infinity;
  const budgetMatch = lower.match(/(?:under|below|less than|within|budget of)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k|000)?/i);
  if (budgetMatch) {
    let amt = parseInt(budgetMatch[1], 10);
    if (amt < 100) amt *= 1000;
    maxBudget = amt;
  }

  let filtered = packages.filter(p => p.price <= maxBudget);

  // Check solo traveler favorites
  if (isSoloQuery(lower)) {
    const soloFavorites = filtered.filter(p => {
      const name = (p.name || "").toLowerCase();
      const dest = (p.destination_name || "").toLowerCase();
      return dest.includes("gokarna") || dest.includes("varkala") || dest.includes("hampi") || dest.includes("munnar") || name.includes("gokarna") || name.includes("hampi");
    });
    if (soloFavorites.length > 0) return soloFavorites;
  }

  // Check couple / honeymoon favorites
  if (isCoupleQuery(lower)) {
    const coupleFavorites = filtered.filter(p => {
      const cat = (p.category || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return cat.includes("backwater") || name.includes("houseboat") || name.includes("munnar") || name.includes("kerala");
    });
    if (coupleFavorites.length > 0) return coupleFavorites;
  }

  // Filter by category or destination keywords
  const keywords = {
    backwater: ["backwaters", "houseboat", "alleppey", "kumarakom", "canal"],
    hill: ["hill", "hills", "mist", "mountain", "munnar", "ooty", "coorg", "kodaikanal", "wayanad", "tea", "coffee"],
    beach: ["beach", "sea", "sand", "goa", "gokarna", "varkala", "coast"],
    heritage: ["heritage", "temple", "palace", "hampi", "mysore", "mysuru", "madurai", "rameswaram", "history", "varanasi", "jaipur"]
  };

  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) {
      const match = filtered.filter(p =>
        words.some(w =>
          (p.name && p.name.toLowerCase().includes(w)) ||
          (p.category && p.category.toLowerCase().includes(w)) ||
          (p.destination_name && p.destination_name.toLowerCase().includes(w)) ||
          (p.highlights && p.highlights.toLowerCase().includes(w))
        )
      );
      if (match.length) return match;
    }
  }

  // Match by specific destination name
  const destMatch = packages.filter(p =>
    p.destination_name && lower.includes(p.destination_name.toLowerCase())
  );
  if (destMatch.length) return destMatch;

  return filtered.slice(0, 3);
}

function isSoloQuery(lower) {
  return (
    lower.includes("single person") ||
    lower.includes("solo") ||
    lower.includes("alone") ||
    lower.includes("by myself") ||
    lower.includes("1 person") ||
    lower.includes("one person") ||
    lower.includes("1 traveler") ||
    lower.includes("one traveler") ||
    lower.includes("backpacking") ||
    lower.includes("single traveller")
  );
}

function isCoupleQuery(lower) {
  return (
    lower.includes("couple") ||
    lower.includes("honeymoon") ||
    lower.includes("romantic") ||
    lower.includes("2 people") ||
    lower.includes("two people") ||
    lower.includes("2 persons") ||
    lower.includes("two persons") ||
    lower.includes("anniversary") ||
    lower.includes("wife") ||
    lower.includes("husband") ||
    lower.includes("partner")
  );
}

function isFamilyQuery(lower) {
  return (
    lower.includes("family") ||
    lower.includes("kids") ||
    lower.includes("children") ||
    lower.includes("parents") ||
    lower.includes("elders") ||
    lower.includes("senior citizens") ||
    lower.includes("with family")
  );
}

// Built-in intelligent travel concierge logic
function generateLocalAIResponse(query, lower, packages, destinations) {
  // 1. Solo Traveler / Single Person
  if (isSoloQuery(lower)) {
    const soloPkgs = packages.filter(p => {
      const dest = (p.destination_name || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return dest.includes("gokarna") || dest.includes("varkala") || dest.includes("hampi") || dest.includes("munnar") || name.includes("gokarna") || name.includes("hampi");
    });

    return {
      reply: `Traveling solo is one of the most rewarding adventures you can take! 🎒✨\n\nSouth India is exceptionally welcoming, scenic, and safe for solo travelers. Here are the top circuits we recommend for a **single person**:\n\n1. **Gokarna & Varkala Cliffs**: Laid-back beaches, coastal hiking, yoga studios, cliffside sea-facing cafes, and a vibrant community of fellow travelers.\n2. **Hampi Stone Empire**: Rent a bicycle to explore giant UNESCO boulder ruins, cross the Tungabhadra on round coracle boats, and watch sunset drum circles at Hemakuta Hill.\n3. **Munnar & Coorg Tea Trails**: Peaceful mountain retreats, safe forest hikes, and authentic home-cooked meals.\n\n🛡️ **The Wayfarer Solo Assurance**:\n- **Certified Guide**: Every confirmed tour connects you with a verified, licensed local guide.\n- **Private Verified Transport**: Safe station/airport pickups directly to your hotel.\n- **24/7 Concierge**: Continuous support throughout your journey.\n\nCheck out these top-rated itineraries tailored for solo travelers:`,
      packages: (soloPkgs.length ? soloPkgs : packages).slice(0, 3)
    };
  }

  // 2. Couples & Honeymoon
  if (isCoupleQuery(lower)) {
    const romantic = packages.filter(p => {
      const cat = (p.category || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return cat.includes("backwater") || name.includes("munnar") || name.includes("houseboat") || name.includes("kerala");
    });
    return {
      reply: `South India is home to some of the most romantic, serene escapes in the world! 💑🌺\n\n- **Alleppey Backwaters**: Glide through quiet palm-shaded canals aboard a private air-conditioned luxury houseboat with a dedicated chef preparing candle-lit dinner.\n- **Munnar Cloud Hills**: Wake up above the morning mist in luxury tea estate chalets, cozy fire pits, and private waterfall walks.\n- **Kumarakom Lake Resorts**: Ayurvedic spa sessions, infinity pools overlooking Vembanad Lake, and private sunset boat rides.\n\nHere are our signature couple and honeymoon getaways:`,
      packages: (romantic.length ? romantic : packages).slice(0, 3)
    };
  }

  // 3. Family & Kids
  if (isFamilyQuery(lower)) {
    const familyPkgs = packages.filter(p => {
      const name = (p.name || "").toLowerCase();
      return name.includes("kerala") || name.includes("mysore") || name.includes("ooty");
    });
    return {
      reply: `Planning a family holiday? We specialize in stress-free, comfortably paced family vacations! 👨‍👩‍👧‍👦🚌\n\n- **Mysore Royal Heritage**: The illuminated Golden Palace, Brindavan dancing fountains, and Mysore Zoo (kids love it!).\n- **Ooty Toy Train & Gardens**: The historic UNESCO steam train ride through blue mountain tunnels and botanical gardens.\n- **Kerala Houseboat & Wildlife**: Spot wild elephants in Periyar Thekkady and sleep safely aboard a family-friendly houseboat.\n\n✨ **Family Inclusions**: Spacious AC Innova/Tempo vehicles, interconnected resort rooms, dedicated child meals on request, and kid-discounted pricing.`,
      packages: (familyPkgs.length ? familyPkgs : packages).slice(0, 3)
    };
  }

  // 4. Greetings & pleasantries
  if (/^(hi|hello|hey|greetings|good morning|good evening|namaste)\b/.test(lower)) {
    return {
      reply: `Hello and welcome to **Wayfarer**! 🌿✨ I am your dedicated AI Travel Concierge.\n\nWhether you're traveling **solo**, as a **couple**, or with **family and friends** — I can help you find the perfect trip!\n\nTell me about your travel dreams:\n- **Number of travelers** (e.g., solo, couple, family of 4)\n- **Vibe** (hills, beaches, backwaters, ancient temples)\n- **Budget** or **duration** (e.g., 3 days, under ₹10,000)`,
      packages: packages.filter(p => p.trending === 1).slice(0, 3)
    };
  }

  // 5. Budget inquiries
  if (lower.includes("budget") || lower.includes("price") || lower.includes("cost") || lower.includes("cheap") || lower.includes("affordable") || lower.includes("under")) {
    const matched = findRelevantPackages(lower, packages);
    const minPrice = matched.length ? Math.min(...matched.map(m => m.price)) : 5999;
    return {
      reply: `Here are our best handcrafted packages tailored for your budget preferences (starting from **₹${minPrice.toLocaleString("en-IN")}** per person):\n\nEach package includes hand-picked luxury heritage accommodation, dedicated private transport, local experiences, and daily guided itineraries. Click **Book Now** on any card below to customize your dates and guests!`,
      packages: matched.slice(0, 3)
    };
  }

  // 6. Duration / Trip length
  if (lower.includes("weekend") || lower.includes("2 day") || lower.includes("3 day") || lower.includes("4 day") || lower.includes("5 day") || lower.includes("week") || lower.includes("how many day")) {
    const daysMatch = lower.match(/(\d+)\s*(?:day|night)/);
    const numDays = daysMatch ? parseInt(daysMatch[1], 10) : 3;
    const durPkgs = packages.filter(p => Math.abs(p.duration_days - numDays) <= 1);
    return {
      reply: `For a trip of around **${numDays} days**, we recommend focusing on 1 or 2 nearby destinations to enjoy a relaxed, immersive pace without rushing through transit.\n\nHere are hand-crafted itineraries matching your desired duration:`,
      packages: (durPkgs.length ? durPkgs : packages).slice(0, 3)
    };
  }

  // 7. Hill stations
  if (lower.includes("hill") || lower.includes("munnar") || lower.includes("ooty") || lower.includes("coorg") || lower.includes("kodaikanal") || lower.includes("wayanad")) {
    const hills = packages.filter(p => p.category.toLowerCase().includes("hill") || ["munnar", "ooty", "coorg", "kodaikanal", "wayanad"].some(d => (p.destination_name || "").toLowerCase().includes(d)));
    return {
      reply: `The Western Ghats hill stations are pure magic! ⛰️🍃\n\n- **Munnar**: Rolling emerald tea estates, cloud valleys, and Kolukkumalai sunrise safaris.\n- **Ooty**: The historic UNESCO Nilgiri Mountain Toy Train, fragrant pine forests, and botanical gardens.\n- **Coorg**: Lush coffee blossom plantations, Abbey Falls, and Tibetan monasteries.\n- **Wayanad**: Dense rainforests, Banasura dam, and wildlife sanctuaries.\n\nHere are our top hill station packages ready for reservation:`,
      packages: hills.slice(0, 3)
    };
  }

  // 8. Backwaters & Houseboats
  if (lower.includes("backwater") || lower.includes("houseboat") || lower.includes("alleppey") || lower.includes("kumarakom") || lower.includes("kerala")) {
    const water = packages.filter(p => p.category.toLowerCase().includes("backwater") || (p.name || "").toLowerCase().includes("kerala") || (p.destination_name || "").toLowerCase().includes("alleppey"));
    return {
      reply: `A private houseboat cruise through Kerala's tranquil backwaters is an unforgettable experience! ⛵🌴\n\nYou'll glide past coconut groves and paddy fields, enjoy traditional Kerala meals prepared by a private onboard chef, and wake up to serene water sunrises.\n\nCheck out our curated backwater escapes:`,
      packages: water.slice(0, 3)
    };
  }

  // 9. Beaches & Coast
  if (lower.includes("beach") || lower.includes("sea") || lower.includes("goa") || lower.includes("gokarna") || lower.includes("varkala")) {
    const beach = packages.filter(p => p.category.toLowerCase().includes("beach") || ["goa", "gokarna", "varkala"].some(d => (p.destination_name || "").toLowerCase().includes(d)));
    return {
      reply: `Looking for sun, sand, and coastal tranquility? 🏖️🌊\n\n- **Goa**: Sun-kissed shores, Portuguese villas, beachside shacks, and vibrant twilight cruises.\n- **Gokarna**: Peaceful crescent-shaped Om Beach, pristine coves, and cliffside trails.\n- **Varkala**: Spectacular red laterite cliffs towering over the Arabian Sea.\n\nHere are our top beach packages:`,
      packages: beach.slice(0, 3)
    };
  }

  // 10. Heritage, Palaces & Temples
  if (lower.includes("heritage") || lower.includes("temple") || lower.includes("hampi") || lower.includes("mysore") || lower.includes("madurai") || lower.includes("rameswaram")) {
    const heritage = packages.filter(p => p.category.toLowerCase().includes("heritage") || ["hampi", "mysore", "madurai", "rameswaram"].some(d => (p.destination_name || "").toLowerCase().includes(d)));
    return {
      reply: `South India's heritage is carved in stone and bathed in history! 🏛️✨\n\n- **Hampi**: The surreal UNESCO boulder-strewn capital of the 14th-century Vijayanagara Empire.\n- **Mysore**: The majestic illuminated Royal Palace and fragrant sandalwood markets.\n- **Madurai**: The towering sculpted gopurams of the ancient Meenakshi Amman Temple.\n- **Rameswaram**: The historic Pamban cantilever sea bridge and sacred island corridors.\n\nExplore our signature heritage itineraries:`,
      packages: heritage.slice(0, 3)
    };
  }

  // 11. Booking, Payment, Guide, Coupons
  if (lower.includes("how to book") || lower.includes("payment") || lower.includes("gpay") || lower.includes("upi") || lower.includes("guide") || lower.includes("coupon") || lower.includes("discount")) {
    return {
      reply: `Booking on **Wayfarer** is seamless and 100% secure! 🛡️\n\n1. **Select Package**: Choose your package and customize travelers and dates.\n2. **Special Discounts**: Use coupon **WAYFARER25** (25% off) or **SOUTHINDIA** (₹2,000 flat off) during booking!\n3. **Payment**: We support Google Pay (GPay), PhonePe, Paytm, BHIM UPI, Cards, and Net Banking.\n4. **Certified Tour Guide**: Every confirmed tour is assigned a verified regional guide with their contact details visible in your dashboard!\n5. **Instant Slip**: Download an official printable itinerary slip right after payment.`,
      packages: packages.slice(0, 2)
    };
  }

  // 12. Best time to visit / Seasons
  if (lower.includes("best time") || lower.includes("season") || lower.includes("weather") || lower.includes("october") || lower.includes("december") || lower.includes("monsoon") || lower.includes("winter") || lower.includes("summer")) {
    return {
      reply: `Here is the seasonal travel guide for South India: ☀️🌦️❄️\n\n- **October to March (Peak Season)**: The absolute best time for hills, beaches, and backwaters with mild temperatures, pleasant sunny skies, and cool mountain breezes.\n- **April to June (Summer Escape)**: Perfect for heading up to cool hill retreats like **Munnar**, **Ooty**, and **Kodaikanal** to escape city heat.\n- **July to September (Monsoon Magic)**: The hills turn hyper-vivid green with roaring waterfalls (Athirappilly, Abbey Falls), ideal for quiet Ayurvedic rejuvenation in Kerala.`,
      packages: packages.filter(p => p.trending === 1).slice(0, 3)
    };
  }

  // 13. General Knowledge / Fallback Query
  const matched = findRelevantPackages(lower, packages);
  return {
    reply: `I'd love to help you plan that! Wayfarer curates handcrafted journeys across South India's finest destinations with verified guides and luxury stays.\n\nBased on your query ("*${escapeMarkdown(query)}*"), here are top recommended packages you can explore or book right away:`,
    packages: matched.slice(0, 3)
  };
}

function escapeMarkdown(text) {
  return text.replace(/[*_~`]/g, "");
}

module.exports = router;
