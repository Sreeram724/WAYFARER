mountChrome("");

let allBookings = [];
let allGuides = [];
let allUsers = [];
let allPackages = [];
let allDestinations = [];
let allSuggestions = [];

// ---------- 1. Auth Verification (Requirement 5) ----------
async function checkAdminSession() {
  try {
    // Check admin session or main session
    let isAdmin = false;
    let loggedInUser = null;

    try {
      const adminMe = await API.get("/admin/me");
      if (adminMe.loggedIn && adminMe.role === "admin") {
        isAdmin = true;
      }
    } catch (e) {}

    if (!isAdmin) {
      const authMe = await API.get("/auth/me");
      if (authMe.loggedIn) {
        loggedInUser = authMe;
        if (authMe.role === "admin") {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      // If regular user tries to open admin dashboard, deny access & redirect to user dashboard
      if (loggedInUser) {
        alert("Access Denied: Only administrators can access the Wayfarer Admin Dashboard. Redirecting to your Traveler Dashboard.");
        window.location.href = "my-bookings.html";
      } else {
        window.location.href = "login.html?redirect=admin.html";
      }
      return;
    }

    // Admin verified! Load all management panels
    loadAllAdminData();
  } catch (err) {
    window.location.href = "login.html";
  }
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await API.post("/admin/logout", {});
  } catch (e) {}
  try {
    await API.post("/auth/logout", {});
  } catch (e) {}
  window.location.href = "login.html";
});

// ---------- 2. Tab Navigation ----------
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("show"));
    tab.classList.add("active");
    const panel = document.getElementById("panel-" + tab.dataset.tab);
    if (panel) panel.classList.add("show");
  });
});

// ---------- 3. Master Data Loader ----------
async function loadAllAdminData() {
  await Promise.all([
    loadStatsAndPopularity(),
    loadMongoStatus(),
    loadGuides(),
    loadBookings(),
    loadUsers(),
    loadSuggestions(),
    loadPackages(),
    loadDestinations(),
    loadPayments()
  ]);
}

// ================= MONGODB STATUS & SYNC =================
async function loadMongoStatus() {
  const banner = document.getElementById("mongo-status-banner");
  if (!banner) return;
  try {
    const res = await API.get("/admin/mongo-status");
    const dot = document.getElementById("mongo-status-dot");
    const text = document.getElementById("mongo-status-text");
    const detail = document.getElementById("mongo-status-detail");
    const syncStatus = document.getElementById("mongo-sync-status");
    if (res.connected) {
      if (dot) dot.style.background = "#10b981";
      if (text) {
        text.textContent = "MongoDB Database Connected";
        text.style.color = "#064e3b";
      }
      const totalDocs = Object.values(res.counts || {}).reduce((a, b) => (typeof b === "number" ? a + b : a), 0);
      if (detail) detail.textContent = `(${totalDocs} records synced across collections)`;
      if (syncStatus) syncStatus.textContent = "Real-time Dual-Write Active";
    } else {
      if (dot) dot.style.background = "#f59e0b";
      if (text) {
        text.textContent = "MongoDB Offline / Pending Connection";
        text.style.color = "#92400e";
      }
      if (detail) detail.textContent = "(SQLite fallback active)";
      if (syncStatus) syncStatus.textContent = "Check MONGODB_URI in .env";
    }
  } catch (err) {
    console.warn("MongoDB status check notice:", err.message);
  }
}

const syncMongoBtn = document.getElementById("btn-sync-mongo");
if (syncMongoBtn) {
  syncMongoBtn.addEventListener("click", async () => {
    syncMongoBtn.disabled = true;
    syncMongoBtn.textContent = "⏳ Syncing...";
    try {
      const res = await API.post("/admin/mongo-sync", {});
      if (res.success) {
        alert("Success! All SQLite tables have been synchronized to MongoDB collections.");
        loadMongoStatus();
      } else {
        alert("Sync Notice: " + (res.error || "Unable to sync"));
      }
    } catch (e) {
      alert("Sync failed: " + e.message);
    } finally {
      syncMongoBtn.disabled = false;
      syncMongoBtn.textContent = "🔄 Sync to MongoDB";
    }
  });
}


// ================= STATS & OVERVIEW =================
async function loadStatsAndPopularity() {
  try {
    const s = await API.get("/admin/stats");
    document.getElementById("stat-total-bookings").textContent = s.bookings || 0;
    document.getElementById("stat-confirmed-bookings").textContent = s.confirmedBookings || 0;
    document.getElementById("stat-pending-bookings").textContent = s.pendingBookings || 0;
    document.getElementById("stat-completed-bookings").textContent = s.completedBookings || 0;
    document.getElementById("stat-total-revenue").textContent = money(s.totalRevenue || 0);
    document.getElementById("stat-total-users").textContent = s.totalUsers || 0;
    document.getElementById("stat-total-guides").textContent = s.guides || 0;
    document.getElementById("stat-total-packages").textContent = s.packages || 0;

    // Render popularity breakdown table
    const popBody = document.getElementById("popularity-tbody");
    if (!s.packagePopularity || !s.packagePopularity.length) {
      popBody.innerHTML = `<tr><td colspan="6">No package reservations recorded yet.</td></tr>`;
      return;
    }

    const maxBookings = Math.max(...s.packagePopularity.map(p => p.bookings_count), 1);
    popBody.innerHTML = s.packagePopularity.map(p => {
      const pct = Math.round((p.bookings_count / maxBookings) * 100);
      return `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.category || "General")}</td>
          <td>${money(p.price)}</td>
          <td><strong>${p.bookings_count}</strong> bookings</td>
          <td style="min-width:160px;">
            <div style="font-size:12px;color:var(--grey-text);margin-bottom:2px;">${p.bookings_count} travelers booked</div>
            <div class="popularity-bar-container">
              <div class="popularity-bar-fill" style="width:${pct}%;"></div>
            </div>
          </td>
          <td><strong style="color:var(--teal);">${money(p.package_revenue)}</strong></td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// ================= TOUR GUIDES (Requirements 10 & 13) =================
async function loadGuides() {
  try {
    allGuides = await API.get("/admin/guides");
    renderGuidesTable(allGuides);
  } catch (err) {
    console.error("Error loading guides:", err);
    document.getElementById("guides-tbody").innerHTML = `<tr><td colspan="8" style="color:#a13a2c;">Could not load guides.</td></tr>`;
  }
}

function renderGuidesTable(list) {
  const tbody = document.getElementById("guides-tbody");
  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="8">No tour guides registered yet. Click "+ Add New Tour Guide" above.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(g => {
    const statusPill = g.status === "available"
      ? `<span class="status-pill paid">AVAILABLE</span>`
      : (g.status === "on-tour" ? `<span class="status-pill confirmed">ON TOUR</span>` : `<span class="status-pill cancelled">ON LEAVE</span>`);

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#e5f4ee;color:var(--teal);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border:1.5px solid var(--teal);flex-shrink:0;">
              ${escapeHtml(g.name.slice(0, 2).toUpperCase())}
            </div>
            <div>
              <strong>${escapeHtml(g.name)}</strong>
              <div style="font-size:11.5px;color:var(--grey-text);">${escapeHtml(g.address || "Certified Guide")}</div>
            </div>
          </div>
        </td>
        <td>
          <div>📞 <a href="tel:${escapeHtml(g.phone)}" class="link-teal">${escapeHtml(g.phone)}</a></div>
          <div style="font-size:12px;color:var(--grey-text);">✉️ ${escapeHtml(g.email || "—")}</div>
        </td>
        <td>${escapeHtml(g.experience || "5+ Years")}</td>
        <td><small>${escapeHtml(g.languages || "English, Hindi")}</small></td>
        <td><strong>${escapeHtml(g.assigned_destination || "All Destinations")}</strong></td>
        <td><strong style="color:var(--teal);">${g.active_tours || 0}</strong> active</td>
        <td>${statusPill}</td>
        <td style="white-space:nowrap;">
          <button type="button" class="icon-btn" onclick="openEditGuideModal(${g.id})">Edit</button>
          <button type="button" class="icon-btn" onclick="deleteGuide(${g.id})" style="color:#a13a2c;">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

// Guide Modal handlers
const guideModal = document.getElementById("guide-modal");
const guideForm = document.getElementById("guide-form");
const btnAddGuide = document.getElementById("btn-add-guide");
const guideModalClose = document.getElementById("guide-modal-close");
const guideCancel = document.getElementById("guide-cancel");

if (btnAddGuide) {
  btnAddGuide.addEventListener("click", () => {
    document.getElementById("guide-modal-title").textContent = "Add Certified Tour Guide";
    document.getElementById("guide-id").value = "";
    guideForm.reset();
    guideModal.classList.add("show");
  });
}

if (guideModalClose) guideModalClose.addEventListener("click", () => guideModal.classList.remove("show"));
if (guideCancel) guideCancel.addEventListener("click", () => guideModal.classList.remove("show"));

window.openEditGuideModal = function(id) {
  const g = allGuides.find(x => x.id === id);
  if (!g) return;
  document.getElementById("guide-modal-title").textContent = "Edit Tour Guide";
  document.getElementById("guide-id").value = g.id;
  document.getElementById("guide-name").value = g.name || "";
  document.getElementById("guide-phone").value = g.phone || "";
  document.getElementById("guide-email").value = g.email || "";
  document.getElementById("guide-experience").value = g.experience || "";
  document.getElementById("guide-languages").value = g.languages || "";
  document.getElementById("guide-destination").value = g.assigned_destination || "";
  document.getElementById("guide-status").value = g.status || "available";
  document.getElementById("guide-address").value = g.address || "";
  document.getElementById("guide-photo").value = g.photo_url || "";
  guideModal.classList.add("show");
};

if (guideForm) {
  guideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("guide-id").value;
    const payload = {
      name: document.getElementById("guide-name").value.trim(),
      phone: document.getElementById("guide-phone").value.trim(),
      email: document.getElementById("guide-email").value.trim(),
      experience: document.getElementById("guide-experience").value.trim(),
      languages: document.getElementById("guide-languages").value.trim(),
      assigned_destination: document.getElementById("guide-destination").value.trim(),
      status: document.getElementById("guide-status").value,
      address: document.getElementById("guide-address").value.trim(),
      photo_url: document.getElementById("guide-photo").value.trim()
    };

    try {
      if (id) {
        await API.put("/admin/guides/" + id, payload);
      } else {
        await API.post("/admin/guides", payload);
      }
      guideModal.classList.remove("show");
      await loadGuides();
      await loadBookings();
    } catch (err) {
      alert("Error saving guide: " + err.message);
    }
  });
}

window.deleteGuide = async function(id) {
  if (!confirm("Are you sure you want to remove this tour guide? Any assigned tours will be unassigned.")) return;
  try {
    await API.del("/admin/guides/" + id);
    await loadGuides();
    await loadBookings();
  } catch (err) {
    alert("Could not remove guide: " + err.message);
  }
};

// ================= BOOKING MANAGEMENT (Requirements 8, 9, 10, 13) =================
async function loadBookings() {
  try {
    allBookings = await API.get("/admin/bookings");
    renderBookingsTable(allBookings);
  } catch (err) {
    try {
      allBookings = await API.get("/bookings");
      renderBookingsTable(allBookings);
    } catch (e2) {
      document.getElementById("bookings-tbody").innerHTML = `<tr><td colspan="9" style="color:#a13a2c;">Could not load bookings.</td></tr>`;
    }
  }
}

function renderBookingsTable(list) {
  const tbody = document.getElementById("bookings-tbody");
  document.getElementById("bookings-count-label").textContent = `Showing ${list.length} booking${list.length !== 1 ? "s" : ""}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9">No bookings found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    const isPaid = b.payment_status === "paid" || b.status === "confirmed";
    const paymentPill = isPaid
      ? `<span class="status-pill paid" title="Paid via ${escapeHtml(b.payment_method || 'UPI')}">PAID</span>`
      : `<span class="status-pill pending-pay">PENDING</span>`;

    const statusPill = `<span class="status-pill ${b.status}">${b.status.toUpperCase()}</span>`;

    // Guide assignment select box
    const guideOptions = `
      <select class="guide-select-inline" onchange="assignTourGuide(${b.id}, this.value)" title="Assign or Change Tour Guide">
        <option value="">-- Assign Guide --</option>
        ${allGuides.map(g => `
          <option value="${g.id}" ${b.guide_id == g.id ? "selected" : ""}>
            ${escapeHtml(g.name)} (${escapeHtml(g.status)})
          </option>
        `).join("")}
      </select>
    `;

    return `
      <tr>
        <td>
          <strong style="font-family:'Playfair Display',serif;color:var(--teal-dark);">${escapeHtml(b.booking_reference || `WF-${b.id}`)}</strong>
          <div style="font-size:11px;color:var(--grey-text);">${new Date(b.created_at || Date.now()).toLocaleDateString("en-IN")}</div>
        </td>
        <td>
          <strong>${escapeHtml(b.full_name)}</strong><br>
          <small style="color:var(--grey-text);">${escapeHtml(b.email)}</small><br>
          <small style="color:var(--grey-text);">${escapeHtml(b.phone || "—")}</small>
        </td>
        <td>
          <strong>${escapeHtml(b.package_name || "Tour Package")}</strong>
          <div style="font-size:12px;color:var(--grey-text);">${escapeHtml(b.destination_name || "South India")} · ${escapeHtml(b.duration_label || "")}</div>
        </td>
        <td>
          <small>${escapeHtml(b.start_date || "Flexible")} &rarr; ${escapeHtml(b.end_date || "")}</small><br>
          <small style="color:var(--grey-text);">${b.adults || 1} Ad, ${b.children || 0} Ch (${b.rooms || 1} Rm)</small>
        </td>
        <td>
          <strong>${money(b.total_amount)}</strong>
          <div style="font-size:11.5px;color:var(--grey-text);">${escapeHtml(b.payment_method || "UPI")}</div>
        </td>
        <td>${paymentPill}</td>
        <td>${statusPill}</td>
        <td>${guideOptions}</td>
        <td style="white-space:nowrap;">
          <button type="button" class="icon-btn" onclick="viewBookingDetails(${b.id})">Details</button>
          ${b.status !== "confirmed" ? `<button type="button" class="icon-btn" onclick="setBookingStatus(${b.id}, 'confirmed')">Confirm</button>` : ""}
          ${b.status !== "completed" ? `<button type="button" class="icon-btn" onclick="setBookingStatus(${b.id}, 'completed')">Complete</button>` : ""}
          ${b.status !== "cancelled" ? `<button type="button" class="icon-btn" onclick="setBookingStatus(${b.id}, 'cancelled')">Cancel</button>` : ""}
          <button type="button" class="icon-btn" onclick="deleteBooking(${b.id})" style="color:#a13a2c;">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

// Search and filter bookings
const bookingsSearch = document.getElementById("bookings-search");
const bookingsFilter = document.getElementById("bookings-status-filter");
const btnRefreshBookings = document.getElementById("btn-refresh-bookings");

function filterBookings() {
  const query = bookingsSearch.value.trim().toLowerCase();
  const status = bookingsFilter.value.toLowerCase();

  const filtered = allBookings.filter(b => {
    const matchQuery = !query ||
      (b.full_name && b.full_name.toLowerCase().includes(query)) ||
      (b.email && b.email.toLowerCase().includes(query)) ||
      (b.phone && b.phone.toLowerCase().includes(query)) ||
      (b.booking_reference && b.booking_reference.toLowerCase().includes(query)) ||
      (b.package_name && b.package_name.toLowerCase().includes(query)) ||
      (b.destination_name && b.destination_name.toLowerCase().includes(query));

    const matchStatus = !status || (b.status && b.status.toLowerCase() === status);
    return matchQuery && matchStatus;
  });

  renderBookingsTable(filtered);
}

if (bookingsSearch) bookingsSearch.addEventListener("input", filterBookings);
if (bookingsFilter) bookingsFilter.addEventListener("change", filterBookings);
if (btnRefreshBookings) btnRefreshBookings.addEventListener("click", loadBookings);

// Assign or Change Tour Guide (Requirement 10)
window.assignTourGuide = async function(bookingId, guideId) {
  try {
    await API.put(`/admin/bookings/${bookingId}/assign-guide`, {
      guide_id: guideId ? parseInt(guideId, 10) : null
    });
    await loadBookings();
    await loadGuides();
  } catch (err) {
    alert("Could not assign guide: " + err.message);
  }
};

window.setBookingStatus = async function(id, status) {
  try {
    await API.put(`/admin/bookings/${id}/status`, { status });
    await loadBookings();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Could not update status: " + err.message);
  }
};

window.deleteBooking = async function(id) {
  if (!confirm("Are you sure you want to delete this booking record permanently?")) return;
  try {
    await API.del("/admin/bookings/" + id);
    await loadBookings();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Could not remove booking: " + err.message);
  }
};

// ================= COMPLETE BOOKING DETAILS MODAL (Requirement 9) =================
window.viewBookingDetails = async function(id) {
  const modal = document.getElementById("booking-detail-modal");
  const content = document.getElementById("booking-detail-content");
  const refHeader = document.getElementById("modal-detail-ref");
  const actionsDiv = document.getElementById("modal-booking-actions");
  const slipBtn = document.getElementById("modal-btn-slip");

  try {
    const b = await API.get("/admin/bookings/" + id);
    refHeader.textContent = `Booking Record: ${b.booking_reference || `WF-${b.id}`}`;
    slipBtn.href = `booking-slip.html?booking_id=${b.id}`;

    // Render all 17 required booking metadata fields
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;font-size:13.5px;margin-bottom:20px;">
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">1. BOOKING ID</span>
          <div><strong>${escapeHtml(b.booking_reference || `WF-${b.id}`)}</strong> (DB #${b.id})</div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">2. BOOKING DATE</span>
          <div>${new Date(b.created_at || Date.now()).toLocaleString("en-IN")}</div>
        </div>

        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">3. CUSTOMER NAME</span>
          <div><strong>${escapeHtml(b.full_name)}</strong></div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">4. CONTACT EMAIL & PHONE</span>
          <div>✉️ ${escapeHtml(b.email)}<br>📞 ${escapeHtml(b.phone || "—")}</div>
        </div>

        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">5. DESTINATION</span>
          <div><strong>${escapeHtml(b.destination_name || "South India")}</strong></div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">6. PACKAGE NAME</span>
          <div><strong>${escapeHtml(b.package_name || "—")}</strong></div>
        </div>

        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">7. TRAVEL DATES</span>
          <div>📅 ${escapeHtml(b.start_date || "Flexible")} to ${escapeHtml(b.end_date || "Flexible")}</div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">8. PERSONS & DURATION</span>
          <div>👥 ${b.adults || 1} Adults, ${b.children || 0} Children (${b.rooms || 1} Rooms)<br>⏱️ Duration: ${escapeHtml(b.duration_label || "Standard")}</div>
        </div>

        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">9. TOTAL FARE BREAKDOWN</span>
          <div>Subtotal: ${money(b.subtotal || b.total_amount)}<br>GST: ${money(b.tax_amount || 0)}<br><strong style="font-size:15px;color:var(--teal);">Total: ${money(b.total_amount)}</strong></div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">10. PAYMENT METHOD & STATUS</span>
          <div>
            Method: <strong>${escapeHtml(b.payment_method || b.paid_via || "UPI")}</strong><br>
            Status: <span class="status-pill ${b.payment_status === 'paid' ? 'paid' : 'pending-pay'}">${(b.payment_status || 'PENDING').toUpperCase()}</span><br>
            Txn: <code>${escapeHtml(b.transaction_id || b.payment_txn_id || "Awaiting Txn")}</code>
          </div>
        </div>

        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">11. PICKUP POINT & TIME</span>
          <div>📍 ${escapeHtml(b.pickup_location || "Standard")} (${escapeHtml(b.pickup_time || "09:00 AM")})</div>
        </div>
        <div>
          <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">12. DROP POINT & ARRIVAL</span>
          <div>🏁 ${escapeHtml(b.drop_location || "Standard")} (${escapeHtml(b.estimated_arrival || "06:00 PM")})</div>
        </div>
      </div>

      <!-- Tour Details / Special Notes -->
      <div style="background:#faf9f6;border:1px solid #ebe8df;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;">
        <span style="font-size:11.5px;color:var(--grey-text);font-weight:700;text-transform:uppercase;">13. TRAVEL & TOUR DETAILS / SPECIAL REQUESTS</span>
        <p style="margin:4px 0 0;color:var(--ink);">${escapeHtml(b.special_requests || b.travel_dates_notes || "Standard tour package with resort accommodation and private vehicle sightseeing included.")}</p>
      </div>

      <!-- Assigned Tour Guide Section (Requirement 10) -->
      <div style="background:#f4f9f6;border:1.5px solid #cce5da;border-radius:10px;padding:14px 18px;">
        <span style="font-size:11.5px;color:var(--teal-dark);font-weight:700;text-transform:uppercase;">14. ASSIGNED TOUR GUIDE</span>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--ink);">🧭 ${escapeHtml(b.guide_name || "No Tour Guide Assigned Yet")}</div>
            <div style="font-size:13px;color:var(--grey-text);margin-top:2px;">
              ${b.guide_phone ? `📞 Phone: <a href="tel:${escapeHtml(b.guide_phone)}" class="link-teal">${escapeHtml(b.guide_phone)}</a>` : ""}
              ${b.guide_email ? ` · ✉️ Email: <a href="mailto:${escapeHtml(b.guide_email)}" class="link-teal">${escapeHtml(b.guide_email)}</a>` : ""}
              ${b.guide_experience ? ` · ⭐ Experience: ${escapeHtml(b.guide_experience)}` : ""}
            </div>
          </div>
          <div>
            <select class="guide-select-inline" onchange="assignTourGuide(${b.id}, this.value); viewBookingDetails(${b.id});">
              <option value="">-- Change Guide --</option>
              ${allGuides.map(g => `<option value="${g.id}" ${b.guide_id == g.id ? "selected" : ""}>${escapeHtml(g.name)} (${escapeHtml(g.status)})</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    `;

    // Actions
    actionsDiv.innerHTML = `
      ${b.status !== "confirmed" ? `<button class="btn btn-primary" onclick="setBookingStatus(${b.id}, 'confirmed'); viewBookingDetails(${b.id});" style="font-size:13px;padding:8px 16px;">Confirm Tour</button>` : ""}
      ${b.status !== "completed" ? `<button class="btn btn-outline" onclick="setBookingStatus(${b.id}, 'completed'); viewBookingDetails(${b.id});" style="font-size:13px;padding:8px 16px;">Mark Completed</button>` : ""}
      ${b.status !== "cancelled" ? `<button class="btn btn-outline" onclick="setBookingStatus(${b.id}, 'cancelled'); viewBookingDetails(${b.id});" style="font-size:13px;padding:8px 16px;color:#a13a2c;">Cancel Tour</button>` : ""}
    `;

    modal.classList.add("show");
  } catch (err) {
    alert("Could not load booking details: " + err.message);
  }
};

document.getElementById("modal-detail-close").addEventListener("click", () => {
  document.getElementById("booking-detail-modal").classList.remove("show");
});

// ================= USER MANAGEMENT (Requirement 13) =================
async function loadUsers() {
  try {
    allUsers = await API.get("/admin/users");
    renderUsersTable(allUsers);
  } catch (err) {
    document.getElementById("users-tbody").innerHTML = `<tr><td colspan="8" style="color:#a13a2c;">Could not load user directory.</td></tr>`;
  }
}

function renderUsersTable(list) {
  const tbody = document.getElementById("users-tbody");
  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="8">No registered users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const rolePill = u.role === "admin"
      ? `<span class="status-pill paid" style="font-weight:700;">ADMIN</span>`
      : `<span class="status-pill confirmed">USER</span>`;

    return `
      <tr>
        <td>#${u.id}</td>
        <td><strong>${escapeHtml(u.full_name || u.username || "Traveler")}</strong></td>
        <td>${escapeHtml(u.email || "—")}</td>
        <td>${escapeHtml(u.phone || "—")}</td>
        <td>${rolePill}</td>
        <td>${new Date(u.created_at || Date.now()).toLocaleDateString("en-IN")}</td>
        <td><strong style="color:var(--teal);">${u.bookings_count || 0}</strong> tours</td>
        <td><strong>${money(u.total_spent || 0)}</strong></td>
      </tr>
    `;
  }).join("");
}

// ================= SUGGESTIONS & FEEDBACK (Requirements 12 & 13) =================
async function loadSuggestions() {
  try {
    allSuggestions = await API.get("/admin/suggestions");
    renderSuggestionsTable(allSuggestions);
  } catch (err) {
    document.getElementById("suggestions-tbody").innerHTML = `<tr><td colspan="8" style="color:#a13a2c;">Could not load suggestions.</td></tr>`;
  }
}

function renderSuggestionsTable(list) {
  const tbody = document.getElementById("suggestions-tbody");
  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="8">No suggestions or complaints submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    let catBadge = "💡 Suggestion";
    if (s.category === "complaint") catBadge = "⚠️ Complaint";
    else if (s.category === "feedback") catBadge = "⭐ Feedback";
    else if (s.category === "request") catBadge = "✈️ Request";

    const statusBadge = s.status === "resolved"
      ? `<span class="status-pill paid">RESOLVED</span>`
      : (s.status === "read" ? `<span class="status-pill confirmed">REVIEWED</span>` : `<span class="status-pill pending-pay">NEW / UNREAD</span>`);

    return `
      <tr>
        <td>#${s.id}</td>
        <td><strong>${catBadge}</strong></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><a href="mailto:${escapeHtml(s.email)}" class="link-teal">${escapeHtml(s.email)}</a></td>
        <td style="max-width:320px;word-break:break-word;">${escapeHtml(s.message)}</td>
        <td><small>${new Date(s.created_at).toLocaleString("en-IN")}</small></td>
        <td>${statusBadge}</td>
        <td style="white-space:nowrap;">
          ${s.status !== "resolved" ? `<button class="icon-btn" onclick="updateSuggestionStatus(${s.id}, 'resolved')">Resolve</button>` : ""}
          ${s.status === "unread" ? `<button class="icon-btn" onclick="updateSuggestionStatus(${s.id}, 'read')">Mark Read</button>` : ""}
          <button class="icon-btn" onclick="deleteSuggestion(${s.id})" style="color:#a13a2c;">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.updateSuggestionStatus = async function(id, status) {
  try {
    await API.put(`/admin/suggestions/${id}/status`, { status });
    await loadSuggestions();
  } catch (err) {
    alert("Could not update status: " + err.message);
  }
};

window.deleteSuggestion = async function(id) {
  if (!confirm("Are you sure you want to delete this traveler message?")) return;
  try {
    await API.del(`/admin/suggestions/${id}`);
    await loadSuggestions();
  } catch (err) {
    alert("Could not delete suggestion: " + err.message);
  }
};

// ================= PACKAGES MANAGEMENT =================
async function loadPackages() {
  try {
    allPackages = await API.get("/packages");
    renderPackagesTable(allPackages);
  } catch (err) {
    document.getElementById("packages-tbody").innerHTML = `<tr><td colspan="8" style="color:#a13a2c;">Could not load packages.</td></tr>`;
  }
}

function renderPackagesTable(list) {
  const tbody = document.getElementById("packages-tbody");
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.destination_name || "—")}</td>
      <td>${escapeHtml(p.duration_label || `${p.duration_days}D`)}</td>
      <td><strong>${money(p.price)}</strong></td>
      <td>${money(p.child_price || Math.round(p.price * 0.5))}</td>
      <td>⭐ ${p.rating || 4.8}</td>
      <td>
        ${p.trending ? '<span class="status-pill confirmed">Trending</span>' : ""}
        ${p.featured ? '<span class="status-pill paid">Featured</span>' : ""}
      </td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="openEditPackageModal(${p.id})">Edit</button>
        <button class="icon-btn" onclick="deletePackage(${p.id})" style="color:#a13a2c;">Delete</button>
      </td>
    </tr>
  `).join("");
}

const pkgModal = document.getElementById("package-modal");
const pkgForm = document.getElementById("package-form");
document.getElementById("add-package-btn").addEventListener("click", () => {
  document.getElementById("package-modal-title").textContent = "Add Package";
  document.getElementById("pkg-id").value = "";
  pkgForm.reset();
  pkgModal.classList.add("show");
});
document.getElementById("package-modal-close").addEventListener("click", () => pkgModal.classList.remove("show"));
document.getElementById("package-cancel").addEventListener("click", () => pkgModal.classList.remove("show"));

window.openEditPackageModal = function(id) {
  const p = allPackages.find(x => x.id === id);
  if (!p) return;
  document.getElementById("package-modal-title").textContent = "Edit Package";
  document.getElementById("pkg-id").value = p.id;
  document.getElementById("pkg-name").value = p.name || "";
  document.getElementById("pkg-category").value = p.category || "Hill Station";
  document.getElementById("pkg-region").value = p.region || "South India";
  document.getElementById("pkg-destination").value = p.destination_name || "";
  document.getElementById("pkg-duration-label").value = p.duration_label || "";
  document.getElementById("pkg-duration-days").value = p.duration_days || 4;
  document.getElementById("pkg-travel-hours").value = p.travel_hours || 4;
  document.getElementById("pkg-price").value = p.price || 0;
  document.getElementById("pkg-child-price").value = p.child_price || 0;
  document.getElementById("pkg-season").value = p.season || "";
  document.getElementById("pkg-rating").value = p.rating || 4.8;
  document.getElementById("pkg-highlights").value = p.highlights || "";
  document.getElementById("pkg-image").value = p.image_url || "";
  document.getElementById("pkg-pickup-locs").value = p.pickup_locations || "";
  document.getElementById("pkg-drop-locs").value = p.drop_locations || "";
  document.getElementById("pkg-accommodation").value = p.accommodation || "";
  document.getElementById("pkg-description").value = p.description || "";
  document.getElementById("pkg-trending").checked = !!p.trending;
  document.getElementById("pkg-featured").checked = !!p.featured;
  pkgModal.classList.add("show");
};

pkgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("pkg-id").value;
  const payload = {
    name: document.getElementById("pkg-name").value.trim(),
    category: document.getElementById("pkg-category").value,
    region: document.getElementById("pkg-region").value,
    destination_name: document.getElementById("pkg-destination").value.trim(),
    duration_label: document.getElementById("pkg-duration-label").value.trim(),
    duration_days: parseInt(document.getElementById("pkg-duration-days").value, 10),
    travel_hours: parseInt(document.getElementById("pkg-travel-hours").value, 10) || 4,
    price: parseInt(document.getElementById("pkg-price").value, 10),
    child_price: parseInt(document.getElementById("pkg-child-price").value, 10) || 0,
    season: document.getElementById("pkg-season").value.trim(),
    rating: parseFloat(document.getElementById("pkg-rating").value) || 4.8,
    highlights: document.getElementById("pkg-highlights").value.trim(),
    image_url: document.getElementById("pkg-image").value.trim(),
    pickup_locations: document.getElementById("pkg-pickup-locs").value.trim(),
    drop_locations: document.getElementById("pkg-drop-locs").value.trim(),
    accommodation: document.getElementById("pkg-accommodation").value.trim(),
    description: document.getElementById("pkg-description").value.trim(),
    trending: document.getElementById("pkg-trending").checked ? 1 : 0,
    featured: document.getElementById("pkg-featured").checked ? 1 : 0
  };

  try {
    if (id) {
      await API.put("/admin/packages/" + id, payload);
    } else {
      await API.post("/admin/packages", payload);
    }
    pkgModal.classList.remove("show");
    await loadPackages();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Error saving package: " + err.message);
  }
});

window.deletePackage = async function(id) {
  if (!confirm("Are you sure you want to remove this package?")) return;
  try {
    await API.del("/admin/packages/" + id);
    await loadPackages();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Could not remove package: " + err.message);
  }
};

// ================= DESTINATIONS MANAGEMENT =================
async function loadDestinations() {
  try {
    allDestinations = await API.get("/destinations");
    renderDestinationsTable(allDestinations);
  } catch (err) {
    document.getElementById("destinations-tbody").innerHTML = `<tr><td colspan="5" style="color:#a13a2c;">Could not load destinations.</td></tr>`;
  }
}

function renderDestinationsTable(list) {
  const tbody = document.getElementById("destinations-tbody");
  tbody.innerHTML = list.map(d => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${escapeHtml(d.image_url || 'assets/destinations/munnar.jpg')}" alt="" style="width:48px;height:36px;object-fit:cover;border-radius:4px;">
          <strong>${escapeHtml(d.name)}</strong>
        </div>
      </td>
      <td>${escapeHtml(d.region || "South India")}</td>
      <td>${escapeHtml(d.category || "General")}</td>
      <td><small>${escapeHtml(d.tagline || "—")}</small></td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="openEditDestinationModal(${d.id})">Edit</button>
        <button class="icon-btn" onclick="deleteDestination(${d.id})" style="color:#a13a2c;">Delete</button>
      </td>
    </tr>
  `).join("");
}

const destModal = document.getElementById("destination-modal");
const destForm = document.getElementById("destination-form");
document.getElementById("add-destination-btn").addEventListener("click", () => {
  document.getElementById("destination-modal-title").textContent = "Add Destination";
  document.getElementById("dest-id").value = "";
  destForm.reset();
  destModal.classList.add("show");
});
document.getElementById("destination-modal-close").addEventListener("click", () => destModal.classList.remove("show"));
document.getElementById("destination-cancel").addEventListener("click", () => destModal.classList.remove("show"));

window.openEditDestinationModal = function(id) {
  const d = allDestinations.find(x => x.id === id);
  if (!d) return;
  document.getElementById("destination-modal-title").textContent = "Edit Destination";
  document.getElementById("dest-id").value = d.id;
  document.getElementById("dest-name").value = d.name || "";
  document.getElementById("dest-category").value = d.category || "Hill Stations";
  document.getElementById("dest-region").value = d.region || "South India";
  document.getElementById("dest-tagline").value = d.tagline || "";
  document.getElementById("dest-image").value = d.image_url || "";
  document.getElementById("dest-description").value = d.description || "";
  destModal.classList.add("show");
};

destForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("dest-id").value;
  const payload = {
    name: document.getElementById("dest-name").value.trim(),
    category: document.getElementById("dest-category").value,
    region: document.getElementById("dest-region").value,
    tagline: document.getElementById("dest-tagline").value.trim(),
    image_url: document.getElementById("dest-image").value.trim(),
    description: document.getElementById("dest-description").value.trim()
  };

  try {
    if (id) {
      await API.put("/admin/destinations/" + id, payload);
    } else {
      await API.post("/admin/destinations", payload);
    }
    destModal.classList.remove("show");
    await loadDestinations();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Error saving destination: " + err.message);
  }
});

window.deleteDestination = async function(id) {
  if (!confirm("Are you sure you want to remove this destination?")) return;
  try {
    await API.del("/admin/destinations/" + id);
    await loadDestinations();
    await loadStatsAndPopularity();
  } catch (err) {
    alert("Could not remove destination: " + err.message);
  }
};

// ================= PAYMENT TRANSACTIONS =================
async function loadPayments() {
  try {
    const list = await API.get("/admin/payments");
    const tbody = document.getElementById("payments-tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8">No payments recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => `
      <tr>
        <td><code style="font-size:12px;font-weight:700;color:var(--teal-dark);">${escapeHtml(p.transaction_id)}</code></td>
        <td><strong>${escapeHtml(p.booking_reference || `WF-${p.booking_id}`)}</strong></td>
        <td>${escapeHtml(p.customer_name || "—")}<br><small style="color:var(--grey-text);">${escapeHtml(p.customer_email || "")}</small></td>
        <td><strong>${escapeHtml(p.payment_method)}</strong></td>
        <td><small>${escapeHtml(p.gateway || "Direct Gateway")}</small></td>
        <td><strong style="color:var(--teal);">${money(p.amount)}</strong></td>
        <td><small>${new Date(p.paid_at).toLocaleString("en-IN")}</small></td>
        <td><span class="status-pill paid">PAID</span></td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error loading payments:", err);
  }
}

// Start admin authentication and data loading
checkAdminSession();
