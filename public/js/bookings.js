mountChrome("Bookings");

// If URL has ?package=... redirect immediately to separate booking page
const pkgParam = new URLSearchParams(location.search).get("package");
if (pkgParam) {
  window.location.href = `book.html?package=${encodeURIComponent(pkgParam)}`;
}

// Load packages for booking cards
const grid = document.getElementById("booking-packages-grid");

(async function loadBookingCards() {
  try {
    const packages = await API.get("/packages");
    if (!packages.length) {
      grid.innerHTML = "<p>No packages found.</p>";
      return;
    }

    grid.innerHTML = packages.slice(0, 6).map(p => `
      <div class="package-card" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div class="thumb">
            <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">
          </div>
          <div class="body">
            <div style="font-size:12px;color:var(--teal);font-weight:700;text-transform:uppercase;margin-bottom:4px;">
              ${escapeHtml(p.destination_name || p.category)} · ${escapeHtml(p.duration_label)}
            </div>
            <h3 style="font-size:19px;margin-bottom:6px;">${escapeHtml(p.name)}</h3>
            <p style="font-size:13.5px;color:var(--grey-text);margin:0;line-height:1.4;">
              ${escapeHtml((p.description || "").slice(0, 110))}…
            </p>
          </div>
        </div>
        <div class="package-card-footer" style="padding:14px 22px 18px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);">
          <div>
            <div class="price-label">FROM</div>
            <div class="price-amount" style="font-size:18px;">${money(p.price)}</div>
          </div>
          <a href="book.html?package=${p.id}" class="btn btn-primary" style="padding:8px 16px;font-size:13.5px;">Book Now &rarr;</a>
        </div>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = "<p>Unable to load packages at this time.</p>";
  }
})();
