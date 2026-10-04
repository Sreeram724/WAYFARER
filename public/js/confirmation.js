mountChrome("");

const urlParams = new URLSearchParams(location.search);
const bookingId = urlParams.get("booking_id") || urlParams.get("id");
const txnId = urlParams.get("txn");

const loadingDiv = document.getElementById("conf-loading");
const contentDiv = document.getElementById("conf-content");

const confBookingId = document.getElementById("conf-booking-id");
const confPkgName = document.getElementById("conf-package-name");
const confDest = document.getElementById("conf-destination");
const confDates = document.getElementById("conf-dates");
const confTravelers = document.getElementById("conf-travelers");
const confPickup = document.getElementById("conf-pickup");
const confTxnId = document.getElementById("conf-txn-id");
const confMethod = document.getElementById("conf-payment-method");
const confAmount = document.getElementById("conf-amount-paid");
const btnViewSlip = document.getElementById("btn-view-slip");
const btnEmailSlip = document.getElementById("btn-email-slip");
const emailMsg = document.getElementById("conf-email-msg");

let booking = null;

(async function initConfirmation() {
  if (!bookingId) {
    loadingDiv.innerHTML = `<p style="color:#a13a2c;">No booking found. Please browse packages.</p><a href="packages.html" class="btn btn-primary" style="margin-top:14px;">Browse Packages</a>`;
    return;
  }

  try {
    booking = await API.get("/bookings/" + bookingId);

    // Ensure payment is genuinely verified
    if (booking.payment_status !== "paid" && booking.status !== "confirmed") {
      loadingDiv.innerHTML = `
        <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:34px;max-width:540px;margin:40px auto;text-align:center;">
          <h3 style="color:#a13a2c;">Payment Verification Pending</h3>
          <p style="font-size:14px;color:var(--grey-text);">We could not verify a successful transaction for this booking. Please complete payment first.</p>
          <a href="payment.html?booking_id=${booking.id}" class="btn btn-primary" style="margin-top:14px;">Complete Payment</a>
        </div>
      `;
      return;
    }

    // Populate confirmation details
    confBookingId.textContent = booking.booking_reference || `WF-2026-${booking.id}`;
    confPkgName.textContent = booking.package_name || "Tour Package";
    confDest.textContent = booking.destination_name || "South India";
    confDates.textContent = `${booking.start_date || "Flexible"} to ${booking.end_date || "Flexible"}`;
    confTravelers.textContent = `${booking.adults || 1} Adults, ${booking.children || 0} Children (${booking.rooms || 1} Rooms)`;
    confPickup.textContent = `${booking.pickup_location || "Airport / Hub"} (Pickup: ${booking.pickup_time || "09:00 AM"})`;
    confTxnId.textContent = txnId || booking.transaction_id || `TXN_VERIFIED_${booking.id}`;
    confMethod.textContent = booking.payment_method || "UPI / Online Payment";
    confAmount.textContent = money(booking.total_amount);

    btnViewSlip.href = `booking-slip.html?booking_id=${booking.id}`;

    loadingDiv.style.display = "none";
    contentDiv.style.display = "block";
  } catch (err) {
    loadingDiv.innerHTML = `<p style="color:#a13a2c;">Could not load booking details (${escapeHtml(bookingId)}).</p>`;
  }
})();

btnEmailSlip.addEventListener("click", async () => {
  if (!booking) return;
  emailMsg.className = "form-msg";
  btnEmailSlip.disabled = true;
  btnEmailSlip.textContent = "Sending email…";

  try {
    const res = await API.post(`/bookings/${booking.id}/email-confirmation`, { email: booking.email });
    emailMsg.textContent = res.message || `Confirmation voucher sent to ${booking.email}`;
    emailMsg.classList.add("show", "success");
  } catch (e) {
    emailMsg.textContent = "Could not send email right now. You can download the booking slip directly.";
    emailMsg.classList.add("show", "error");
  } finally {
    btnEmailSlip.disabled = false;
    btnEmailSlip.textContent = "✉️ Email Confirmation Slip";
  }
});
