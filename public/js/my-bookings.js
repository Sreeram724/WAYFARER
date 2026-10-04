mountChrome("");

const profileMount = document.getElementById("user-profile-mount");
const bookingsMount = document.getElementById("bookings-history-mount");
const suggForm = document.getElementById("suggestion-form");
const suggStatusMsg = document.getElementById("suggestion-status-msg");
const userSuggHistory = document.getElementById("user-suggestions-history");
const userSuggList = document.getElementById("user-suggestions-list");

let currentUser = null;

(async function initUserDashboard() {
  try {
    const session = await API.get("/auth/me");
    if (!session || !session.loggedIn) {
      window.location.href = "login.html?redirect=my-bookings.html";
      return;
    }
    currentUser = session;

    renderUserProfile(session);

    // Pre-fill suggestion form
    const nameInput = document.getElementById("sugg-name");
    const emailInput = document.getElementById("sugg-email");
    if (nameInput) nameInput.value = session.fullName || "";
    if (emailInput) emailInput.value = session.email || session.username || "";

    // Load bookings & previous suggestions
    await loadUserBookings();
    await loadUserSuggestions();
  } catch (err) {
    bookingsMount.innerHTML = `<p style="color:#a13a2c;">Could not load dashboard session: ${escapeHtml(err.message)}</p>`;
  }
})();

function renderUserProfile(u) {
  if (!profileMount) return;
  const initials = (u.fullName || "Traveler").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  profileMount.innerHTML = `
    <div class="user-profile-card" style="border:1px solid var(--border);border-radius:14px;padding:24px 28px;box-shadow:0 3px 16px rgba(0,0,0,0.03);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;">
      <div style="display:flex;align-items:center;gap:18px;">
        <div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg, #0f7a5f 0%, #084d3c 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;letter-spacing:1px;box-shadow:0 4px 14px rgba(15,122,95,0.25);">
          ${escapeHtml(initials)}
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <h2 style="font-size:22px;margin:0;">${escapeHtml(u.fullName || "Traveler")}</h2>
            <span style="font-size:11px;background:#dff3e8;color:var(--teal-dark);padding:3px 9px;border-radius:999px;font-weight:700;letter-spacing:0.04em;">
              ${u.role === "admin" ? "ADMINISTRATOR" : "VERIFIED TRAVELER"}
            </span>
          </div>
          <div style="font-size:13.5px;color:var(--grey-text);display:flex;gap:16px;flex-wrap:wrap;">
            <span>✉️ ${escapeHtml(u.email || u.username || "")}</span>
            ${u.phone ? `<span>📞 ${escapeHtml(u.phone)}</span>` : ""}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;align-items:center;">
        <a href="book.html" class="btn btn-outline" style="font-size:13.5px;padding:8px 16px;">Explore Packages</a>
        <a href="#feedback-section" class="btn btn-primary" style="font-size:13.5px;padding:8px 16px;">Send Feedback</a>
      </div>
    </div>
  `;
}

async function loadUserBookings() {
  try {
    const list = await API.get("/bookings/my-bookings");
    renderBookings(list);
  } catch (err) {
    bookingsMount.innerHTML = `<p style="color:#a13a2c;">Could not load bookings: ${escapeHtml(err.message)}</p>`;
  }
}

function renderBookings(list) {
  if (!list || !list.length) {
    bookingsMount.innerHTML = `
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:48px;text-align:center;box-shadow:0 3px 16px rgba(0,0,0,0.03);">
        <div style="font-size:42px;margin-bottom:12px;">🧭</div>
        <h3 style="font-size:22px;margin-bottom:8px;">No reservations found yet</h3>
        <p style="font-size:14.5px;color:var(--grey-text);max-width:460px;margin:0 auto 24px;">
          You don't have any bookings yet. Browse our handcrafted holiday circuits across Munnar, Alleppey, Coorg, Ooty, Hampi, and beyond!
        </p>
        <a href="packages.html" class="btn btn-primary">Browse All Tour Packages &rarr;</a>
      </div>
    `;
    return;
  }

  bookingsMount.innerHTML = list.map(b => {
    const isPaid = b.payment_status === "paid" || b.status === "confirmed";
    const paymentBadge = isPaid
      ? `<span class="status-pill paid" style="font-weight:700;">PAID (${escapeHtml(b.payment_method || "UPI/Card")})</span>`
      : `<span class="status-pill pending-pay">PAYMENT PENDING</span>`;

    const bookingStatusBadge = b.status === "confirmed"
      ? `<span class="status-pill confirmed">CONFIRMED</span>`
      : (b.status === "cancelled" ? `<span class="status-pill cancelled">CANCELLED</span>` : `<span class="status-pill pending">PENDING</span>`);

    return `
      <div class="booking-card" style="border:1px solid var(--border);border-radius:14px;padding:26px 30px;margin-bottom:24px;box-shadow:0 3px 18px rgba(0,0,0,0.03);">
        
        <!-- Header: Ref & Status -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:14px;">
          <div>
            <span style="font-size:11.5px;color:var(--grey-text);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">BOOKING REFERENCE</span>
            <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--teal-dark);">
              ${escapeHtml(b.booking_reference || `WF-2026-${b.id}`)}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${paymentBadge}
            ${bookingStatusBadge}
          </div>
        </div>

        <!-- Package & Tour Details Grid -->
        <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start;margin-bottom:18px;">
          ${b.package_image ? `
            <div style="width:140px;height:105px;border-radius:10px;overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <img src="${escapeHtml(b.package_image)}" alt="${escapeHtml(b.package_name || "")}" style="width:100%;height:100%;object-fit:cover;">
            </div>
          ` : ""}
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span class="eyebrow" style="color:var(--teal);margin:0;font-size:12px;">${escapeHtml(b.destination_name || "South India")}</span>
              <span style="color:var(--border);">•</span>
              <span style="font-size:12px;color:var(--grey-text);">${escapeHtml(b.duration_label || "Custom Duration")}</span>
            </div>
            <h3 style="font-size:20px;margin:0 0 10px;">${escapeHtml(b.package_name || "Tour Package")}</h3>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px 16px;font-size:13.5px;color:var(--grey-text);">
              <div>📅 <strong>Dates:</strong> ${escapeHtml(b.start_date || "Flexible")} &rarr; ${escapeHtml(b.end_date || "Flexible")}</div>
              <div>👥 <strong>Travelers:</strong> ${b.adults || 1} Adults${b.children ? `, ${b.children} Children` : ""} (${b.rooms || 1} Room${(b.rooms || 1) > 1 ? "s" : ""})</div>
              <div>📍 <strong>Pickup:</strong> ${escapeHtml(b.pickup_location || "Standard")} (${escapeHtml(b.pickup_time || "09:00 AM")})</div>
              <div>🏁 <strong>Drop:</strong> ${escapeHtml(b.drop_location || "Standard")} (${escapeHtml(b.estimated_arrival || "06:00 PM")})</div>
            </div>

            ${b.special_requests ? `
              <div style="margin-top:8px;font-size:12.5px;color:var(--grey-text);background:#faf9f6;padding:6px 12px;border-radius:6px;border:1px solid #ebe8e0;">
                📝 <strong>Special Note:</strong> ${escapeHtml(b.special_requests)}
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Assigned Tour Guide Box (Requirements 10 & 11) -->
        <div class="guide-badge-box">
          <div style="width:48px;height:48px;border-radius:50%;background:#e5f4ee;color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:2px solid var(--teal);">
            🧭
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
              <strong style="font-size:14.5px;color:var(--ink);">${escapeHtml(b.guide_name || "Certified Wayfarer Tour Guide")}</strong>
              <span style="font-size:11px;background:#e5f4ee;color:var(--teal-dark);padding:2px 8px;border-radius:999px;font-weight:700;">
                ${b.guide_name ? "Assigned Tour Guide" : "Assigned On Schedule"}
              </span>
            </div>
            <div style="font-size:12.5px;color:var(--grey-text);display:flex;gap:14px;flex-wrap:wrap;">
              ${b.guide_phone ? `<span>📞 <a href="tel:${escapeHtml(b.guide_phone)}" class="link-teal" style="font-weight:600;">${escapeHtml(b.guide_phone)}</a></span>` : `<span>📞 Contact operations: +91 98765 43210</span>`}
              ${b.guide_email ? `<span>✉️ <a href="mailto:${escapeHtml(b.guide_email)}" class="link-teal">${escapeHtml(b.guide_email)}</a></span>` : `<span>✉️ tours@wayfarer.travel</span>`}
              ${b.guide_experience ? `<span>⭐ ${escapeHtml(b.guide_experience)}</span>` : ""}
              ${b.guide_languages ? `<span>🗣️ ${escapeHtml(b.guide_languages)}</span>` : ""}
            </div>
          </div>
        </div>

        <!-- Footer / Actions / Price -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid #f0eee6;flex-wrap:wrap;gap:12px;">
          <div>
            <span style="font-size:12px;color:var(--grey-text);">Total Fare</span>
            <div style="font-size:19px;font-weight:700;color:var(--teal);">${money(b.total_amount)}</div>
            ${b.transaction_id ? `<span style="font-size:11.5px;color:var(--grey-text);">Txn: <code>${escapeHtml(b.transaction_id)}</code></span>` : ""}
          </div>

          <div style="display:flex;gap:10px;">
            ${isPaid ? `
              <a href="booking-slip.html?booking_id=${b.id}" class="btn btn-outline" style="font-size:13.5px;padding:9px 18px;" target="_blank">
                📄 View Official Itinerary Slip
              </a>
            ` : `
              <a href="payment.html?booking_id=${b.id}" class="btn btn-primary" style="font-size:13.5px;padding:9px 18px;">
                💳 Complete Payment (${money(b.total_amount)}) &rarr;
              </a>
            `}
          </div>
        </div>

      </div>
    `;
  }).join("");
}

// ---------------- USER SUGGESTIONS / FEEDBACK (Requirement 12) ----------------
if (suggForm) {
  suggForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-suggestion");
    const category = document.getElementById("sugg-category").value;
    const name = document.getElementById("sugg-name").value.trim();
    const email = document.getElementById("sugg-email").value.trim();
    const message = document.getElementById("sugg-message").value.trim();

    if (!message) return;

    btn.disabled = true;
    btn.textContent = "Submitting to operations…";
    suggStatusMsg.innerHTML = "";

    try {
      const res = await API.post("/suggestions", {
        category,
        name,
        email,
        message
      });

      suggStatusMsg.innerHTML = `<span style="color:#0f7a5f;font-weight:600;">✅ ${escapeHtml(res.message || "Feedback submitted! Our operations team has received your message.")}</span>`;
      document.getElementById("sugg-message").value = "";

      // Reload user suggestions list
      await loadUserSuggestions();
    } catch (err) {
      suggStatusMsg.innerHTML = `<span style="color:#a13a2c;">⚠️ ${escapeHtml(err.message || "Could not submit feedback. Please try again.")}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit Feedback to Wayfarer →";
    }
  });
}

async function loadUserSuggestions() {
  try {
    const list = await API.get("/suggestions/my-suggestions");
    if (!list || !list.length) {
      if (userSuggHistory) userSuggHistory.style.display = "none";
      return;
    }

    if (userSuggHistory && userSuggList) {
      userSuggHistory.style.display = "block";
      userSuggList.innerHTML = list.map(s => `
        <div style="background:#faf9f6;border:1px solid #ebe8df;border-radius:8px;padding:12px 16px;margin-bottom:10px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <strong style="text-transform:capitalize;">${escapeHtml(s.category)}: ${escapeHtml(s.subject || "Traveler note")}</strong>
            <span style="font-size:11.5px;color:var(--grey-text);">${new Date(s.created_at).toLocaleString("en-IN")}</span>
          </div>
          <p style="margin:0 0 6px;color:var(--ink);">${escapeHtml(s.message)}</p>
          <div style="font-size:11.5px;color:var(--teal);font-weight:600;">Status: ${s.status === "resolved" ? "✅ Resolved" : "👀 Under Admin Review"}</div>
        </div>
      `).join("");
    }
  } catch (err) {
    // Graceful fallback
  }
}
