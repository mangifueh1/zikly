import { signIn, signUp, resetPassword } from "../services/auth.service.js";
import { isValidEmail } from "../utils/validation.js";
import { toast } from "../components/toast.js";

const form = document.querySelector("#auth-form");
const title = document.querySelector("#auth-title");
const submit = document.querySelector("#auth-submit");
let mode = "login";

document.querySelector("#password-toggle")?.addEventListener("click", (event) => {
  const password = form.password;
  password.type = password.type === "password" ? "text" : "password";
  event.currentTarget.setAttribute("aria-label", password.type === "password" ? "Show password" : "Hide password");
});

document.querySelector("#auth-switch").addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  title.textContent = mode === "login" ? "Welcome back" : "Create your account";
  submit.textContent = mode === "login" ? "Sign in" : "Create account";
  document.querySelector("#auth-switch").textContent = mode === "login" ? "Create Account" : "Log In";
  document.querySelector("#signup-fields").classList.toggle("hidden", mode !== "signup");
  document.querySelector("#auth-switch-label").textContent =
    mode === "login" ? "New to Zikly?" : "Already have an account?";
});

document.querySelector("#account-role").addEventListener("change", (event) => {
  const isCreator = event.target.value === "creator";
  document.querySelector("#creator-fields").classList.toggle("hidden", !isCreator);
  form.artistName.required = isCreator;
  form.slug.required = isCreator;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!isValidEmail(email) || password.length < 8) {
    toast("Use a valid email and a password of at least 8 characters.", "error");
    return;
  }
  const role = form.role.value;
  const artistName = form.artistName.value.trim();
  const slug = form.slug.value.trim().toLowerCase();
  if (mode === "signup" && role === "creator" &&
      (!artistName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    toast("Enter a creator name and a valid profile URL using letters, numbers, and hyphens.", "error");
    return;
  }
  submit.disabled = true;
  try {
    if (mode === "signup") {
      const result = await signUp({
        email,
        password,
        role,
        artistName,
        slug,
      });
      if (result.session) {
        location.href = role === "creator" ? "dashboard.html" : "index.html";
      } else {
        toast("Account created. Check your email to verify it before signing in.", "success");
      }
    } else {
      const result = await signIn(email, password);
      location.href = result.role === "creator" ? "dashboard.html" : "index.html";
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#reset-password").addEventListener("click", async () => {
  try {
    const email = form.email.value.trim();
    if (!isValidEmail(email)) throw new Error("Enter your account email first.");
    await resetPassword(email);
    toast("Password reset email sent.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
});
