import { DEMO_MODE } from "../config/supabase.js";
import { getCurrentProfile } from "../services/auth.service.js";
import { getFanVault } from "../services/vault.service.js";
import { checkPaymentStatus } from "../services/payment.service.js";
import { escapeHtml } from "../utils/format.js";
import { toast } from "../components/toast.js";

const results = document.querySelector("#vault-results");
const subscriptions = document.querySelector("#vault-subscriptions");
const access = document.querySelector("#vault-access");

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

async function init() {
  if (DEMO_MODE) document.querySelector("#demo-banner").classList.remove("hidden");
  try {
    const profile = await getCurrentProfile();
    if (!profile) return;
    if (profile.role !== "fan") {
      results.innerHTML = `<div class="state"><strong>Fan account required</strong><span>Sign in with a Fan account to access your private vault.</span></div>`;
      return;
    }

    access.classList.add("hidden");

    const params = new URLSearchParams(location.search);
    const returningPaymentId = params.get("payment_id") || params.get("transId") || params.get("trans_id");
    if (returningPaymentId && !DEMO_MODE) {
      toast("Confirming your payment status with Fapshi…", "info");
      try {
        const check = await checkPaymentStatus(returningPaymentId);
        if (check.status === "SUCCESS") {
          toast("Payment confirmed! Your unlocked content is ready below.", "success");
        } else if (["FAILED", "EXPIRED"].includes(check.status)) {
          toast(`Payment ${check.status.toLowerCase()}. You can try again.`, "error");
        }
      } catch (err) {
        console.warn("Payment verification note:", err.message);
      }
      history.replaceState({}, document.title, location.pathname);
    }

    const vault = DEMO_MODE ? { items: [], subscriptions: [] } : await getFanVault();
    const now = Date.now();
    const rows = vault.subscriptions || [];

    // Sync any remote subscriptions to localStorage
    rows.forEach((sub) => {
      if (sub.artist_id && sub.expires_at) {
        localStorage.setItem(`zikly_sub_${sub.artist_id}`, sub.expires_at);
      }
    });

    if (rows.length) {
      subscriptions.classList.remove("hidden");
      subscriptions.innerHTML = `<h2>Your subscriptions</h2><div class="subscription-list">${rows.map((item) => {
        const active = new Date(item.expires_at).getTime() > now;
        return `<div class="subscription-row">
          <strong>${escapeHtml(item.artist_name || "Creator")}</strong>
          <span class="badge ${active ? "" : "locked"}">${active ? "Active" : "Expired"}</span>
          <span>${active ? "Access until" : "Expired"} ${escapeHtml(formatDate(item.expires_at))}</span>
          ${item.artist_slug ? `<a href="artist.html?artist=${encodeURIComponent(item.artist_slug)}">View creator</a>` : ""}
        </div>`;
      }).join("")}</div>`;
    }

    if (!vault.items.length) {
      results.innerHTML = `<div class="state"><i class="icon-library"></i><strong>No eligible content yet</strong><span>Your purchases and current subscriptions will appear here.</span></div>`;
      return;
    }
    results.innerHTML = vault.items.map((item) => `
      <article class="vault-item">
        <div class="vault-item-copy">
          <span class="eyebrow">${item.access === "subscription" ? "Subscription access" : "Purchased"}</span>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.artist_name)} · ${escapeHtml(item.project_title)}</p>
        </div>
        ${item.url && item.track_type === "audio"
          ? `<audio controls preload="none" src="${escapeHtml(item.url)}">Your browser does not support audio playback.</audio>`
          : item.url && item.track_type === "video"
            ? `<video controls preload="none" src="${escapeHtml(item.url)}"></video>`
            : item.url && item.track_type === "image"
              ? `<img class="vault-image" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}">`
              : `<span class="muted">Media file not available</span>`}
        ${item.url && (item.track_type === "audio" || item.track_type === "video")
          ? `<a class="btn btn-secondary btn-small" href="${escapeHtml(item.url)}" download>Download</a>` : ""}
      </article>`).join("");
  } catch (error) {
    results.innerHTML = `<div class="state"><strong>Unable to load your Fan Vault</strong><span>${escapeHtml(error.message)}</span></div>`;
    toast(error.message, "error");
  }
}

init();
