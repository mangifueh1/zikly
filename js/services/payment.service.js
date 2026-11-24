import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";

export async function initiatePayment({ targetType, targetId, phone, redirectUrl }) {
  if (DEMO_MODE) throw new Error("Payment unavailable in demo mode. Configure Supabase and Fapshi.");
  await supabaseReady;
  const { data, error } = await supabase.functions.invoke("initiate-payment", {
    body: { target_type: targetType, target_id: targetId, phone, redirect_url: redirectUrl },
  });
  if (error) throw await functionError(error);
  return data;
}

export async function checkPaymentStatus(paymentId) {
  if (DEMO_MODE) throw new Error("Payment unavailable in demo mode.");
  await supabaseReady;
  const { data, error } = await supabase.functions.invoke("check-payment-status", {
    body: { payment_id: paymentId },
  });
  if (error) throw await functionError(error);
  return data;
}

async function functionError(error) {
  let message = error.message || "Payment service is unavailable.";
  const status = error.context?.status;
  if (error.context?.clone) {
    try {
      const body = await error.context.clone().json();
      message = body.error || message;
    } catch {
      // The function may return a non-JSON error body.
    }
  }
  const result = new Error(message);
  result.status = status;
  return result;
}
