import "server-only";

export type SendResult = { ok: boolean; channel: "email" | "whatsapp"; to: string; skipped?: boolean; error?: string };

/** Resend. Without RESEND_API_KEY it logs to the console so local dev still shows what would be sent. */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email:dev] to=${to}\n  ${subject}\n  ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}\n`);
    return { ok: true, channel: "email", to, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
    });
    return res.ok ? { ok: true, channel: "email", to } : { ok: false, channel: "email", to, error: `${res.status} ${await res.text()}` };
  } catch (e) {
    return { ok: false, channel: "email", to, error: String(e) };
  }
}

/**
 * WhatsApp Cloud API, sending a pre-approved utility template (business-initiated messages
 * must use templates). Template names and parameter order are listed in docs/PROCESS.md §5.
 * Without WHATSAPP_TOKEN it logs and reports "skipped", so email carries the message.
 */
export async function sendWhatsApp(to: string, template: string, params: string[], lang?: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.log(`[whatsapp:dev] to=${to} template=${template} params=${JSON.stringify(params)}`);
    return { ok: false, channel: "whatsapp", to, skipped: true };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang || process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          ...(params.length ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] } : {}),
        },
      }),
    });
    return res.ok ? { ok: true, channel: "whatsapp", to } : { ok: false, channel: "whatsapp", to, error: `${res.status} ${await res.text()}` };
  } catch (e) {
    return { ok: false, channel: "whatsapp", to, error: String(e) };
  }
}
