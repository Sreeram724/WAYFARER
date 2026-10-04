mountChrome("Book Trip");

let allPackages = [];
let selectedPackage = null;
let currentStep = 1;

// DOM Elements
const packageSelector = document.getElementById("package-selector");
const packageShowcaseMount = document.getElementById("package-showcase-mount");
const step1Pane = document.getElementById("pane-step-1");
const step2Pane = document.getElementById("pane-step-2");
const step3Pane = document.getElementById("pane-step-3");
const step1Indicator = document.getElementById("step-indicator-1");
const step2Indicator = document.getElementById("step-indicator-2");
const step3Indicator = document.getElementById("step-indicator-3");

const travelerForm = document.getElementById("traveler-details-form");
const step3SummaryMount = document.getElementById("step-3-summary-mount");
const errorMsg = document.getElementById("wizard-error-msg");

// Form inputs
const inputName = document.getElementById("traveler-name");
const inputEmail = document.getElementById("traveler-email");
const inputPhone = document.getElementById("traveler-phone");
const inputStartDate = document.getElementById("travel-start-date");
const inputEndDate = document.getElementById("travel-end-date");
const selectAdults = document.getElementById("num-adults");
const selectChildren = document.getElementById("num-children");
const selectRooms = document.getElementById("num-rooms");
const inputPickupLoc = document.getElementById("pickup-location");
const inputDropLoc = document.getElementById("drop-location");
const selectPickupTime = document.getElementById("pickup-time");
const inputSpecialReq = document.getElementById("special-requests");

// Sidebar live summary elements
const sidebarPkgTitle = document.getElementById("sidebar-pkg-title");
const sidebarDuration = document.getElementById("sidebar-duration");
const sidebarDest = document.getElementById("sidebar-dest");
const sidebarTravelers = document.getElementById("sidebar-travelers");
const labelAdultPrice = document.getElementById("label-adult-price");
const valAdultPrice = document.getElementById("val-adult-price");
const rowChildPrice = document.getElementById("row-child-price");
const labelChildPrice = document.getElementById("label-child-price");
const valChildPrice = document.getElementById("val-child-price");
const valSubtotal = document.getElementById("val-subtotal");
const valTax = document.getElementById("val-tax");
const valGrandTotal = document.getElementById("val-grand-total");

// Coupon elements
let appliedCouponCode = null;
let couponDiscountAmount = 0;
const rowBookDiscount = document.getElementById("row-book-discount");
const bookCouponCode = document.getElementById("book-coupon-code");
const valDiscount = document.getElementById("val-discount");
const bookCouponInput = document.getElementById("book-coupon-input");
const btnBookApplyCoupon = document.getElementById("btn-book-apply-coupon");
const bookCouponStatus = document.getElementById("book-coupon-status");

// Pre-fill user data if logged in
(async function prefillUser() {
  try {
    const session = await API.get("/auth/me");
    if (session.loggedIn) {
      if (session.fullName && !inputName.value) inputName.value = session.fullName;
      if (session.email && !inputEmail.value) inputEmail.value = session.email;
    }
  } catch (e) {}
})();

// Set default dates: Start = tomorrow, End = tomorrow + 4 days
(function initDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  inputStartDate.min = tomorrowStr;
  inputStartDate.value = tomorrowStr;

  const returnDate = new Date();
  returnDate.setDate(tomorrow.getDate() + 4);
  const returnStr = returnDate.toISOString().split("T")[0];
  inputEndDate.min = tomorrowStr;
  inputEndDate.value = returnStr;
})();

// Update end date automatically when start date or package changes
function syncDatesWithPackage(days) {
  if (!inputStartDate.value) return;
  const start = new Date(inputStartDate.value);
  const duration = (days && days > 0) ? days : 4;
  start.setDate(start.getDate() + duration - 1);
  inputEndDate.value = start.toISOString().split("T")[0];
}

// Load packages
(async function loadPackages() {
  try {
    allPackages = await API.get("/packages");
    if (!allPackages.length) {
      packageShowcaseMount.innerHTML = "<p>No packages found.</p>";
      return;
    }

    // Populate dropdown
    packageSelector.innerHTML = allPackages.map(p =>
      `<option value="${p.id}">${escapeHtml(p.name)} (${money(p.price)})</option>`
    ).join("");

    // Read ?package= from URL
    const urlPkgId = new URLSearchParams(location.search).get("package");
    if (urlPkgId) {
      const match = allPackages.find(p => String(p.id) === String(urlPkgId));
      if (match) {
        selectedPackage = match;
        packageSelector.value = match.id;
      }
    }

    if (!selectedPackage) {
      selectedPackage = allPackages[0];
      packageSelector.value = selectedPackage.id;
    }

    renderSelectedPackage();
    updateLivePrice();
  } catch (err) {
    packageShowcaseMount.innerHTML = "<p>Unable to load packages. Please check connection.</p>";
  }
})();

packageSelector.addEventListener("change", (e) => {
  const chosen = allPackages.find(p => String(p.id) === String(e.target.value));
  if (chosen) {
    selectedPackage = chosen;
    renderSelectedPackage();
    syncDatesWithPackage(selectedPackage.duration_days);
    updateLivePrice();
  }
});

function renderSelectedPackage() {
  if (!selectedPackage) return;

  const p = selectedPackage;
  const highlights = (p.highlights || "").split(",").map(h => h.trim()).filter(Boolean);

  const fallbackImg = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop";
  let itineraryList = p.parsed_itinerary;
  if (!itineraryList && p.itinerary) {
    try {
      itineraryList = typeof p.itinerary === "string" ? JSON.parse(p.itinerary) : p.itinerary;
    } catch (e) {
      itineraryList = null;
    }
  }

  packageShowcaseMount.innerHTML = `
    <div class="selected-package-hero">
      <div class="thumb">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='${fallbackImg}';">
        <span class="badge-tag">${escapeHtml(p.category)} · ${escapeHtml(p.duration_label)}</span>
      </div>
      <div class="body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
          <div>
            <h3 style="font-size:22px;margin-bottom:6px;">${escapeHtml(p.name)}</h3>
            <p style="font-size:13.5px;color:var(--grey-text);margin-bottom:12px;">
              📍 Destination: <strong>${escapeHtml(p.destination_name || p.name)}</strong> · ${p.travel_hours || 4} travel hours · Best season: ${escapeHtml(p.season)}
            </p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:var(--grey-text);">STARTING FROM</div>
            <div style="font-size:22px;font-weight:700;color:var(--teal);">${money(p.price)} <small style="font-size:12px;color:var(--grey-text);font-weight:400;">/ person</small></div>
          </div>
        </div>

        <p style="font-size:14.5px;color:var(--ink);margin-bottom:16px;">${escapeHtml(p.description)}</p>

        <div style="margin-bottom:14px;display:flex;flex-wrap:wrap;gap:6px;">
          ${highlights.map(h => `<span class="highlight-pill">✓ ${escapeHtml(h)}</span>`).join("")}
        </div>

        ${p.accommodation ? `
          <div style="font-size:13.5px;background:#fff;padding:10px 14px;border-radius:6px;border:1px solid #e7e4dc;margin-bottom:12px;">
            🏨 <strong>Accommodation:</strong> ${escapeHtml(p.accommodation)}
          </div>
        ` : ""}

        ${Array.isArray(itineraryList) && itineraryList.length ? `
          <div style="margin-top:14px;background:#fff;padding:12px 16px;border-radius:6px;border:1px solid #e7e4dc;">
            <strong style="font-size:13.5px;color:var(--ink);display:block;margin-bottom:8px;">🗺 Included Day-by-Day Itinerary (${itineraryList.length} Days):</strong>
            <div style="display:grid;gap:6px;font-size:13px;color:var(--grey-text);">
              ${itineraryList.map(d => `
                <div><span style="font-weight:700;color:var(--teal);">Day ${d.day}:</span> <strong>${escapeHtml(d.title)}</strong></div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  // Pre-fill default pickup/drop
  if (p.pickup_locations && !inputPickupLoc.value) {
    inputPickupLoc.value = p.pickup_locations.split(",")[0].trim();
  }
  if (p.drop_locations && !inputDropLoc.value) {
    inputDropLoc.value = p.drop_locations.split(",")[0].trim();
  }

  syncDatesWithPackage(p.duration_days);
}

// Live price calculation
function updateLivePrice() {
  if (!selectedPackage) return;

  const numAdults = parseInt(selectAdults.value, 10) || 1;
  const numChildren = parseInt(selectChildren.value, 10) || 0;

  const adultPrice = selectedPackage.price || 0;
  const childPrice = selectedPackage.child_price || Math.round(adultPrice * 0.5);

  const adultTotal = adultPrice * numAdults;
  const childTotal = childPrice * numChildren;
  const subtotal = adultTotal + childTotal;

  // Recalculate discount based on current subtotal if coupon is applied
  if (appliedCouponCode) {
    if (appliedCouponCode === "WAYFARER25") {
      couponDiscountAmount = Math.min(5000, Math.round(subtotal * 0.25));
    } else if (appliedCouponCode === "SOUTHINDIA") {
      couponDiscountAmount = Math.min(subtotal - 1000, 2000);
    } else if (appliedCouponCode === "EXPLORE") {
      couponDiscountAmount = Math.round(subtotal * 0.15);
    } else if (appliedCouponCode === "FIRSTTRIP") {
      couponDiscountAmount = Math.min(subtotal - 1000, 1500);
    } else if (appliedCouponCode === "SPECIAL50") {
      couponDiscountAmount = Math.min(subtotal - 1000, 2500);
    }
    rowBookDiscount.style.display = "flex";
    bookCouponCode.textContent = appliedCouponCode;
    valDiscount.textContent = `-${money(couponDiscountAmount)}`;
  } else {
    rowBookDiscount.style.display = "none";
    couponDiscountAmount = 0;
  }

  const discountedSubtotal = Math.max(0, subtotal - couponDiscountAmount);
  const tax = Math.round(discountedSubtotal * 0.05); // 5% GST
  const grandTotal = discountedSubtotal + tax;

  sidebarPkgTitle.textContent = selectedPackage.name;
  sidebarDuration.textContent = selectedPackage.duration_label;
  sidebarDest.textContent = selectedPackage.destination_name || selectedPackage.category;
  sidebarTravelers.textContent = `${numAdults} Adult${numAdults > 1 ? "s" : ""}${numChildren > 0 ? `, ${numChildren} Child${numChildren > 1 ? "ren" : ""}` : ""}`;

  labelAdultPrice.textContent = `Adults Fare (${numAdults} x ${money(adultPrice)})`;
  valAdultPrice.textContent = money(adultTotal);

  if (numChildren > 0) {
    rowChildPrice.style.display = "flex";
    labelChildPrice.textContent = `Children Fare (${numChildren} x ${money(childPrice)})`;
    valChildPrice.textContent = money(childTotal);
  } else {
    rowChildPrice.style.display = "none";
  }

  valSubtotal.textContent = money(subtotal);
  valTax.textContent = money(tax);
  valGrandTotal.textContent = money(grandTotal);

  return { numAdults, numChildren, adultTotal, childTotal, subtotal, tax, grandTotal, couponDiscountAmount };
}

function applyCouponFrontend(code) {
  if (!code || !selectedPackage) return;
  const c = code.trim().toUpperCase();

  const validCodes = ["WAYFARER25", "SOUTHINDIA", "EXPLORE", "FIRSTTRIP", "SPECIAL50"];
  if (!validCodes.includes(c)) {
    bookCouponStatus.innerHTML = `<div style="color:#a13a2c;font-size:12.5px;margin-top:6px;">⚠️ Invalid coupon. Try WAYFARER25 or SOUTHINDIA.</div>`;
    return;
  }

  appliedCouponCode = c;
  updateLivePrice();

  bookCouponStatus.innerHTML = `
    <div class="coupon-applied-badge" style="margin-top:8px;">
      <span>🎉 Coupon <strong>${escapeHtml(c)}</strong> applied (-${money(couponDiscountAmount)})</span>
      <button type="button" class="coupon-remove-link" id="btn-remove-book-coupon">Remove</button>
    </div>
  `;

  const removeBtn = document.getElementById("btn-remove-book-coupon");
  if (removeBtn) {
    removeBtn.onclick = () => {
      appliedCouponCode = null;
      couponDiscountAmount = 0;
      rowBookDiscount.style.display = "none";
      bookCouponStatus.innerHTML = "";
      updateLivePrice();
    };
  }
}

if (btnBookApplyCoupon) {
  btnBookApplyCoupon.addEventListener("click", () => {
    const code = bookCouponInput.value.trim();
    if (code) applyCouponFrontend(code);
  });
}

if (bookCouponInput) {
  bookCouponInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = bookCouponInput.value.trim();
      if (code) applyCouponFrontend(code);
    }
  });
}

document.querySelectorAll(".coupon-chips-list .coupon-chip-tag").forEach(chip => {
  chip.addEventListener("click", () => {
    const code = chip.getAttribute("data-code");
    if (bookCouponInput) bookCouponInput.value = code;
    applyCouponFrontend(code);
  });
});

[selectAdults, selectChildren, selectRooms, inputStartDate, inputEndDate].forEach(el => {
  el.addEventListener("change", updateLivePrice);
});

// Stepper transitions
function goToStep(step) {
  currentStep = step;
  step1Pane.classList.toggle("active", step === 1);
  step2Pane.classList.toggle("active", step === 2);
  step3Pane.classList.toggle("active", step === 3);

  step1Indicator.classList.toggle("active", step === 1);
  step1Indicator.classList.toggle("completed", step > 1);

  step2Indicator.classList.toggle("active", step === 2);
  step2Indicator.classList.toggle("completed", step > 2);

  step3Indicator.classList.toggle("active", step === 3);

  window.scrollTo({ top: 120, behavior: "smooth" });
}

document.getElementById("btn-to-step-2").addEventListener("click", () => {
  goToStep(2);
});

document.getElementById("btn-back-to-step-1").addEventListener("click", () => {
  goToStep(1);
});

travelerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  renderStep3Summary();
  goToStep(3);
});

document.getElementById("btn-back-to-step-2").addEventListener("click", () => {
  goToStep(2);
});

function renderStep3Summary() {
  const pricing = updateLivePrice();
  const p = selectedPackage;

  step3SummaryMount.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:22px;margin-bottom:20px;">
      <h4 style="font-size:18px;margin-bottom:12px;color:var(--teal-dark);">1. Package & Schedule</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
        <div><strong>Selected Package:</strong> ${escapeHtml(p.name)}</div>
        <div><strong>Duration:</strong> ${escapeHtml(p.duration_label)} (${p.duration_days} Days)</div>
        <div><strong>Travel Dates:</strong> ${inputStartDate.value} to ${inputEndDate.value}</div>
        <div><strong>Destination:</strong> ${escapeHtml(p.destination_name || p.category)}</div>
      </div>
    </div>

    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:22px;margin-bottom:20px;">
      <h4 style="font-size:18px;margin-bottom:12px;color:var(--teal-dark);">2. Guest & Transit Details</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
        <div><strong>Primary Contact:</strong> ${escapeHtml(inputName.value)}</div>
        <div><strong>Email:</strong> ${escapeHtml(inputEmail.value)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(inputPhone.value)}</div>
        <div><strong>Travelers:</strong> ${pricing.numAdults} Adults, ${pricing.numChildren} Children (${selectRooms.value} Rooms)</div>
        <div><strong>Pickup Point:</strong> ${escapeHtml(inputPickupLoc.value)} at ${selectPickupTime.value}</div>
        <div><strong>Drop-off Point:</strong> ${escapeHtml(inputDropLoc.value)}</div>
        ${inputSpecialReq.value ? `<div style="grid-column:1/-1;"><strong>Special Notes:</strong> ${escapeHtml(inputSpecialReq.value)}</div>` : ""}
      </div>
    </div>

    <div style="background:#fff;border:1.5px solid #dcefe7;border-radius:10px;padding:22px;">
      <h4 style="font-size:18px;margin-bottom:12px;color:var(--teal);">3. Itemized Price Breakdown</h4>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0ede6;">
          <td style="padding:8px 0;">Base Fare (${pricing.numAdults} Adults x ${money(p.price)})</td>
          <td style="text-align:right;padding:8px 0;font-weight:600;">${money(pricing.adultTotal)}</td>
        </tr>
        ${pricing.numChildren > 0 ? `
          <tr style="border-bottom:1px solid #f0ede6;">
            <td style="padding:8px 0;">Children Fare (${pricing.numChildren} Children)</td>
            <td style="text-align:right;padding:8px 0;font-weight:600;">${money(pricing.childTotal)}</td>
          </tr>
        ` : ""}
        <tr style="border-bottom:1px solid #f0ede6;">
          <td style="padding:8px 0;">GST & Tourism Taxes (5%)</td>
          <td style="text-align:right;padding:8px 0;font-weight:600;">${money(pricing.tax)}</td>
        </tr>
        <tr style="font-size:16px;">
          <td style="padding:12px 0;font-weight:700;">Total Payable Amount</td>
          <td style="text-align:right;padding:12px 0;font-weight:700;color:var(--teal);font-size:19px;">${money(pricing.grandTotal)}</td>
        </tr>
      </table>
    </div>
  `;
}

// Proceed to payment button
const proceedBtn = document.getElementById("btn-proceed-payment");
proceedBtn.addEventListener("click", async () => {
  errorMsg.className = "form-msg";
  proceedBtn.disabled = true;
  proceedBtn.textContent = "Creating booking & proceeding…";

  const payload = {
    package_id: selectedPackage.id,
    full_name: inputName.value.trim(),
    email: inputEmail.value.trim(),
    phone: inputPhone.value.trim(),
    start_date: inputStartDate.value,
    end_date: inputEndDate.value,
    adults: parseInt(selectAdults.value, 10) || 1,
    children: parseInt(selectChildren.value, 10) || 0,
    rooms: parseInt(selectRooms.value, 10) || 1,
    pickup_location: inputPickupLoc.value.trim(),
    drop_location: inputDropLoc.value.trim(),
    pickup_time: selectPickupTime.value,
    special_requests: inputSpecialReq.value.trim(),
    coupon_code: appliedCouponCode
  };

  try {
    const res = await API.post("/bookings", payload);
    const bookingId = res.booking.id;
    // Redirect to separate payment page
    window.location.href = `payment.html?booking_id=${bookingId}`;
  } catch (err) {
    errorMsg.textContent = err.message || "Failed to create booking. Please try again.";
    errorMsg.classList.add("show", "error");
    proceedBtn.disabled = false;
    proceedBtn.textContent = "Continue to Payment &rarr;";
  }
});
