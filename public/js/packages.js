mountChrome("Packages");

let currentPackages = [];
let allPackagesMaster = [];
let activeCategory = "";
let activeRegion = "";
let activeDestination = "";
let searchQuery = "";
let currentSort = "featured";

// DOM Elements
const grid = document.getElementById("packages-grid");
const searchInput = document.getElementById("pkg-search-input");
const searchClearBtn = document.getElementById("pkg-search-clear");
const sortSelect = document.getElementById("pkg-sort-select");
const filterBar = document.getElementById("filter-bar");
const showingCountEl = document.getElementById("packages-showing-count");
const resetFiltersBtn = document.getElementById("btn-reset-filters");

// Modal Elements
const modalOverlay = document.getElementById("itinerary-modal-overlay");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalImg = document.getElementById("modal-img");
const modalEyebrow = document.getElementById("modal-eyebrow");
const modalTitle = document.getElementById("modal-title");
const modalDuration = document.getElementById("modal-duration");
const modalRating = document.getElementById("modal-rating");
const modalSeason = document.getElementById("modal-season");
const modalDesc = document.getElementById("modal-desc");
const modalTags = document.getElementById("modal-tags");
const modalTimeline = document.getElementById("modal-timeline");
const modalInfoBox = document.getElementById("modal-info-box");
const modalPrice = document.getElementById("modal-price");
const modalBookBtn = document.getElementById("modal-book-btn");

function renderSkeletons() {
  const skel = `
    <div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="width:40%;"></div>
        <div class="skeleton-line" style="width:85%;height:20px;"></div>
        <div class="skeleton-line" style="width:60%;"></div>
        <div class="skeleton-line" style="width:100%;margin-top:14px;"></div>
        <div class="skeleton-line" style="width:90%;"></div>
      </div>
    </div>
  `;
  grid.innerHTML = skel + skel + skel;
}

function packageCard(p) {
  const highlights = (p.highlights || "")
    .split(",")
    .map(h => h.trim())
    .filter(Boolean)
    .slice(0, 3);

  const fallbackImg = "assets/destinations/kerala.jpg";

  return `
    <div class="package-card" data-id="${p.id}">
      <div>
        <div class="thumb">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackImg}';">
          <span class="pkg-badge-region">📍 ${escapeHtml(p.region || "South India")}</span>
          ${p.trending ? '<span class="pkg-badge-trending">🔥 Trending</span>' : ''}
          <span class="pkg-badge-duration">⏱ ${escapeHtml(p.duration_label || `${p.duration_days}D`)}</span>
        </div>
        <div class="body">
          <div class="cat-eyebrow">
            ${escapeHtml(p.destination_name || "India")} · ${escapeHtml(p.category)}
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          
          <div class="meta-row">
            <span class="meta-rating">★ ${p.rating || 4.8}</span>
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
            <span>🗺 Daily Tours</span>
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
          <div class="price-tax">per traveler · incl. taxes</div>
        </div>
        <div class="card-actions">
          <button type="button" class="btn-quick-view" onclick="openItineraryModal(${p.id})">View Itinerary</button>
          <a href="book.html?package=${p.id}" class="btn-card-book">Book Now &rarr;</a>
        </div>
      </div>
    </div>
  `;
}

function updateChipCounts(packages) {
  const allCount = packages.length;
  const southCount = packages.filter(p => (p.region || "").toLowerCase().includes("south")).length;
  const northCount = packages.filter(p => (p.region || "").toLowerCase().includes("north")).length;
  const hillsCount = packages.filter(p => (p.category || "").toLowerCase().includes("hill")).length;
  const backwatersCount = packages.filter(p => (p.category || "").toLowerCase().includes("backwater")).length;
  const heritageCount = packages.filter(p => (p.category || "").toLowerCase().includes("heritage")).length;
  const beachesCount = packages.filter(p => (p.category || "").toLowerCase().includes("beach")).length;

  const setEl = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };

  setEl("count-all", allCount);
  setEl("count-south", southCount);
  setEl("count-north", northCount);
  setEl("count-hills", hillsCount);
  setEl("count-backwaters", backwatersCount);
  setEl("count-heritage", heritageCount);
  setEl("count-beaches", beachesCount);
}

async function loadPackages() {
  renderSkeletons();
  try {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (activeRegion) params.set("region", activeRegion);
    if (activeDestination) params.set("destination", activeDestination);
    if (searchQuery) params.set("q", searchQuery);
    if (currentSort) params.set("sort", currentSort);

    const qs = params.toString() ? "?" + params.toString() : "";
    const packages = await API.get("/packages" + qs);
    currentPackages = packages;

    // Cache master copy on initial load for count pills
    if (!allPackagesMaster.length && !activeCategory && !activeRegion && !activeDestination && !searchQuery) {
      allPackagesMaster = packages;
      updateChipCounts(allPackagesMaster);
    }

    renderGrid(packages);
    updateStatusLine(packages.length);
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);">
        <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
        <h3 style="font-size:20px;margin-bottom:8px;">Couldn't load packages</h3>
        <p style="font-size:14px;color:var(--grey-text);max-width:440px;margin:0 auto 18px;">We encountered an issue fetching tour packages. Please try refreshing.</p>
        <button type="button" class="btn btn-primary" onclick="loadPackages()">Retry</button>
      </div>
    `;
  }
}

function renderGrid(packages) {
  if (!packages || !packages.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);">
        <div style="font-size:42px;margin-bottom:12px;">🔍</div>
        <h3 style="font-size:22px;margin-bottom:8px;">No packages found</h3>
        <p style="font-size:14.5px;color:var(--grey-text);max-width:440px;margin:0 auto 20px;">
          No tour packages match your current filter or search criteria.
        </p>
        <button type="button" class="btn btn-primary" onclick="resetAllFilters()">View All Packages</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = packages.map(packageCard).join("");
}

function updateStatusLine(count) {
  if (showingCountEl) showingCountEl.textContent = count;
  const hasActiveFilters = Boolean(activeCategory || activeRegion || activeDestination || searchQuery);
  if (resetFiltersBtn) {
    resetFiltersBtn.style.display = hasActiveFilters ? "inline-block" : "none";
  }
}

function resetAllFilters() {
  activeCategory = "";
  activeRegion = "";
  activeDestination = "";
  searchQuery = "";
  if (searchInput) searchInput.value = "";
  if (searchClearBtn) searchClearBtn.style.display = "none";
  if (sortSelect) sortSelect.value = "featured";
  currentSort = "featured";

  document.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", !c.dataset.category && !c.dataset.region);
  });

  const url = new URL(location);
  url.search = "";
  history.replaceState({}, "", url);

  loadPackages();
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener("click", resetAllFilters);
}

// Filter Chip Click
filterBar.addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;

  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");

  activeCategory = chip.dataset.category || "";
  activeRegion = chip.dataset.region || "";
  activeDestination = ""; // Clear specific destination when switching chips

  loadPackages();
});

// Search input handling
let debounceTimer;
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value.trim();
    searchClearBtn.style.display = val ? "block" : "none";

    debounceTimer = setTimeout(() => {
      searchQuery = val;
      loadPackages();
    }, 280);
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchClearBtn.style.display = "none";
    searchQuery = "";
    loadPackages();
  });
}

// Sort dropdown handling
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    loadPackages();
  });
}

// Modal handling
window.openItineraryModal = function(packageId) {
  const p = currentPackages.find(item => item.id === packageId) ||
            allPackagesMaster.find(item => item.id === packageId);
  if (!p) return;

  modalImg.src = p.image_url;
  modalImg.onerror = function() {
    this.onerror = null;
    this.src = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop";
  };

  modalEyebrow.textContent = `${p.destination_name || "India"} · ${p.category} · ${p.region || "South India"}`;
  modalTitle.textContent = p.name;
  modalDuration.textContent = `⏱ ${p.duration_label}`;
  modalRating.textContent = `★ ${p.rating || 4.8} / 5.0`;
  modalSeason.textContent = `Best Season: ${p.season || "All year"}`;
  modalDesc.textContent = p.description || "";
  modalPrice.textContent = money(p.price);
  modalBookBtn.href = `book.html?package=${p.id}`;

  // Highlights tags
  const highlights = (p.highlights || "").split(",").map(h => h.trim()).filter(Boolean);
  modalTags.innerHTML = highlights.map(h => `<span class="highlight-tag" style="font-size:12px;padding:4px 10px;">✓ ${escapeHtml(h)}</span>`).join("");

  // Timeline
  let itineraryList = p.parsed_itinerary;
  if (!itineraryList && p.itinerary) {
    try {
      itineraryList = typeof p.itinerary === "string" ? JSON.parse(p.itinerary) : p.itinerary;
    } catch (e) {
      itineraryList = null;
    }
  }

  if (Array.isArray(itineraryList) && itineraryList.length) {
    modalTimeline.innerHTML = itineraryList.map((dayItem, idx) => `
      <div class="timeline-item">
        <div class="timeline-badge">Day ${dayItem.day || idx + 1}</div>
        <div class="timeline-content">
          <h5>${escapeHtml(dayItem.title || `Day ${idx + 1}`)}</h5>
          <p>${escapeHtml(dayItem.details || "")}</p>
        </div>
      </div>
    `).join("");
  } else {
    modalTimeline.innerHTML = `
      <div class="timeline-item">
        <div class="timeline-badge">Overview</div>
        <div class="timeline-content">
          <h5>Complete Multi-Day Guided Circuit</h5>
          <p>${escapeHtml(p.description || "Detailed schedule provided upon confirmation with private chauffeur.")}</p>
        </div>
      </div>
    `;
  }

  // Logistics & Accommodation
  modalInfoBox.innerHTML = `
    ${p.accommodation ? `<div>🏨 <strong>Accommodation:</strong> ${escapeHtml(p.accommodation)}</div>` : ''}
    ${p.pickup_locations ? `<div>🚖 <strong>Pickup Available:</strong> ${escapeHtml(p.pickup_locations)}</div>` : ''}
    ${p.drop_locations ? `<div>🏁 <strong>Drop-off Points:</strong> ${escapeHtml(p.drop_locations)}</div>` : ''}
    <div>🏷 <strong>Child Pricing:</strong> ${p.child_price ? `${money(p.child_price)} (5-11 yrs)` : '50% of adult fare'}</div>
  `;

  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
};

function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay.classList.contains("open")) {
    closeModal();
  }
});

// Parse Initial URL Query Params
const urlParams = new URLSearchParams(location.search);
const urlCategory = urlParams.get("category") || "";
const urlRegion = urlParams.get("region") || "";
const urlDestination = urlParams.get("destination") || "";
const urlQuery = urlParams.get("q") || "";

if (urlCategory) {
  // Normalize plural if passed e.g. "Hill Stations" -> "Hill Station"
  let matched = false;
  document.querySelectorAll(".filter-chip").forEach(c => {
    const chipCat = (c.dataset.category || "").toLowerCase();
    const queryCat = urlCategory.toLowerCase();
    if (chipCat && (queryCat.includes(chipCat) || chipCat.includes(queryCat))) {
      c.classList.add("active");
      activeCategory = c.dataset.category;
      matched = true;
    } else {
      c.classList.remove("active");
    }
  });
  if (!matched) activeCategory = urlCategory;
}

if (urlRegion) {
  document.querySelectorAll(".filter-chip").forEach(c => {
    if (c.dataset.region && c.dataset.region.toLowerCase() === urlRegion.toLowerCase()) {
      c.classList.add("active");
      activeRegion = c.dataset.region;
    } else if (c.dataset.region) {
      c.classList.remove("active");
    }
  });
}

if (urlDestination) {
  activeDestination = urlDestination;
}

if (urlQuery) {
  searchQuery = urlQuery;
  if (searchInput) {
    searchInput.value = urlQuery;
    if (searchClearBtn) searchClearBtn.style.display = "block";
  }
}

// Initial Load
loadPackages();
