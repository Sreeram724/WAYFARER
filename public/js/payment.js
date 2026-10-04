mountChrome("");

let currentBooking = null;
let selectedMethod = "Google Pay";
let activeOrder = null;
let isLoggedIn = false;
let userSession = null;

const loadingDiv = document.getElementById("payment-loading");
const contentDiv = document.getElementById("payment-content");
const payBtn = document.getElementById("btn-pay-now");
const paymentMsg = document.getElementById("payment-msg");
const loginBanner = document.getElementById("login-required-banner");
const openSigninBtn = document.getElementById("btn-open-signin");

// Quick sign-in modal
const quickSigninModal = document.getElementById("quick-signin-modal");
const quickOtpStep1 = document.getElementById("quick-otp-step-1");
const quickOtpStep2 = document.getElementById("quick-otp-step-2");
const quickEmailInput = document.getElementById("quick-email");
const quickOtpInput = document.getElementById("quick-otp-input");
const btnQuickSendOtp = document.getElementById("btn-quick-send-otp");
const btnQuickVerifyOtp = document.getElementById("btn-quick-verify-otp");
const btnQuickCancel = document.getElementById("btn-quick-signin-cancel");
const quickSigninMsg = document.getElementById("quick-signin-msg");
const quickSentToEmail = document.getElementById("quick-sent-to-email");
const quickPreviewHint = document.getElementById("quick-otp-preview-hint");
const quickPreviewVal = document.getElementById("quick-preview-otp-val");

// Coupon elements
const payCouponInput = document.getElementById("pay-coupon-input");
const btnPayApplyCoupon = document.getElementById("btn-pay-apply-coupon");
const payCouponStatus = document.getElementById("pay-coupon-status");
const rowPayDiscount = document.getElementById("row-pay-discount");
const payCouponCode = document.getElementById("pay-coupon-code");
const payDiscount = document.getElementById("pay-discount");

const payPkgName = document.getElementById("pay-pkg-name");
const payBookingRef = document.getElementById("pay-booking-ref");
const payTravelerName = document.getElementById("pay-traveler-name");
const payTravelDates = document.getElementById("pay-travel-dates");
const payTravelerCount = document.getElementById("pay-traveler-count");
const paySubtotal = document.getElementById("pay-subtotal");
const payTax = document.getElementById("pay-tax");
const payGrandTotal = document.getElementById("pay-grand-total");
const btnPayAmount = document.getElementById("btn-pay-amount");

// Simulation Modal elements
const simModal = document.getElementById("payment-sim-modal");
const simTitle = document.getElementById("sim-modal-title");
const simDesc = document.getElementById("sim-modal-desc");
const simAmount = document.getElementById("sim-modal-amount");
const simMethod = document.getElementById("sim-modal-method");
const simConfirmBtn = document.getElementById("sim-btn-confirm");
const simCancelBtn = document.getElementById("sim-btn-cancel");

// Check Authentication Status
async function checkAuth() {
  try {
    userSession = await API.get("/auth/me");
    isLoggedIn = !!(userSession && userSession.loggedIn);
  } catch (e) {
    isLoggedIn = false;
  }
  updateAuthUI();
}

function updateAuthUI() {
  if (isLoggedIn) {
    if (loginBanner) loginBanner.style.display = "none";
    payBtn.innerHTML = `Pay <span id="btn-pay-amount">${money(currentBooking ? currentBooking.total_amount : 0)}</span> Securely &rarr;`;
  } else {
    if (loginBanner) loginBanner.style.display = "flex";
    payBtn.innerHTML = `🔒 Sign In to Pay <span id="btn-pay-amount">${money(currentBooking ? currentBooking.total_amount : 0)}</span>`;
  }
}

// Load Booking
(async function initPayment() {
  const urlParams = new URLSearchParams(location.search);
  const bookingId = urlParams.get("booking_id") || urlParams.get("id");

  if (!bookingId) {
    loadingDiv.innerHTML = `
      <p style="color:#a13a2c;">No booking identifier provided. Please start a booking first.</p>
      <a href="packages.html" class="btn btn-primary" style="margin-top:14px;">Browse Packages</a>
    `;
    return;
  }

  // Pre-fill link to login page with return url
  const fullLoginLink = document.getElementById("link-full-login");
  if (fullLoginLink) {
    fullLoginLink.href = `login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`;
  }

  try {
    currentBooking = await API.get("/bookings/" + bookingId);

    // If already paid, redirect straight to confirmation slip
    if (currentBooking.payment_status === "paid") {
      window.location.href = `confirmation.html?booking_id=${currentBooking.id}&already_paid=1`;
      return;
    }

    await checkAuth();

    renderBookingData();
    loadingDiv.style.display = "none";
    contentDiv.style.display = "block";
  } catch (err) {
    loadingDiv.innerHTML = `
      <p style="color:#a13a2c;">Could not locate this booking (${escapeHtml(bookingId)}). Please try again.</p>
      <a href="packages.html" class="btn btn-outline" style="margin-top:14px;">Back to Packages</a>
    `;
  }
})();

function renderBookingData() {
  const b = currentBooking;
  payPkgName.textContent = b.package_name || "Tour Package";
  payBookingRef.textContent = b.booking_reference || `WF-2026-${b.id}`;
  payTravelerName.textContent = b.full_name;
  payTravelDates.textContent = `${b.start_date || "Flexible"} to ${b.end_date || "Flexible"}`;
  payTravelerCount.textContent = `${b.adults || 1} Adults${b.children ? `, ${b.children} Children` : ""}`;

  paySubtotal.textContent = money(b.subtotal || b.total_amount);

  // Discount row
  if (b.discount_amount && b.discount_amount > 0) {
    rowPayDiscount.style.display = "flex";
    payCouponCode.textContent = b.coupon_code || "OFFER";
    payDiscount.textContent = `-${money(b.discount_amount)}`;
    payCouponStatus.innerHTML = `
      <div class="coupon-applied-badge">
        <span>🎉 Coupon <strong>${escapeHtml(b.coupon_code)}</strong> applied (-${money(b.discount_amount)})</span>
        <button type="button" class="coupon-remove-link" id="btn-remove-coupon">Remove</button>
      </div>
    `;
    const removeBtn = document.getElementById("btn-remove-coupon");
    if (removeBtn) {
      removeBtn.onclick = handleRemoveCoupon;
    }
  } else {
    rowPayDiscount.style.display = "none";
    payCouponStatus.innerHTML = "";
  }

  payTax.textContent = money(b.tax_amount || 0);
  payGrandTotal.textContent = money(b.total_amount);
  updateAuthUI();
}

// Payment method click handlers
document.querySelectorAll(".payment-method-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".payment-method-item").forEach(i => i.classList.remove("selected"));
    item.classList.add("selected");
    const radio = item.querySelector("input[type=radio]");
    radio.checked = true;
    selectedMethod = radio.value;
  });
});

// Click Pay Now
payBtn.addEventListener("click", async () => {
  paymentMsg.className = "form-msg";

  // Strict Login Check: Only authenticated users can pay
  if (!isLoggedIn) {
    openQuickSignin();
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = "Connecting to payment gateway…";

  try {
    // 1. Create order on server
    activeOrder = await API.post("/payments/create-order", {
      booking_id: currentBooking.id,
      payment_method: selectedMethod
    });

    // 2. Check if real Razorpay Checkout is available
    if (activeOrder.isLiveGateway && window.Razorpay) {
      launchRazorpay(activeOrder);
    } else {
      // 3. Open Verified Sandbox/Simulator Modal
      openSimulator(activeOrder);
    }
  } catch (err) {
    if (err.requireLogin || err.status === 401) {
      isLoggedIn = false;
      updateAuthUI();
      openQuickSignin();
    } else {
      paymentMsg.textContent = err.message || "Failed to initialize payment gateway.";
      paymentMsg.classList.add("show", "error");
    }
    payBtn.disabled = false;
    updateAuthUI();
  }
});

// ---------------- QUICK SIGN-IN MODAL (GMAIL OTP) ----------------
function openQuickSignin() {
  quickSigninMsg.className = "form-msg";
  quickSigninMsg.textContent = "";
  quickEmailInput.value = currentBooking ? currentBooking.email : "";
  quickOtpStep1.style.display = "block";
  quickOtpStep2.style.display = "none";
  quickSigninModal.classList.add("show");
}

if (openSigninBtn) {
  openSigninBtn.addEventListener("click", openQuickSignin);
}

btnQuickCancel.addEventListener("click", () => {
  quickSigninModal.classList.remove("show");
});

// Quick Send OTP
btnQuickSendOtp.addEventListener("click", async () => {
  const email = quickEmailInput.value.trim().toLowerCase();
  if (!email) {
    quickSigninMsg.textContent = "Please enter your Gmail / email address.";
    quickSigninMsg.className = "form-msg show error";
    return;
  }

  btnQuickSendOtp.disabled = true;
  btnQuickSendOtp.textContent = "Sending Real-Time OTP…";
  quickSigninMsg.className = "form-msg";

  try {
    const res = await API.post("/auth/send-otp", { email });
    quickSentToEmail.textContent = email;
    quickOtpStep1.style.display = "none";
    quickOtpStep2.style.display = "block";
    quickOtpInput.value = "";
    quickOtpInput.focus();

    if (res.previewOtp) {
      quickPreviewVal.textContent = res.previewOtp;
      quickPreviewHint.style.display = "block";
      quickPreviewVal.onclick = () => {
        quickOtpInput.value = res.previewOtp;
      };
    } else {
      quickPreviewHint.style.display = "none";
    }

    quickSigninMsg.textContent = res.message || "Code sent to your Gmail!";
    quickSigninMsg.className = "form-msg show success";
  } catch (err) {
    quickSigninMsg.textContent = err.message || "Could not dispatch OTP code.";
    quickSigninMsg.className = "form-msg show error";
  } finally {
    btnQuickSendOtp.disabled = false;
    btnQuickSendOtp.textContent = "Send OTP to Gmail →";
  }
});

// Quick Verify OTP
btnQuickVerifyOtp.addEventListener("click", async () => {
  const email = quickEmailInput.value.trim().toLowerCase();
  const otp = quickOtpInput.value.trim();

  if (!otp || otp.length < 6) {
    quickSigninMsg.textContent = "Please enter the 6-digit verification code.";
    quickSigninMsg.className = "form-msg show error";
    return;
  }

  btnQuickVerifyOtp.disabled = true;
  btnQuickVerifyOtp.textContent = "Verifying…";

  try {
    const res = await API.post("/auth/verify-otp", { email, otp });
    isLoggedIn = true;
    userSession = res.user;
    updateAuthUI();

    quickSigninMsg.textContent = "Signed in successfully! Authorizing payment…";
    quickSigninMsg.className = "form-msg show success";

    setTimeout(() => {
      quickSigninModal.classList.remove("show");
      // Automatically trigger payment now that user is signed in!
      payBtn.click();
    }, 600);
  } catch (err) {
    quickSigninMsg.textContent = err.message || "Invalid OTP code. Please try again.";
    quickSigninMsg.className = "form-msg show error";
    btnQuickVerifyOtp.disabled = false;
    btnQuickVerifyOtp.textContent = "Verify & Continue Payment →";
  }
});

// ---------------- COUPON CODE HANDLING ----------------
async function handleApplyCoupon(code) {
  if (!code || !currentBooking) return;
  btnPayApplyCoupon.disabled = true;
  btnPayApplyCoupon.textContent = "Applying…";

  try {
    const res = await API.post("/bookings/apply-coupon", {
      booking_id: currentBooking.id,
      coupon_code: code
    });

    currentBooking = res.booking;
    renderBookingData();
    payCouponInput.value = "";
  } catch (err) {
    payCouponStatus.innerHTML = `
      <div style="color:#a13a2c;font-size:12.5px;margin-top:6px;">⚠️ ${escapeHtml(err.message || "Invalid coupon code.")}</div>
    `;
  } finally {
    btnPayApplyCoupon.disabled = false;
    btnPayApplyCoupon.textContent = "Apply";
  }
}

async function handleRemoveCoupon() {
  if (!currentBooking) return;
  try {
    const res = await API.post("/bookings/remove-coupon", {
      booking_id: currentBooking.id
    });
    currentBooking = res.booking;
    renderBookingData();
  } catch (err) {
    console.error("Could not remove coupon:", err);
  }
}

btnPayApplyCoupon.addEventListener("click", () => {
  const code = payCouponInput.value.trim();
  if (code) handleApplyCoupon(code);
});

payCouponInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const code = payCouponInput.value.trim();
    if (code) handleApplyCoupon(code);
  }
});

document.querySelectorAll(".coupon-chip-tag").forEach(chip => {
  chip.addEventListener("click", () => {
    const code = chip.getAttribute("data-code");
    payCouponInput.value = code;
    handleApplyCoupon(code);
  });
});

// ---------------- PAYMENT GATEWAY & SIMULATOR ----------------
function launchRazorpay(order) {
  const options = {
    key: order.keyId,
    amount: order.amountPaise,
    currency: "INR",
    name: "Wayfarer Travel Booking",
    description: `Booking ${order.booking_reference}`,
    image: "assets/wayfarer-logo.svg",
    order_id: order.orderId,
    prefill: {
      name: currentBooking.full_name,
      email: currentBooking.email,
      contact: currentBooking.phone || ""
    },
    theme: {
      color: "#0f7a5f"
    },
    handler: async function (response) {
      await verifyPayment({
        booking_id: currentBooking.id,
        payment_method: selectedMethod,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
    },
    modal: {
      ondismiss: function () {
        payBtn.disabled = false;
        updateAuthUI();
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

function openSimulator(order) {
  simTitle.textContent = `Authorize ${selectedMethod}`;
  simAmount.textContent = money(order.amount);
  simMethod.textContent = selectedMethod;
  simModal.classList.add("show");
}

simCancelBtn.addEventListener("click", () => {
  simModal.classList.remove("show");
  payBtn.disabled = false;
  updateAuthUI();
});

simConfirmBtn.addEventListener("click", async () => {
  simConfirmBtn.disabled = true;
  simConfirmBtn.textContent = "Verifying with bank…";

  const fakeTxnId = `TXN_${selectedMethod.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}_${Date.now()}`;

  await verifyPayment({
    booking_id: currentBooking.id,
    payment_method: selectedMethod,
    transaction_id: fakeTxnId,
    razorpay_order_id: activeOrder ? activeOrder.orderId : null
  });
});

// Complete payment verification on backend
async function verifyPayment(verifyPayload) {
  try {
    const res = await API.post("/payments/verify", verifyPayload);
    if (res.success && res.verified) {
      simModal.classList.remove("show");
      paymentMsg.textContent = "Payment genuinely verified! Loading confirmation slip…";
      paymentMsg.classList.add("show", "success");

      // Redirect to confirmation page
      setTimeout(() => {
        window.location.href = `confirmation.html?booking_id=${currentBooking.id}&txn=${encodeURIComponent(res.transaction.transaction_id)}`;
      }, 700);
    } else {
      throw new Error(res.error || "Payment verification could not be completed.");
    }
  } catch (err) {
    simModal.classList.remove("show");
    paymentMsg.textContent = "Verification Failed: " + err.message;
    paymentMsg.classList.add("show", "error");
    payBtn.disabled = false;
    updateAuthUI();
    if (simConfirmBtn) {
      simConfirmBtn.disabled = false;
      simConfirmBtn.textContent = "Authorize & Complete Payment";
    }
  }
}
