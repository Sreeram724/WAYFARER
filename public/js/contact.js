mountChrome("Contact");

const form = document.getElementById("contact-form");
const msg = document.getElementById("form-msg");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "form-msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    subject: document.getElementById("subject").value.trim(),
    message: document.getElementById("message").value.trim()
  };

  try {
    const result = await API.post("/contact", payload);
    msg.textContent = result.message || "Message sent!";
    msg.classList.add("show", "success");
    form.reset();
  } catch (err) {
    msg.textContent = err.message || "Something went wrong. Please try again.";
    msg.classList.add("show", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";
  }
});
