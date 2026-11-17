# Belladerma Shop

Storefront, checkout and admin panel for Belladerma Skincare: a multi-product shop with
zone-based delivery fees, online payments (Paystack now, Bachs later), bank transfers confirmed
by an admin, WhatsApp + email notifications, and printable delivery notes.

**Read [`docs/PROCESS.md`](docs/PROCESS.md) first.** It covers every flow, the order statuses, who gets notified when, the costs, and what's still needed from the client.

## Run locally (no accounts needed)

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET to a long random string
npm run dev
```

- Shop: http://localhost:3000 · Admin: http://localhost:3000/admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`)
- The database is embedded PGlite in `.data/pglite`. It is created, migrated and seeded with the three known products, delivery zones and the first admin on first request. `npm run db:reset` (with the server stopped) starts it again from scratch.
- `PAYMENT_PROVIDER=mock` gives a fake checkout page so the whole flow can be demoed (online too, with `ALLOW_MOCK_PAYMENTS=1`).
- `npm run test:smoke` runs 21 end-to-end checks (pricing, both payment paths, duplicates, tokens, webhook signatures) on a throwaway database.
- The product range lives in `src/db/catalog.ts` (photos in `public/products/`). After editing it, run `npm run catalog:sync` with the dev server stopped. It updates products by slug and never touches orders, admins or stock counts. Day-to-day edits belong in Admin → Products.
- With no Resend/WhatsApp keys set, every notification is printed in the server console and logged in the order's activity feed.

## What's where

| Path | What |
|---|---|
| `src/app/(shop)` | Home, product pages, bag, checkout, buyer order page, delivery note, demo gateway |
| `src/app/admin` | Login, dashboard, orders (confirm / reject / dispatch), products, delivery fees, settings & admins, one-tap confirm page |
| `src/app/api` | Payment webhook + return callback, hourly housekeeping cron, file serving |
| `src/lib/orders.ts` | Order engine: placing orders, allowed status changes, audit log, stock, applying payment results |
| `src/lib/pricing.ts` | Shared price / delivery-zone maths (the server always recalculates) |
| `src/lib/payments/` | `paystack.ts` (done), `bachs.ts` (stub, waiting on Bachs's API docs), `mock` |
| `src/lib/notify/` | WhatsApp Cloud API templates + Resend email, per event |
| `src/db/` | Drizzle schema, connection (PGlite locally / Postgres in prod), seed data |

## Deploying

Step-by-step for the live demo (Supabase + Vercel): **[`docs/DEPLOY.md`](docs/DEPLOY.md)**. Run `npm run check` before every push.

## Go live checklist

1. **Supabase:** create a project and a storage bucket `belladerma` (public read for `public/`). Set `DATABASE_URL` (transaction pooler, port 6543), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. `DATABASE_URL=… npm run db:migrate`, then `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:seed`.
3. **Paystack:** set `PAYMENT_PROVIDER=paystack` and `PAYSTACK_SECRET_KEY`. In the Paystack dashboard, set the webhook URL to `https://<domain>/api/payments/webhook/paystack`.
4. **Resend (email):** free for 3,000 emails/month (100/day).
   - Sign up at resend.com → **API Keys** → create a key with "Sending access". Put it in `.env.local` as `RESEND_API_KEY=re_…`.
   - **To test right away:** set `EMAIL_FROM=Belladerma <onboarding@resend.dev>`. In this mode Resend only delivers to the email you signed up with, so give your admin user that email.
   - **For real customers:** in Resend, open **Domains** → add `belladerma.com.ng` (or a subdomain such as `mail.belladerma.com.ng`), then add the DNS records it shows (DKIM TXT, SPF TXT + MX on the `send` subdomain) at the domain registrar. Once it shows "Verified", set `EMAIL_FROM=Belladerma <orders@belladerma.com.ng>`.
   - Check it with Admin → Settings → Integrations → **Send test email**.
5. **WhatsApp:** after Meta Business verification, submit the 6 utility templates listed in `docs/PROCESS.md` §5. Then set `WHATSAPP_TOKEN` (a permanent system-user token; the temporary one from API Setup expires after 24h) and `WHATSAPP_PHONE_NUMBER_ID`. To check the connection, add your WhatsApp number to your admin user and use **Send test WhatsApp**. It sends Meta's built-in `hello_world` template, so it works before our templates are approved. While the app is in Meta's test mode, the recipient must be on the "To" list in API Setup.
6. **Hosting:** set `APP_URL`, `AUTH_SECRET` and `CRON_SECRET`. `vercel.json` runs the cron hourly (Vercel Pro). On other hosts, call `GET /api/cron/housekeeping` with `Authorization: Bearer $CRON_SECRET`.
7. In **Admin → Settings**, enter the real bank details, NAFDAC number and admin WhatsApp numbers. In **Products**, add real prices and photos plus the rest of the range.
