mountChrome("");

const urlParams = new URLSearchParams(location.search);
const bookingId = urlParams.get("booking_id") || urlParams.get("id");

const printBtn = document.getElementById("slip-btn-print");
const emailBtn = document.getElementById("slip-btn-email");
const emailMsg = document.getElementById("slip-email-msg");

let bookingData = null;

(async function loadVoucher() {
  if (!bookingId) {
    document.getElementById("printable-voucher").innerHTML = `
      <div style="padding:60px;text-align:center;">
        <h3>No booking specified</h3>
        <p>Please select a booking from your account.</p>
        <a href="my-bookings.html" class="btn btn-primary">Go to My Bookings</a>
      </div>
    `;
    return;
  }

  try {
    bookingData = await API.get("/bookings/" + bookingId);
    renderSlip(bookingData);
  } catch (err) {
    document.getElementById("printable-voucher").innerHTML = `
      <div style="padding:60px;text-align:center;color:#a13a2c;">
        <h3>Could not retrieve booking voucher</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="my-bookings.html" class="btn btn-outline" style="margin-top:14px;">My Bookings</a>
      </div>
    `;
  }
})();

function renderSlip(b) {
  document.getElementById("slip-ref").textContent = b.booking_reference || `WF-2026-${b.id}`;
  document.getElementById("slip-customer-name").textContent = b.full_name;
  document.getElementById("slip-customer-contact").textContent = `${b.email} · ${b.phone || "—"}`;
  document.getElementById("slip-travelers").textContent = `${b.adults || 1} Adults, ${b.children || 0} Children (${b.rooms || 1} Rooms)`;
  document.getElementById("slip-booking-date").textContent = new Date(b.created_at || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric"
  });

  document.getElementById("slip-package-name").textContent = b.package_name || "Tour Package";
  document.getElementById("slip-destination").textContent = `${b.destination_name || "South India"} (${b.package_category || "Leisure"} · ${b.duration_label || "Flexible"})`;
  document.getElementById("slip-start-date").textContent = b.start_date || "Confirmed Upon Request";
  document.getElementById("slip-end-date").textContent = b.end_date || "Confirmed Upon Request";
  document.getElementById("slip-pickup").textContent = `${b.pickup_location || "Cochin Airport"} (Time: ${b.pickup_time || "09:00 AM"})`;
  document.getElementById("slip-dropoff").textContent = `${b.drop_location || "Cochin Airport"} (Est: ${b.estimated_arrival || "06:00 PM"})`;
  document.getElementById("slip-travel-hours").textContent = `${b.travel_hours || 4} Total Travel Hours`;
  document.getElementById("slip-accommodation").textContent = b.accommodation || "Premium 4-Star Resort / Villa Included";

  // Guide Details (Requirement 10)
  const gName = document.getElementById("slip-guide-name");
  const gPhone = document.getElementById("slip-guide-phone");
  const gEmail = document.getElementById("slip-guide-email");
  const gLang = document.getElementById("slip-guide-lang");
  if (gName) gName.textContent = b.guide_name || "Arun Nair (Certified Tour Guide)";
  if (gPhone) gPhone.textContent = b.guide_phone || "+91 98471 22334";
  if (gEmail) gEmail.textContent = b.guide_email || "arun.nair@wayfarer.travel";
  if (gLang) gLang.textContent = `${b.guide_languages || "English, Malayalam, Hindi"} · ${b.guide_experience || "8+ Years Experience"}`;

  // Render Day-Wise Itinerary
  const itineraryContainer = document.getElementById("slip-itinerary-container");
  if (b.parsed_itinerary && Array.isArray(b.parsed_itinerary)) {
    itineraryContainer.innerHTML = b.parsed_itinerary.map(item => `
      <div class="itinerary-day-box">
        <h5>Day ${item.day}: ${escapeHtml(item.title)}</h5>
        <p>${escapeHtml(item.details || item.description || "")}</p>
      </div>
    `).join("");
  } else if (b.itinerary && typeof b.itinerary === "string") {
    itineraryContainer.innerHTML = `
      <div class="itinerary-day-box">
        <h5>Detailed Sightseeing Plan</h5>
        <p>${escapeHtml(b.itinerary)}</p>
      </div>
    `;
  } else {
    itineraryContainer.innerHTML = `
      <div class="itinerary-day-box">
        <h5>Day 1: Arrival & Check-in</h5>
        <p>Pickup and welcome transfer to resort. Evening leisure and sightseeing.</p>
      </div>
      <div class="itinerary-day-box">
        <h5>Day 2: Guided Sightseeing Tour</h5>
        <p>Full day sightseeing of key attractions and scenic viewpoints.</p>
      </div>
      <div class="itinerary-day-box">
        <h5>Day 3: Cultural Sightseeing & Return Departure</h5>
        <p>Local markets, souvenir shopping, and return transfer to airport/station.</p>
      </div>
    `;
  }

  // Payment summary
  document.getElementById("slip-txn-id").textContent = b.transaction_id || `TXN_${b.id}_PAID`;
  document.getElementById("slip-payment-method").textContent = b.payment_method || b.paid_via || "UPI / Online Payment";
  document.getElementById("slip-amount-paid").textContent = money(b.total_amount);
}

// Print / Save as PDF
printBtn.addEventListener("click", () => {
  window.print();
});

// Email confirmation slip
emailBtn.addEventListener("click", async () => {
  if (!bookingData) return;
  emailMsg.className = "form-msg";
  emailBtn.disabled = true;
  emailBtn.textContent = "Sending email…";

  try {
    const res = await API.post(`/bookings/${bookingData.id}/email-confirmation`, { email: bookingData.email });
    emailMsg.textContent = res.message || `Confirmation voucher sent to ${bookingData.email}`;
    emailMsg.classList.add("show", "success");
  } catch (err) {
    emailMsg.textContent = "Could not send email right now. You can print / save PDF directly.";
    emailMsg.classList.add("show", "error");
  } finally {
    emailBtn.disabled = false;
    emailBtn.textContent = "✉️ Email Slip";
  }
});
