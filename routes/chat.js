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

  // Try calling Google Gemini API if key is configured in environment
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
2. If the user specifies budget, travelers, duration, dates, or preferences, recommend matching packages from the catalog with exact prices and durations.
3. Suggest the user can click on the recommendation cards to book directly.
4. If asked general knowledge questions, answer accurately and concisely.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }] }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          // Find matching packages for cards
          const matched = findRelevantPackages(lower, packages);
          return res.json({
            reply: replyText,
            packages: matched.slice(0, 3)
          });
        }
      }
    } catch (e) {
      console.warn("Notice: Gemini API fallback to local NLP engine:", e.message);
    }
  }

  // Built-in High-Intelligence Rule & Travel NLP Engine
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

  // Check duration mentions
  let targetDays = 0;
  const daysMatch = lower.match(/(\d+)\s*(?:day|night|n|d)/i);
  if (daysMatch) {
    targetDays = parseInt(daysMatch[1], 10);
  }

  let filtered = packages.filter(p => p.price <= maxBudget);

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

// Built-in intelligent travel concierge logic
function generateLocalAIResponse(query, lower, packages, destinations) {
  // 1. Greetings & general pleasantries
  if (/^(hi|hello|hey|greetings|good morning|good evening|namaste)\b/.test(lower)) {
    return {
      reply: `Hello and welcome to **Wayfarer**! 🌿✨ I am your dedicated AI Travel Concierge.\n\nWhether you're looking for misty hill stations like **Munnar** and **Ooty**, peaceful backwaters in **Alleppey**, ancient stone temples in **Hampi**, or golden beaches in **Goa** and **Varkala** — I'm here to curate your dream journey.\n\nHow can I assist you today? You can tell me your **budget, number of travelers, preferred dates, or destination vibes**!`,
      packages: packages.filter(p => p.trending === 1).slice(0, 3)
    };
  }

  // 2. Budget / Package planning inquiries
  if (lower.includes("budget") || lower.includes("price") || lower.includes("cost") || lower.includes("cheap") || lower.includes("affordable") || lower.includes("under")) {
    const matched = findRelevantPackages(lower, packages);
    const minPrice = matched.length ? Math.min(...matched.map(m => m.price)) : 5999;
    return {
      reply: `Here are our best handcrafted packages tailored for your budget preferences (starting from **₹${minPrice.toLocaleString("en-IN")}** per person):\n\nEach package includes hand-picked luxury heritage accommodation, dedicated private transport, local experiences, and daily guided itineraries. Click **Book Now** on any card below to customize your dates and guests!`,
      packages: matched.slice(0, 3)
    };
  }

  // 3. Hill stations
  if (lower.includes("hill") || lower.includes("munnar") || lower.includes("ooty") || lower.includes("coorg") || lower.includes("kodaikanal") || lower.includes("wayanad")) {
    const hills = packages.filter(p => p.category.toLowerCase().includes("hill") || ["munnar", "ooty", "coorg", "kodaikanal", "wayanad"].some(d => p.destination_name.toLowerCase().includes(d)));
    return {
      reply: `The Western Ghats hill stations are pure magic! ⛰️🍃\n\n- **Munnar**: Rolling emerald tea estates, cloud valleys, and Kolukkumalai sunrise safaris.\n- **Ooty**: The historic UNESCO Nilgiri Mountain Toy Train, fragrant pine forests, and botanical gardens.\n- **Coorg**: Lush coffee blossom plantations, Abbey Falls, and Tibetan monasteries.\n- **Wayanad**: Dense rainforests, Banasura dam, and wildlife sanctuaries.\n\nHere are our top hill station packages ready for reservation:`,
      packages: hills.slice(0, 3)
    };
  }

  // 4. Backwaters & Houseboats
  if (lower.includes("backwater") || lower.includes("houseboat") || lower.includes("alleppey") || lower.includes("kumarakom") || lower.includes("kerala")) {
    const water = packages.filter(p => p.category.toLowerCase().includes("backwater") || p.name.toLowerCase().includes("kerala") || p.destination_name.toLowerCase().includes("alleppey"));
    return {
      reply: `A private houseboat cruise through Kerala's tranquil backwaters is an unforgettable experience! ⛵🌴\n\nYou'll glide past coconut groves and paddy fields, enjoy traditional Kerala meals prepared by a private onboard chef, and wake up to serene water sunrises.\n\nCheck out our curated backwater escapes:`,
      packages: water.slice(0, 3)
    };
  }

  // 5. Beaches & Coast
  if (lower.includes("beach") || lower.includes("sea") || lower.includes("goa") || lower.includes("gokarna") || lower.includes("varkala")) {
    const beach = packages.filter(p => p.category.toLowerCase().includes("beach") || ["goa", "gokarna", "varkala"].some(d => p.destination_name.toLowerCase().includes(d)));
    return {
      reply: `Looking for sun, sand, and coastal tranquility? 🏖️🌊\n\n- **Goa**: Sun-kissed shores, Portuguese villas, beachside shacks, and vibrant twilight cruises.\n- **Gokarna**: Peaceful crescent-shaped Om Beach, pristine coves, and cliffside trails.\n- **Varkala**: Spectacular red laterite cliffs towering over the Arabian Sea.\n\nHere are our top beach packages:`,
      packages: beach.slice(0, 3)
    };
  }

  // 6. Heritage, Palaces & Temples
  if (lower.includes("heritage") || lower.includes("temple") || lower.includes("hampi") || lower.includes("mysore") || lower.includes("madurai") || lower.includes("rameswaram")) {
    const heritage = packages.filter(p => p.category.toLowerCase().includes("heritage") || ["hampi", "mysore", "madurai", "rameswaram"].some(d => p.destination_name.toLowerCase().includes(d)));
    return {
      reply: `South India's heritage is carved in stone and bathed in history! 🏛️✨\n\n- **Hampi**: The surreal UNESCO boulder-strewn capital of the 14th-century Vijayanagara Empire.\n- **Mysore**: The majestic illuminated Royal Palace and fragrant sandalwood markets.\n- **Madurai**: The towering sculpted gopurams of the ancient Meenakshi Amman Temple.\n- **Rameswaram**: The historic Pamban cantilever sea bridge and sacred island corridors.\n\nExplore our signature heritage itineraries:`,
      packages: heritage.slice(0, 3)
    };
  }

  // 7. Booking / Payment / Guide Help
  if (lower.includes("how to book") || lower.includes("payment") || lower.includes("gpay") || lower.includes("guide") || lower.includes("cancel")) {
    return {
      reply: `Booking on **Wayfarer** is seamless and 100% secure! 🛡️\n\n1. **Select Package**: Choose your package and customize travelers and dates.\n2. **Enter Details**: Provide guest and transit pickup points.\n3. **Payment**: We support Google Pay (GPay), PhonePe, Paytm, BHIM UPI, Cards, and Net Banking.\n4. **Certified Tour Guide**: Every confirmed tour is assigned a verified regional guide with their contact details visible in your dashboard!\n5. **Instant Slip**: Download an official printable itinerary slip right after payment.`,
      packages: packages.slice(0, 2)
    };
  }

  // 8. General fallback query
  const matched = findRelevantPackages(lower, packages);
  return {
    reply: `I'd love to help you plan that! Wayfarer curates handcrafted journeys across South India's finest destinations with verified guides and luxury stays.\n\nBased on what you mentioned, here are top recommended packages you can explore or book right away:`,
    packages: matched.slice(0, 3)
  };
}

module.exports = router;
