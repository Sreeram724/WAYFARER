mountChrome("Home");

function packageCard(p) {
  const fallbackImg = "assets/destinations/kerala.jpg";
  const highlights = (p.highlights || "")
    .split(",")
    .map(h => h.trim())
    .filter(Boolean)
    .slice(0, 2);

  return `
    <div class="package-card">
      <div>
        <div class="thumb">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImg}';">
          <span class="pkg-badge-region">📍 ${escapeHtml(p.region || "South India")}</span>
          <span class="pkg-badge-trending">🔥 Trending</span>
          <span class="pkg-badge-duration">⏱ ${escapeHtml(p.duration_label || `${p.duration_days}D`)}</span>
        </div>
        <div class="body">
          <div class="cat-eyebrow">
            ${escapeHtml(p.destination_name || "South India")} · ${escapeHtml(p.category)}
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="meta-row">
            <span class="meta-rating">★ ${p.rating || 4.9}</span>
            <span>· ${p.travel_hours ? `${p.travel_hours} travel hrs` : `${p.duration_days} Days`}</span>
            <span>· Best: ${escapeHtml(p.season || "All year")}</span>
          </div>

          ${highlights.length ? `
            <div class="highlights-row">
              ${highlights.map(h => `<span class="highlight-tag">✓ ${escapeHtml(h)}</span>`).join("")}
            </div>
          ` : ""}

          <div class="features-strip">
            <span>🏨 4★ Hotel</span>
            <span>🚗 Private AC Cab</span>
            <span>🗺 Guided Tour</span>
          </div>

          <p class="desc">
            ${escapeHtml(p.description || "")}
          </p>
        </div>
      </div>
      <div class="package-card-footer">
        <div>
          <div class="price-label">Starting From</div>
          <div class="price-amount">${money(p.price)}</div>
          <div class="price-tax">per person · incl. taxes</div>
        </div>
        <div class="card-actions">
          <a href="packages.html?q=${encodeURIComponent(p.destination_name || p.name)}" class="btn-quick-view">Details</a>
          <a href="book.html?package=${p.id}" class="btn-card-book">Book Now &rarr;</a>
        </div>
      </div>
    </div>`;
}

(async function loadTrending() {
  const grid = document.getElementById("trending-grid");
  if (!grid) return;
  try {
    const packages = await API.get("/packages?trending=1");
    if (!packages.length) {
      grid.innerHTML = "<p>No trending packages right now — check back soon.</p>";
      return;
    }
    // Show top 3 trending packages (now all rich, high-res, verified)
    grid.innerHTML = packages.slice(0, 3).map(packageCard).join("");
  } catch (e) {
    grid.innerHTML = "<p>Couldn't load packages. Please try again later.</p>";
  }
})();
