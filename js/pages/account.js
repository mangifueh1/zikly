import { getCurrentProfile, signOut, updatePassword } from "../services/auth.service.js";
import { escapeHtml } from "../utils/format.js";
import { toast } from "../components/toast.js";

async function init() {
  const details = document.querySelector("#account-details");
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      location.replace("auth.html");
      return;
    }
    details.innerHTML = `<div class="field"><label>Email</label><p>${escapeHtml(profile.user.email)}</p></div>
      <div class="field"><label>Account type</label><p>${profile.role === "creator" ? "Creator" : "Fan"}</p></div>`;
    document.querySelector("#password-form").classList.remove("hidden");
    document.querySelector("#account-logout").classList.remove("hidden");
  } catch (error) {
    details.innerHTML = `<div class="state"><strong>Unable to load account</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

document.querySelector("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await updatePassword(document.querySelector("#new-password").value);
    form.reset();
    toast("Password updated.", "success");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#account-logout").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await signOut();
    location.replace("index.html");
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
  }
});

init();
