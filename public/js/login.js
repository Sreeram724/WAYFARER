mountChrome("");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const otpFlowWrapper = document.getElementById("otp-flow-wrapper");
const otpRequestForm = document.getElementById("otp-request-form");
const otpVerifyForm = document.getElementById("otp-verify-form");

const tabOtpBtn = document.getElementById("tab-otp-btn");
const tabLoginBtn = document.getElementById("tab-login-btn");
const tabRegBtn = document.getElementById("tab-register-btn");

const authTitle = document.getElementById("auth-title");
const authDesc = document.getElementById("auth-desc");
const msg = document.getElementById("auth-msg");
const googleBtn = document.getElementById("custom-google-btn");

let currentOtpEmail = "";
let resendTimer = null;
let resendSeconds = 0;

function showMsg(text, type = "error") {
  msg.textContent = text;
  msg.className = `form-msg show ${type}`;
}

function clearMsg() {
  msg.textContent = "";
  msg.className = "form-msg";
}

function getRedirectUrl(role) {
  if (role === "admin") return "admin.html";
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  return redirect || "my-bookings.html";
}

// Check if user is already logged in
(async function checkExistingSession() {
  try {
    const session = await API.get("/auth/me");
    if (session.loggedIn) {
      window.location.href = getRedirectUrl(session.role);
    }
  } catch (e) {}
})();

// Tab Switching
function selectTab(activeTab) {
  clearMsg();
  tabOtpBtn.classList.remove("active");
  tabLoginBtn.classList.remove("active");
  tabRegBtn.classList.remove("active");

  otpFlowWrapper.style.display = "none";
  loginForm.style.display = "none";
  registerForm.style.display = "none";

  if (activeTab === "otp") {
    tabOtpBtn.classList.add("active");
    otpFlowWrapper.style.display = "block";
    authTitle.textContent = "Sign In with Gmail OTP";
    authDesc.textContent = "Instant access with real-time verification code dispatched to your Gmail. No password needed.";
  } else if (activeTab === "login") {
    tabLoginBtn.classList.add("active");
    loginForm.style.display = "block";
    authTitle.textContent = "Sign in with password";
    authDesc.textContent = "Access your bookings, download itinerary slips, and manage your travel details.";
  } else if (activeTab === "register") {
    tabRegBtn.classList.add("active");
    registerForm.style.display = "block";
    authTitle.textContent = "Create traveler account";
    authDesc.textContent = "Join Wayfarer to track your South India trips and download confirmed itineraries.";
  }
}

tabOtpBtn.addEventListener("click", () => selectTab("otp"));
tabLoginBtn.addEventListener("click", () => selectTab("login"));
tabRegBtn.addEventListener("click", () => selectTab("register"));

// ---------------- GMAIL REAL-TIME OTP FLOW ----------------
// Step 1: Send OTP to Gmail
otpRequestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  const sendBtn = document.getElementById("btn-send-otp");
  const emailInput = document.getElementById("otp-email");
  const email = emailInput.value.trim().toLowerCase();

  if (!email) return;

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending Real-Time OTP to Gmail…";

  try {
    const res = await API.post("/auth/send-otp", { email });
    currentOtpEmail = email;

    // Transition to verification form
    otpRequestForm.style.display = "none";
    otpVerifyForm.style.display = "block";
    document.getElementById("otp-target-email").textContent = email;

    const otpInput = document.getElementById("otp-code-input");
    otpInput.value = "";
    otpInput.focus();

    // Show preview code if available
    const hintBox = document.getElementById("otp-preview-hint");
    const previewVal = document.getElementById("preview-otp-val");
    if (res.previewOtp) {
      previewVal.textContent = res.previewOtp;
      hintBox.style.display = "block";
      previewVal.onclick = () => {
        otpInput.value = res.previewOtp;
      };
    } else {
      hintBox.style.display = "none";
    }

    showMsg(res.message || `Verification code sent to ${email}!`, "success");
    startResendCountdown();
  } catch (err) {
    showMsg(err.message || "Failed to send verification code. Please check your email.");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send OTP to Gmail →";
  }
});

// Step 2: Verify OTP & Sign In
otpVerifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  const verifyBtn = document.getElementById("btn-verify-otp");
  const otpInput = document.getElementById("otp-code-input");
  const otp = otpInput.value.trim();

  if (!otp || otp.length < 6) {
    showMsg("Please enter the complete 6-digit OTP code.");
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Verifying Code…";

  try {
    const res = await API.post("/auth/verify-otp", {
      email: currentOtpEmail,
      otp: otp
    });

    showMsg("Verified successfully! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.role);
    }, 600);
  } catch (err) {
    showMsg(err.message || "Invalid or expired OTP code. Please try again.");
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify & Sign In →";
  }
});

// Change Email link
document.getElementById("btn-change-email").addEventListener("click", () => {
  otpVerifyForm.style.display = "none";
  otpRequestForm.style.display = "block";
  clearMsg();
});

// Resend Countdown
function startResendCountdown() {
  const resendBtn = document.getElementById("btn-resend-otp");
  resendBtn.disabled = true;
  resendSeconds = 30;

  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    resendSeconds--;
    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend OTP";
    } else {
      resendBtn.textContent = `Resend in ${resendSeconds}s`;
    }
  }, 1000);
}

// Resend Button
document.getElementById("btn-resend-otp").addEventListener("click", async () => {
  if (resendSeconds > 0 || !currentOtpEmail) return;
  clearMsg();

  const resendBtn = document.getElementById("btn-resend-otp");
  resendBtn.disabled = true;
  resendBtn.textContent = "Sending…";

  try {
    const res = await API.post("/auth/send-otp", { email: currentOtpEmail });
    const hintBox = document.getElementById("otp-preview-hint");
    const previewVal = document.getElementById("preview-otp-val");
    if (res.previewOtp) {
      previewVal.textContent = res.previewOtp;
      hintBox.style.display = "block";
    }
    showMsg(`New OTP sent to ${currentOtpEmail}!`, "success");
    startResendCountdown();
  } catch (err) {
    showMsg(err.message || "Failed to resend code.");
    resendBtn.disabled = false;
    resendBtn.textContent = "Resend OTP";
  }
});

// ---------------- STANDARD PASSWORD LOGIN ----------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();
  const submitBtn = document.getElementById("login-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await API.post("/auth/login", { email, password });
    showMsg("Welcome back! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.role);
    }, 600);
  } catch (err) {
    showMsg(err.message || "Invalid credentials. Please try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in with Password";
  }
});

// ---------------- REGISTRATION FORM ----------------
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();
  const submitBtn = document.getElementById("reg-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  const full_name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value;

  try {
    const res = await API.post("/auth/register", { full_name, email, phone, password });
    showMsg("Account created successfully! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.user?.role || "user");
    }, 600);
  } catch (err) {
    showMsg(err.message || "Failed to create account. Please try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Traveler Account";
  }
});

// ---------------- GOOGLE SIGN-IN ----------------
(async function initGoogleAuth() {
  try {
    const config = await API.get("/auth/config");
    if (config.googleClientId && window.google) {
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredentialResponse
      });
    }
  } catch (e) {}
})();

async function handleGoogleCredentialResponse(response) {
  clearMsg();
  try {
    const res = await API.post("/auth/google", { credential: response.credential });
    showMsg("Signed in with Google! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.role);
    }, 600);
  } catch (err) {
    showMsg("Google sign in failed: " + err.message);
  }
}

googleBtn.addEventListener("click", async () => {
  clearMsg();
  try {
    const config = await API.get("/auth/config");
    if (config.googleClientId && window.google) {
      google.accounts.id.prompt();
    } else {
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span>Connecting to Google…</span>`;
      const res = await API.post("/auth/google", {
        email: "traveler@wayfarer.travel",
        name: "Arun Kumar (Google)",
        google_id: "google_oauth_traveler_123"
      });
      showMsg("Google Sign-In verified (Demo Traveler Mode). Redirecting…", "success");
      setTimeout(() => {
        window.location.href = getRedirectUrl(res.role);
      }, 700);
    }
  } catch (err) {
    showMsg("Google Sign-In notice: " + err.message);
    googleBtn.disabled = false;
  }
});

// Demo account autofill handler
const autofillBtn = document.getElementById("btn-autofill-demo");
if (autofillBtn) {
  autofillBtn.addEventListener("click", () => {
    selectTab("login");
    const emailField = document.getElementById("login-email");
    const passField = document.getElementById("login-password");
    if (emailField) emailField.value = "admin@wayfarer.travel";
    if (passField) passField.value = "wayfarer123";
    showMsg("Demo Admin credentials populated! Click 'Sign in with Password' to continue.", "success");
    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) submitBtn.focus();
  });
}
