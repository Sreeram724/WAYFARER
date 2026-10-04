mountChrome("Destinations");

function destinationCard(d) {
  return `
    <div class="destination-card" style="border-radius:10px;overflow:hidden;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div class="thumb" style="height:210px;margin-bottom:0;border-radius:0;position:relative;">
          <img src="${escapeHtml(d.image_url)}" alt="${escapeHtml(d.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=800&auto=format&fit=crop';">
          <span style="position:absolute;top:12px;left:12px;background:rgba(15,122,95,0.92);color:#fff;padding:3px 8px;border-radius:4px;font-size:11.5px;font-weight:600;">
            ${escapeHtml(d.region || "South India")}
          </span>
        </div>
        <div style="padding:20px 22px;">
          <div style="font-size:12px;color:var(--teal);font-weight:700;text-transform:uppercase;margin-bottom:4px;">
            ${escapeHtml(d.category)}
          </div>
          <h3 style="font-size:21px;margin-bottom:6px;">${escapeHtml(d.name)}</h3>
          <p style="font-size:13.5px;color:var(--ink);font-weight:500;margin-bottom:8px;">${escapeHtml(d.tagline || "")}</p>
          <p style="font-size:13.5px;color:var(--grey-text);margin:0;line-height:1.45;">${escapeHtml(d.description || "")}</p>
        </div>
      </div>
      <div class="destination-card-footer" style="padding:16px 22px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <a href="packages.html?destination=${encodeURIComponent(d.name)}" class="link-teal" style="font-size:13.5px;font-weight:600;">View Packages &rarr;</a>
        <a href="book.html?destination=${encodeURIComponent(d.name)}" class="btn btn-outline" style="padding:6px 14px;font-size:13px;">Book Trip</a>
      </div>
    </div>`;
}

const grid = document.getElementById("destinations-grid");

async function loadDestinations(category, region) {
  grid.innerHTML = "<p>Loading destinations…</p>";
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (region) params.set("region", region);

    const qs = params.toString() ? "?" + params.toString() : "";
    const destinations = await API.get("/destinations" + qs);
    if (!destinations.length) {
      grid.innerHTML = "<p>No destinations found matching this category.</p>";
      return;
    }
    grid.innerHTML = destinations.map(destinationCard).join("");
  } catch (e) {
    grid.innerHTML = "<p>Couldn't load destinations. Please try again later.</p>";
  }
}

document.getElementById("filter-bar").addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  loadDestinations(chip.dataset.category || "", chip.dataset.region || "");
});

// Check URL category / region params
const urlCategory = new URLSearchParams(location.search).get("category") || "";
const urlRegion = new URLSearchParams(location.search).get("region") || "";

if (urlCategory || urlRegion) {
  document.querySelectorAll(".filter-chip").forEach(c => {
    const matchCat = urlCategory && c.dataset.category === urlCategory;
    const matchReg = urlRegion && c.dataset.region === urlRegion;
    c.classList.toggle("active", matchCat || matchReg);
  });
}

loadDestinations(urlCategory, urlRegion);
