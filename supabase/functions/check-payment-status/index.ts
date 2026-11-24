import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { status as getFapshiStatus, normalizeStatus } from "../_shared/fapshi.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { payment_id } = await request.json();
    if (!payment_id) return new Response(JSON.stringify({ error: "payment_id is required." }), { status: 400, headers: corsHeaders });

    const supabase = serviceClient();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: corsHeaders });
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userResult.user) return new Response(JSON.stringify({ error: "Invalid authentication." }), { status: 401, headers: corsHeaders });
    const { data: payment, error } = await supabase
      .from("payments").select("*").eq("id", payment_id).eq("user_id", userResult.user.id).maybeSingle();
    if (error) throw error;
    if (!payment) return new Response(JSON.stringify({ error: "Payment not found." }), { status: 404, headers: corsHeaders });
    if (payment.status === "SUCCESS") return new Response(JSON.stringify({ status: "SUCCESS" }), { headers: corsHeaders });

    if (!payment.trans_id && !payment.external_id) {
      return new Response(JSON.stringify({ status: payment.status }), { headers: corsHeaders });
    }

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
      return new Response(JSON.stringify({ status: payment.status }), { headers: corsHeaders });
    }

    await supabase.rpc("settle_payment", {
      p_payment_id: payment.id,
      p_status: normalized,
      p_fapshi_status: providerStatus.status || null,
      p_payload: providerStatus,
    });
    return new Response(JSON.stringify({ status: normalized }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 502, headers: corsHeaders });
  }
});
