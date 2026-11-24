import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { initiatePay } from "../_shared/fapshi.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await request.json();
    const targetType = body.target_type;
    const targetId = body.target_id;
    const phone = String(body.phone || "").replace(/\D/g, "");
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Sign in with a fan account to pay." }), { status: 401, headers: corsHeaders });

    if (!["project", "track", "subscription"].includes(targetType) || !targetId) {
      return new Response(JSON.stringify({ error: "Invalid purchase target." }), { status: 400, headers: corsHeaders });
    }
    if (phone && !/^237(6\d{8}|2\d{8})$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid Cameroon phone number." }), { status: 400, headers: corsHeaders });
    }

    const supabase = serviceClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userResult.user) return new Response(JSON.stringify({ error: "Invalid authentication." }), { status: 401, headers: corsHeaders });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", userResult.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "fan") return new Response(JSON.stringify({ error: "Only fan accounts can make purchases." }), { status: 403, headers: corsHeaders });

    let target: { id: string; artist_id: string; title: string; is_paid: boolean; price_xaf: number; is_published: boolean } | null = null;
    if (targetType === "subscription") {
      const { data, error } = await supabase
        .from("artists")
        .select("id,user_id,name,subscription_price_xaf")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw error;
      if (data && data.user_id !== userResult.user.id && data.subscription_price_xaf) {
        target = {
          id: data.id,
          artist_id: data.id,
          title: `${data.name} creator subscription`,
          is_paid: true,
          price_xaf: data.subscription_price_xaf,
          is_published: true,
        };
      }
    } else
    if (targetType === "project") {
      const { data, error } = await supabase
        .from("projects").select("id,artist_id,title,is_paid,price_xaf,is_published").eq("id", targetId).maybeSingle();
      if (error) throw error;
      target = data;
    } else {
      const { data, error } = await supabase
        .from("tracks").select("id,project_id,title,is_paid,price_xaf,projects(artist_id,is_published)").eq("id", targetId).maybeSingle();
      if (error) throw error;
      target = data ? {
        id: data.id,
        artist_id: data.projects?.artist_id,
        title: data.title,
        is_paid: data.is_paid,
        price_xaf: data.price_xaf,
        is_published: data.projects?.is_published,
      } : null;
    }

    if (!target || !target.is_published || !target.is_paid || !target.price_xaf || target.price_xaf < 100) {
      return new Response(JSON.stringify({ error: "Content is unavailable or free." }), { status: 400, headers: corsHeaders });
    }

    const targetColumn = targetType === "subscription"
      ? "artist_id"
      : targetType === "project" ? "project_id" : "track_id";
    let existingQuery = supabase
      .from("payments")
      .select("id,status,external_id")
      .eq("user_id", userResult.user.id)
      .eq("payment_type", targetType === "subscription" ? "subscription" : "media")
      .in("status", ["PENDING", "INITIATION_UNKNOWN"])
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    existingQuery = existingQuery.eq(targetColumn, targetId);
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ payment_id: existing.id, status: existing.status, duplicate: true }), { headers: corsHeaders });
    }

    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: userResult.user.id,
        payment_type: targetType === "subscription" ? "subscription" : "media",
        amount_xaf: target.price_xaf,
        artist_id: target.artist_id,
        project_id: targetType === "project" ? targetId : null,
        track_id: targetType === "track" ? targetId : null,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      let redirectUrl = body.redirect_url || null;
      if (redirectUrl) {
        const sep = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl = `${redirectUrl}${sep}payment_id=${payment.id}`;
      }
      const fapshi = await initiatePay({
        amount: target.price_xaf,
        userId: userResult.user.id,
        externalId: payment.id,
        message: `Zikly: ${target.title}`,
        ...(redirectUrl ? { redirectUrl } : {}),
      });
      const externalId = fapshi.transId || fapshi.trans_id || fapshi.transactionId;
      if (!externalId) throw new Error("Fapshi returned no transaction ID.");
      await supabase.from("payments").update({
        external_id: externalId || null,
        trans_id: fapshi.transId || fapshi.trans_id || null,
        fapshi_status: fapshi.status || "PENDING",
      }).eq("id", payment.id);
      await supabase.from("payment_events").insert({
        payment_id: payment.id,
        event_type: "INITIATED",
        payload: fapshi,
      });
      return new Response(JSON.stringify({
        payment_id: payment.id,
        status: "PENDING",
        checkout_url: fapshi.link,
      }), { headers: corsHeaders });
    } catch (error) {
      await supabase.from("payments").update({ status: "INITIATION_UNKNOWN" }).eq("id", payment.id);
      await supabase.from("payment_events").insert({
        payment_id: payment.id,
        event_type: "INITIATION_UNKNOWN",
        payload: { message: error.message },
      });
      return new Response(JSON.stringify({
        payment_id: payment.id,
        status: "INITIATION_UNKNOWN",
        error: "The payment provider did not return a confirmed initiation.",
      }), { status: 502, headers: corsHeaders });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
