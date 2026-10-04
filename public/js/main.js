// ---------- API helper ----------
const API = {
  base: "/api",
  async get(path) {
    const res = await fetch(this.base + path, { credentials: "include" });
    if (!res.ok) throw await this._err(res);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(this.base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await this._err(res);
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(this.base + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await this._err(res);
    return res.json();
  },
  async del(path) {
    const res = await fetch(this.base + path, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw await this._err(res);
    return res.json();
  },
  async _err(res) {
    try {
      const data = await res.json();
      return new Error(data.error || "Request failed");
    } catch {
      return new Error("Request failed");
    }
  }
};

// ---------- Header / Footer ----------
function renderHeader(active) {
  const links = [
    { href: "index.html", label: "Home" },
    { href: "packages.html", label: "Packages" },
    { href: "destinations.html", label: "Destinations" },
    { href: "book.html", label: "Book Trip" },
    { href: "contact.html", label: "Contact" }
  ];
  const navHtml = links.map(l =>
    `<a href="${l.href}" class="${active === l.label ? "active" : ""}">${l.label}</a>`
  ).join("");

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const logoSrc = currentTheme === "dark" ? "assets/wayfarer-logo-white.svg" : "assets/wayfarer-logo.svg";

  return `
  <header class="site-header">
    <div class="container">
      <a href="index.html" class="logo" aria-label="Wayfarer home"><img id="site-logo-img" src="${logoSrc}" alt="Wayfarer"></a>
      <div class="nav-links">${navHtml}</div>
      <div class="nav-right" style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle Dark or Light Mode" title="Toggle theme">
          <span id="theme-toggle-icon">🌙</span>
        </button>
        <a href="book.html" class="btn btn-primary">Book Now</a>
        <span id="auth-nav"></span>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-logo"><img src="assets/wayfarer-logo-white.svg" alt="Wayfarer"></div>
          <p style="color:#a8a196;font-size:13.5px;margin-bottom:18px;">Handcrafted tour packages across South India and signature cultural journeys across India.</p>
          <div class="footer-social">
            <a href="#" aria-label="Instagram">IG</a>
            <a href="#" aria-label="Facebook">FB</a>
            <a href="#" aria-label="X">X</a>
            <a href="#" aria-label="YouTube">YT</a>
          </div>
          <div class="footer-contact-item">
            <div>
              <strong>Email</strong>
              hello@wayfarer.travel
            </div>
          </div>
          <div class="footer-contact-item">
            <div>
              <strong>Phone</strong>
              +91 98765 43210
            </div>
          </div>
        </div>
        <div class="footer-col">
          <h5>Explore</h5>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="packages.html">Packages</a></li>
            <li><a href="destinations.html">Destinations</a></li>
            <li><a href="book.html">Book Trip</a></li>
            <li><a href="contact.html">Contact Us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Popular destinations</h5>
          <ul id="footer-destinations">
            <li><a href="destinations.html">Munnar</a></li>
            <li><a href="destinations.html">Alleppey</a></li>
            <li><a href="destinations.html">Wayanad</a></li>
            <li><a href="destinations.html">Hampi</a></li>
            <li><a href="destinations.html">Ooty</a></li>
            <li><a href="destinations.html">Varanasi</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Traveler portal</h5>
          <ul>
            <li><a href="login.html">Traveler sign in</a></li>
            <li><a href="my-bookings.html">My bookings</a></li>
            <li><a href="book.html">Book a package</a></li>
            <li><a href="admin-login.html">Admin portal</a></li>
          </ul>
        </div>
        <div class="footer-cta">
          <h5>Ready to explore India?</h5>
          <p>Browse handcrafted packages or start your multi-step booking now.</p>
          <a href="book.html" class="btn btn-white">Book a trip</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 Wayfarer Travel Booking Pvt. Ltd. All rights reserved.</span>
        <span><a href="admin-login.html">Admin Login</a> · <a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a></span>
      </div>
    </div>
  </footer>`;
}

// ---------- Theme Management (Requirement 2) ----------
function updateThemeLogo(theme) {
  const logos = document.querySelectorAll("#site-logo-img, .site-header .logo img");
  logos.forEach(img => {
    img.src = theme === "dark" ? "assets/wayfarer-logo-white.svg" : "assets/wayfarer-logo.svg";
  });
}

function initTheme() {
  const saved = localStorage.getItem("wayfarer_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
  updateThemeLogo(saved);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.classList.add("theme-transition");
  document.documentElement.setAttribute("data-theme", current);
  localStorage.setItem("wayfarer_theme", current);
  updateThemeIcon(current);
  updateThemeLogo(current);
  setTimeout(() => {
    document.documentElement.classList.remove("theme-transition");
  }, 400);
}

initTheme();

function mountChrome(active) {
  const h = document.getElementById("header-mount");
  if (h) h.innerHTML = renderHeader(active);
  const f = document.getElementById("footer-mount");
  if (f) f.innerHTML = renderFooter();

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  updateThemeLogo(currentTheme);

  // Attach theme toggle button
  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
    updateThemeIcon(currentTheme);
  }

  // Inject AI Chatbot Widget (Requirement 1)
  initAIChatbot();

  refreshAuthNav();
}

async function refreshAuthNav() {
  const authNav = document.getElementById("auth-nav");
  if (!authNav) return;
  try {
    const session = await API.get("/auth/me");
    if (!session.loggedIn) {
      authNav.innerHTML = `
        <a href="login.html" class="auth-link">Sign in</a>
      `;
      return;
    }

    if (session.role === "admin") {
      authNav.innerHTML = `
        <a href="admin.html" class="auth-link" style="color:var(--teal);margin-right:12px;font-weight:700;">Admin Dashboard</a>
        <button type="button" class="auth-link auth-button" id="header-logout-btn">Log out</button>
      `;
    } else {
      const displayName = session.fullName ? session.fullName.split(" ")[0] : "Traveler";
      authNav.innerHTML = `
        <a href="my-bookings.html" class="auth-link" style="margin-right:14px;">My Bookings</a>
        <span style="font-size:13px;color:var(--grey-text);margin-right:10px;">Hi, ${escapeHtml(displayName)}</span>
        <button type="button" class="auth-link auth-button" id="header-logout-btn">Log out</button>
      `;
    }

    const logoutBtn = document.getElementById("header-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await API.post("/auth/logout", {});
        window.location.href = "login.html";
      });
    }
  } catch {
    authNav.innerHTML = '<a href="login.html" class="auth-link">Sign in</a>';
  }
}

// ---------- Interactive AI Chatbot Concierge (Requirement 1) ----------
function initAIChatbot() {
  if (document.getElementById("wayfarer-chat-fab")) return;

  const chatRoot = document.createElement("div");
  chatRoot.id = "wayfarer-chat-root";
  chatRoot.innerHTML = `
    <!-- Floating AI launcher button -->
    <button type="button" class="wayfarer-chat-fab" id="wayfarer-chat-fab" aria-label="Open Wayfarer AI Travel Assistant">
      <span class="sparkle">✨</span>
      <span>AI Travel Guide</span>
    </button>

    <!-- Chat drawer window -->
    <div class="wayfarer-chat-window" id="wayfarer-chat-window" role="dialog" aria-label="Wayfarer AI Chat Assistant">
      <div class="chat-header">
        <div class="chat-header-title">
          <div class="chat-status-dot"></div>
          <div>
            <div style="font-weight:700;font-size:14.5px;">Wayfarer AI Concierge</div>
            <div style="font-size:11px;opacity:0.85;">24/7 Intelligent Tour Planner</div>
          </div>
        </div>
        <button type="button" class="chat-close-btn" id="chat-close-btn" aria-label="Close Chat">&times;</button>
      </div>

      <div class="chat-messages" id="chat-messages-container">
        <!-- Welcome Message -->
        <div class="chat-msg bot">
          <p style="margin:0 0 6px;"><strong>Namaste &amp; Welcome to Wayfarer! 🌿✨</strong></p>
          <p style="margin:0 0 8px;">I can answer general questions and guide you when planning your trip. Tell me your <strong>budget, number of travelers, dates, or destination preferences</strong>!</p>
          <div style="font-size:11.5px;color:var(--grey-text);margin-bottom:6px;">Quick suggestions:</div>
          <div class="chat-suggestion-chips">
            <span class="chat-chip" data-query="Plan a 3-day Munnar trip for 2 people">🌿 Munnar 3-Day Trip</span>
            <span class="chat-chip" data-query="Suggest best packages under ₹15,000">💰 Under ₹15,000</span>
            <span class="chat-chip" data-query="What are the best beach destinations?">🏖️ Beach Destinations</span>
            <span class="chat-chip" data-query="Alleppey houseboat tour for family">🛶 Alleppey Houseboat</span>
          </div>
        </div>
      </div>

      <div class="chat-input-bar">
        <input type="text" class="chat-input-field" id="chat-input-field" placeholder="Ask about destinations, budget, or planning…" autocomplete="off">
        <button type="button" class="chat-send-btn" id="chat-send-btn">Send &rarr;</button>
      </div>
    </div>
  `;

  document.body.appendChild(chatRoot);
  wireChatbotEvents();
}

function wireChatbotEvents() {
  const fab = document.getElementById("wayfarer-chat-fab");
  const win = document.getElementById("wayfarer-chat-window");
  const closeBtn = document.getElementById("chat-close-btn");
  const input = document.getElementById("chat-input-field");
  const sendBtn = document.getElementById("chat-send-btn");
  const container = document.getElementById("chat-messages-container");

  if (!fab || !win) return;

  fab.addEventListener("click", () => {
    win.classList.toggle("open");
    if (win.classList.contains("open")) {
      setTimeout(() => input && input.focus(), 250);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => win.classList.remove("open"));
  }

  // Chips click listener
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".chat-chip");
    if (!chip) return;
    const query = chip.getAttribute("data-query");
    if (query) {
      sendChatMessage(query);
    }
  });

  // Send button & enter key
  sendBtn.addEventListener("click", () => {
    const q = input.value.trim();
    if (q) sendChatMessage(q);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const q = input.value.trim();
      if (q) sendChatMessage(q);
    }
  });

  async function sendChatMessage(query) {
    input.value = "";

    // 1. Add user message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.textContent = query;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    // 2. Add typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "chat-msg bot";
    typingIndicator.innerHTML = `<em>Consulting Wayfarer itineraries &amp; catalog…</em>`;
    container.appendChild(typingIndicator);
    container.scrollTop = container.scrollHeight;

    try {
      const res = await API.post("/chat", { message: query });
      typingIndicator.remove();

      // Format markdown (bold, lists)
      const formattedReply = escapeHtml(res.reply || "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n- /g, "<br>• ");

      const botMsg = document.createElement("div");
      botMsg.className = "chat-msg bot";
      botMsg.innerHTML = `<div>${formattedReply}</div>`;

      // If recommendations returned, add package cards
      if (res.packages && res.packages.length > 0) {
        const pkgCardsWrapper = document.createElement("div");
        pkgCardsWrapper.style.marginTop = "10px";
        pkgCardsWrapper.innerHTML = res.packages.map(p => `
          <div class="chat-pkg-card">
            <img src="${escapeHtml(p.image_url || 'assets/destinations/munnar.jpg')}" alt="${escapeHtml(p.name)}" class="chat-pkg-img">
            <div class="chat-pkg-info">
              <strong>${escapeHtml(p.name)}</strong>
              <div>${escapeHtml(p.destination_name || "")} · ${escapeHtml(p.duration_label || "3N/4D")}</div>
              <span>${money(p.price)}</span> / person
            </div>
            <a href="book.html?package=${p.id}" class="chat-pkg-book-btn">Book Now &rarr;</a>
          </div>
        `).join("");
        botMsg.appendChild(pkgCardsWrapper);
      }

      container.appendChild(botMsg);
    } catch (err) {
      typingIndicator.remove();
      const errMsg = document.createElement("div");
      errMsg.className = "chat-msg bot";
      errMsg.innerHTML = `<span style="color:#a13a2c;">I'm momentarily having trouble connecting. You can explore all our packages on the <a href="packages.html" style="text-decoration:underline;">Packages Page</a>.</span>`;
      container.appendChild(errMsg);
    }

    container.scrollTop = container.scrollHeight;
  }
}

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

// Global Interactive Tactile Button Ripple & Transitions
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn, .btn-quick-view, .btn-card-book, .filter-chip, .payment-method-item, .btn-step-next, .btn-step-prev");
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const wave = document.createElement("span");
  wave.className = "btn-ripple-wave";
  const size = Math.max(rect.width, rect.height);
  wave.style.width = wave.style.height = `${size}px`;
  wave.style.left = `${e.clientX - rect.left - size / 2}px`;
  wave.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
}, { passive: true });
