mountChrome("");

const adminForm = document.getElementById("admin-login-form");
const msg = document.getElementById("admin-login-msg");
const submitBtn = document.getElementById("admin-submit-btn");

function showMsg(text, type = "error") {
  msg.textContent = text;
  msg.className = `form-msg show ${type}`;
}

(async function checkExistingAdmin() {
  try {
    const session = await API.get("/admin/me");
    if (session.loggedIn) {
      window.location.href = "admin.html";
    }
  } catch (e) {}
})();

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "form-msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Verifying admin access…";

  const username = document.getElementById("admin-id").value.trim();
  const password = document.getElementById("admin-pw").value;

  try {
    await API.post("/admin/login", { username, password });
    showMsg("Admin authorization successful. Loading dashboard…", "success");
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 500);
  } catch (err) {
    showMsg(err.message || "Invalid admin ID or password. Access denied.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Authorize & Sign In";
  }
});
