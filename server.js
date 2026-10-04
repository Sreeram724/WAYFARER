require("dotenv").config();
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
const express = require("express");

const cors = require("cors");
const session = require("express-session");
const path = require("path");

require("./db"); // initializes + seeds the database

const packagesRouter = require("./routes/packages");
const destinationsRouter = require("./routes/destinations");
const bookingsRouter = require("./routes/bookings");
const paymentsRouter = require("./routes/payments");
const adminRouter = require("./routes/admin");
const contactRouter = require("./routes/contact");
const authRouter = require("./routes/auth");
const chatRouter = require("./routes/chat");
const suggestionsRouter = require("./routes/suggestions");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "wayfarer-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: "lax" } // 8 hours
  })
);

// API routes
app.use("/api/packages", packagesRouter);
app.use("/api/destinations", destinationsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/suggestions", suggestionsRouter);

// Root route: First-time access opens Login page directly unless already authenticated
app.get("/", (req, res) => {
  if (req.session && (req.session.userId || req.session.isAdmin)) {
    if (req.session.isAdmin || req.session.role === "admin") {
      return res.redirect("/admin.html");
    }
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  return res.redirect("/login.html");
});

// Guard admin.html: Only admin can access, otherwise redirect
app.get("/admin.html", (req, res, next) => {
  if (!req.session || (!req.session.isAdmin && req.session.role !== "admin")) {
    return res.redirect(req.session && req.session.userId ? "/my-bookings.html" : "/login.html");
  }
  next();
});

// Static frontend (disable caching for local development / real-time updates)
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});
app.use(express.static(path.join(__dirname, "public"), { etag: false, maxAge: 0 }));

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Wayfarer server running at http://localhost:${PORT}`);
});
