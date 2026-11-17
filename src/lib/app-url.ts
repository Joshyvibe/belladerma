/**
 * Public base URL for links in emails, WhatsApp messages and payment callbacks.
 * Uses APP_URL, except on Vercel when it is missing or still points at localhost (an easy
 * mistake when copying .env.local): then Vercel's own production address is used.
 */
export function appUrl() {
  const set = process.env.APP_URL?.trim().replace(/\/+$/, "");
  const local = !set || /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(set);
  if (set && !(local && process.env.VERCEL)) return set;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return set || "http://localhost:3000";
}
