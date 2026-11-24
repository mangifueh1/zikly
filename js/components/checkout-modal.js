import { openModal } from "./modal.js";
import { formatXaf, escapeHtml } from "../utils/format.js";
import { initiatePayment, checkPaymentStatus } from "../services/payment.service.js";
import { saveLocalSubscription } from "../services/artist.service.js";
import { toast } from "./toast.js";

export function openCheckout({ title, price, targetType, targetId }) {
  let submitting = false;
  let paymentId = null;
  const isSubscription = targetType === "subscription";
  const modal = openModal(`
    <div class="modal-header">
      <div><span class="eyebrow">${isSubscription ? "Creator subscription" : "Unlock content"}</span><h2>${escapeHtml(title)}</h2></div>
      <button class="modal-close" type="button" aria-label="Close">&times;</button>
    </div>
    <form id="checkout-form" class="form-stack">
      <div class="state">
        <div class="muted">${isSubscription ? "One-time payment · 30 days of access" : "One-time unlock"}</div>
        <strong>${formatXaf(price)}</strong>
      </div>
      <button class="btn btn-accent" type="submit">Continue to secure checkout</button>
    </form>
    <div id="payment-state" class="hidden"></div>
  `);
  modal.backdrop.querySelector(".modal-close").addEventListener("click", modal.close);
  const form = modal.backdrop.querySelector("#checkout-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    const submit = form.querySelector("button");
    submit.disabled = true;
    submit.textContent = "Opening checkout...";
    try {
      const redirectUrl = `${location.origin}/vault.html`;
      const result = await initiatePayment({ targetType, targetId, redirectUrl });
      paymentId = result.payment_id;
      form.classList.add("hidden");
      const state = modal.backdrop.querySelector("#payment-state");
      state.classList.remove("hidden");

      if (result.checkout_url) {
        window.open(result.checkout_url, "_blank");
        state.innerHTML = `
          <div class="state">
            <strong>Complete checkout on Fapshi</strong>
            <p>A secure checkout window was opened. Confirm your payment with Mobile Money there.</p>
            <div style="margin: 0.8rem 0;">
              <a class="btn btn-accent btn-small" href="${escapeHtml(result.checkout_url)}" target="_blank">
                <i class="icon-external-link"></i> Reopen checkout window
              </a>
            </div>
            <p class="muted"><i class="icon-loader-circle"></i> Waiting for payment confirmation…</p>
          </div>
        `;
      } else {
        state.innerHTML = `<div class="state"><strong>Payment pending</strong><p>Complete checkout on Fapshi.</p></div>`;
      }
      await poll(state);
    } catch (error) {
      toast(error.message || "Payment could not be initiated.", "error");
      submit.disabled = false;
      submit.textContent = "Continue to secure checkout";
      submitting = false;
    }
  });

  async function poll(state) {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const result = await checkPaymentStatus(paymentId);
        if (result.status === "SUCCESS") {
          if (isSubscription && targetId) {
            saveLocalSubscription(targetId);
          }
          state.innerHTML =
            `<div class="state"><strong>Payment confirmed</strong><p>${isSubscription ? "Your 30-day subscription is active." : "The content is now in your Fan Vault."}</p><a class="btn" href="vault.html">Open Fan Vault</a></div>`;
          return;
        }
        if (["FAILED", "EXPIRED"].includes(result.status)) {
          state.innerHTML =
            `<div class="state"><strong>Payment ${result.status.toLowerCase()}</strong><p>You can close this window and try again.</p></div>`;
          return;
        }
      } catch (error) {
        state.innerHTML = `<div class="state"><strong>Payment status unavailable</strong><p>${escapeHtml(error.message)} Your payment may still be processing. Please check the Fan Vault later.</p><a class="btn" href="vault.html">Open Fan Vault</a></div>`;
        return;
      }
    }
    state.innerHTML = `<div class="state"><strong>Payment is still pending</strong><p>We haven't received confirmation yet. Check your Fan Vault again in a moment.</p><a class="btn" href="vault.html">Open Fan Vault</a></div>`;
  }
}
