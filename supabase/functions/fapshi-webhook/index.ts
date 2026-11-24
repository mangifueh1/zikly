import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { status as getFapshiStatus, normalizeStatus } from "../_shared/fapshi.ts";

async function verifySignature(rawBody: string, signature: string | null) {
  const secret = Deno.env.get("FAPSHI_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const expected = new TextEncoder().encode(secret);
  const received = new TextEncoder().encode(signature);
  if (expected.length !== received.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) {
    mismatch |= expected[index] ^ received[index];
  }
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const rawBody = await request.text();
  const signature = request.headers.get("x-wh-secret");
  if (!await verifySignature(rawBody, signature)) {
    return new Response(JSON.stringify({ error: "Invalid webhook signature." }), { status: 401, headers: corsHeaders });
  }

  try {
    const payload = JSON.parse(rawBody);
    const transId = payload.transId || payload.trans_id || payload.transactionId || payload.externalId;
    if (!transId) return new Response(JSON.stringify({ error: "Missing transaction identifier." }), { status: 400, headers: corsHeaders });

    const supabase = serviceClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .or(`external_id.eq.${transId},trans_id.eq.${transId}`)
      .maybeSingle();
    if (error) throw error;
    if (!payment) return new Response(JSON.stringify({ error: "Unknown payment." }), { status: 404, headers: corsHeaders });

    const providerStatus = await getFapshiStatus(payment.trans_id || payment.external_id);
    const normalized = normalizeStatus(providerStatus.status || providerStatus.paymentStatus);
    const reportedAmount = Number(providerStatus.amount || providerStatus.amountXAF || 0);
    if (reportedAmount && reportedAmount !== payment.amount_xaf) {
      throw new Error("Fapshi reported amount does not match the stored payment amount.");
    }
    if (providerStatus.externalId && providerStatus.externalId !== payment.id) {
      throw new Error("Fapshi externalId does not match the stored payment.");
    }
    if (normalized === "PENDING") {
      return new Response(JSON.stringify({ received: true, status: payment.status }), { headers: corsHeaders });
    }

    await supabase.rpc("settle_payment", {
      p_payment_id: payment.id,
      p_status: normalized,
      p_fapshi_status: providerStatus.status || null,
      p_payload: payload,
    });
    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 502, headers: corsHeaders });
  }
});
