"use server";

import { redirect } from "next/navigation";
import { claimTransfer, getOrder, transition } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { saveUpload, validateUpload } from "@/lib/storage";
import { checkOrderToken, orderToken } from "@/lib/tokens";

async function load(ref: string, token: string) {
  const order = checkOrderToken(ref, token) ? await getOrder({ ref }) : null;
  if (!order) throw new Error("Order not found");
  return order;
}
const page = (ref: string, extra = "") => `/order/${ref}?t=${orderToken(ref)}${extra}`;

export async function claimTransferAction(ref: string, token: string, _prev: unknown, form: FormData) {
  const order = await load(ref, token);
  if (!["AWAITING_TRANSFER", "REJECTED"].includes(order.status)) redirect(page(ref));
  const file = form.get("receipt");
  let receipt: string | null = null;
  if (file instanceof File && file.size > 0) {
    const problem = validateUpload(file, { allowPdf: true });
    if (problem) return { error: problem };
    try {
      receipt = await saveUpload(file, "private/receipts");
    } catch (e) {
      console.error("receipt upload failed", e);
      return { error: "We couldn't upload your receipt. Try again, or remove the file and tap the button. The receipt is optional." };
    }
  }
  await claimTransfer(order, receipt);
  redirect(page(ref));
}

export async function retryOnlineAction(ref: string, token: string) {
  const order = await load(ref, token);
  if (order.status === "FAILED") await transition(order.id, "PENDING_PAYMENT", "customer", { note: "Retrying payment" });
  if (!["PENDING_PAYMENT", "FAILED"].includes(order.status)) redirect(page(ref));
  const { redirectUrl } = await paymentProvider().initialize(order);
  redirect(redirectUrl);
}

export async function switchToTransferAction(ref: string, token: string) {
  const order = await load(ref, token);
  await transition(order.id, "AWAITING_TRANSFER", "customer", {
    note: "Switched to bank transfer", patch: { paymentMethod: "transfer" },
  });
  redirect(page(ref));
}
