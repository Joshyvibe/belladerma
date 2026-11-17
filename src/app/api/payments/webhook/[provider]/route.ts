import { NextResponse } from "next/server";
import { applyPaymentResult } from "@/lib/orders";
import { providerByName } from "@/lib/payments";

// Point the gateway's webhook URL at /api/payments/webhook/paystack (or /bachs).
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = providerByName((await params).provider);
  if (!provider || provider.name === "mock") return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const raw = await req.text(); // signature is computed over the exact raw body
  let result;
  try {
    result = await provider.parseWebhook(raw, req.headers);
  } catch (e) {
    console.error(`webhook ${provider.name} not configured`, e);
    return NextResponse.json({ error: "provider not configured" }, { status: 503 });
  }
  if (!result) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const outcome = await applyPaymentResult(result);
  // Always 200 for a valid signature so the gateway stops retrying; the outcome is in our logs.
  return NextResponse.json({ ok: true, outcome });
}
