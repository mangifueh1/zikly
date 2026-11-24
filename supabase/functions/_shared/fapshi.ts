export function fapshiHeaders() {
  return {
    "Content-Type": "application/json",
    "apiuser": Deno.env.get("FAPSHI_API_USER") || "",
    "apikey": Deno.env.get("FAPSHI_API_KEY") || "",
  };
}

export async function initiatePay(payload: Record<string, unknown>) {
  const baseUrl = Deno.env.get("FAPSHI_BASE_URL");
  const path = Deno.env.get("FAPSHI_INITIATE_PAY_PATH") || "/initiate-pay";
  if (!baseUrl) throw new Error("Fapshi is not configured.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: fapshiHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Fapshi initiation failed.");
  return body;
}

export async function status(transactionId: string) {
  const baseUrl = Deno.env.get("FAPSHI_BASE_URL");
  const path = Deno.env.get("FAPSHI_STATUS_PATH");
  if (!baseUrl || !path) throw new Error("Fapshi status verification is not configured.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}/${encodeURIComponent(transactionId)}`, {
    method: "GET",
    headers: fapshiHeaders(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Fapshi status check failed.");
  return body;
}

export function normalizeStatus(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (["SUCCESSFUL", "SUCCESS", "COMPLETED", "PAID"].includes(status)) return "SUCCESS";
  if (["FAILED", "FAILURE", "CANCELLED", "CANCELED"].includes(status)) return "FAILED";
  if (["EXPIRED", "EXPIRE"].includes(status)) return "EXPIRED";
  if (["PENDING", "CREATED", "INITIATED", "IN_PROGRESS"].includes(status)) return "PENDING";
  return "INITIATION_UNKNOWN";
}
