import { signIn, signUp, resetPassword } from "../services/auth.service.js";
import { isValidEmail } from "../utils/validation.js";
import { toast } from "../components/toast.js";

const form = document.querySelector("#auth-form");
const title = document.querySelector("#auth-title");
const submit = document.querySelector("#auth-submit");
let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === "login";
  title.textContent = isLogin ? "Welcome back" : "Create your account";
  submit.textContent = isLogin ? "Sign in" : "Create account";
  document.querySelector("#auth-switch").textContent = isLogin ? "Create Account" : "Log In";
  document.querySelector("#signup-fields").classList.toggle("hidden", isLogin);
  document.querySelector("#auth-switch-label").textContent =
    isLogin ? "New to Zikly?" : "Already have an account?";
}

document.querySelector("#password-toggle")?.addEventListener("click", (event) => {
  const password = form.password;
  password.type = password.type === "password" ? "text" : "password";
  event.currentTarget.setAttribute("aria-label", password.type === "password" ? "Show password" : "Hide password");
});

document.querySelector("#auth-switch").addEventListener("click", () => {
  setMode(mode === "login" ? "signup" : "login");
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

      if (role === "creator") {
        // Streamline KYC verification modal flow
        submit.disabled = false;
        openKycModal(() => {
          if (result.session) {
            location.href = "dashboard.html";
          } else {
            form.password.value = "";
            setMode("login");
            toast("Creator account & KYC submitted! Please confirm your email before signing in.", "success");
          }
        });
        return;
      }

      if (result.session) {
        location.href = "index.html";
      } else {
        form.password.value = "";
        setMode("login");
        toast("Account created. Check your email and confirm it before signing in.", "success");
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

// KYC Modal Flow
const kycOverlay = document.querySelector("#kyc-modal-overlay");
const closeKycBtn = document.querySelector("#close-kyc-modal");
const toLivenessBtn = document.querySelector("#kyc-to-liveness");
const backToDocBtn = document.querySelector("#kyc-back-to-doc");
const submitKycBtn = document.querySelector("#kyc-submit-verification");
const finishKycBtn = document.querySelector("#kyc-finish-btn");

const viewDoc = document.querySelector("#kyc-view-doc");
const viewLiveness = document.querySelector("#kyc-view-liveness");
const viewProcessing = document.querySelector("#kyc-view-processing");

const step1Indicator = document.querySelector("#kyc-step-1");
const step2Indicator = document.querySelector("#kyc-step-2");
const step3Indicator = document.querySelector("#kyc-step-3");

let onKycCompleteCallback = null;

function openKycModal(onComplete) {
  onKycCompleteCallback = onComplete;
  if (!kycOverlay) {
    if (onComplete) onComplete();
    return;
  }
  // reset view
  viewDoc.classList.remove("hidden");
  viewLiveness.classList.add("hidden");
  viewProcessing.classList.add("hidden");
  step1Indicator.className = "kyc-timeline-step active";
  step2Indicator.className = "kyc-timeline-step";
  step3Indicator.className = "kyc-timeline-step";
  kycOverlay.classList.remove("hidden");
}

if (closeKycBtn) {
  closeKycBtn.addEventListener("click", () => {
    kycOverlay.classList.add("hidden");
    if (onKycCompleteCallback) onKycCompleteCallback();
  });
}

if (toLivenessBtn) {
  toLivenessBtn.addEventListener("click", () => {
    const docNum = document.querySelector("#kyc-id-number").value.trim();
    if (!docNum) {
      toast("Please enter your document ID number.", "error");
      return;
    }
    viewDoc.classList.add("hidden");
    viewLiveness.classList.remove("hidden");
    step1Indicator.className = "kyc-timeline-step completed";
    step2Indicator.className = "kyc-timeline-step active";
  });
}

if (backToDocBtn) {
  backToDocBtn.addEventListener("click", () => {
    viewLiveness.classList.add("hidden");
    viewDoc.classList.remove("hidden");
    step1Indicator.className = "kyc-timeline-step active";
    step2Indicator.className = "kyc-timeline-step";
  });
}

if (submitKycBtn) {
  submitKycBtn.addEventListener("click", () => {
    viewLiveness.classList.add("hidden");
    viewProcessing.classList.remove("hidden");
    step2Indicator.className = "kyc-timeline-step completed";
    step3Indicator.className = "kyc-timeline-step active";
  });
}

if (finishKycBtn) {
  finishKycBtn.addEventListener("click", () => {
    step3Indicator.className = "kyc-timeline-step completed";
    toast("KYC identity verification successfully passed!", "success");
    kycOverlay.classList.add("hidden");
    if (onKycCompleteCallback) onKycCompleteCallback();
  });
}

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
