# Deploying the live demo (GitHub → Supabase → Vercel)

## 0. Before you push
```bash
npm run check   # types + lint + 21 smoke tests on a throwaway database
```
`.env.local`, `.data/` (local database and uploads) and `.next/` are git-ignored. Never commit keys.

## 1. Supabase (database + file storage)
1. Create a project. Pick the region closest to Nigeria (usually a European one such as London or Frankfurt) and save the database password.
2. **Project → Connect**, then copy two connection strings into `.env.local`:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL`. The app uses this.
   - **Session pooler** (port **5432**) → `MIGRATION_DATABASE_URL`. Migrations use this.
3. **Storage → New bucket**: name it `belladerma` and make it **Public**. It holds product photos. Payment receipts go to a separate **private** bucket, `belladerma-private`, which the app creates by itself on the first upload. Receipts are only ever shown through short-lived signed links after an admin login.
4. **Project Settings → API**: copy the **Project URL** into `SUPABASE_URL`. It looks like `https://<ref>.supabase.co`; **not** the dashboard address `supabase.com/dashboard/project/…`, which makes uploads fail with 405. Copy and the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`. This key is server-only; never give it a `NEXT_PUBLIC_` name.
5. Create the tables and the first admin:
   ```bash
   npm run db:migrate
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run db:seed
   ```
   `db:seed` adds the 11 products, delivery zones, default settings and the owner admin. It does nothing if an admin already exists. Every table has row-level security switched on (`drizzle/0001_enable_rls.sql`), so Supabase's public Data API can't read or change anything.
6. `npm run dev` keeps using the local database even with `DATABASE_URL` set, because `next dev` hangs on Supabase's pooler. The production build (Vercel) uses Supabase. To point local dev at Supabase anyway, set `USE_REMOTE_DB_IN_DEV=1`.

> Don't run `npm run test:smoke` with `SMOKE_DATABASE_URL` pointing at this project. The smoke test creates test orders and a test admin. Only point it at an empty, throwaway database.

## 2. Vercel (hosting)
1. Push to GitHub, then go to vercel.com → **Add New Project** → import the repo. The defaults are fine.
2. Add the environment variables (Settings → Environment Variables):

| Variable | Live demo value |
|---|---|
| `AUTH_SECRET` | new 64-char random string (`openssl rand -hex 32`); don't reuse the local one |
| `APP_URL` | `https://<your-project>.vercel.app` (or your custom domain). Used in email and WhatsApp links. If it's missing or still `localhost`, the app falls back to Vercel's production address |
| `DATABASE_URL` | Supabase transaction pooler string (6543) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | from step 1: `https://<ref>.supabase.co`, the service_role key, `belladerma` |
| `PAYMENT_PROVIDER` | `mock` for the demo: bank transfer only, online payment shows "Coming soon", and walkthrough hints appear. Set `paystack` when going live |
| `RESEND_API_KEY`, `EMAIL_FROM` | as in `.env.local` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_LANG` | as in `.env.local` (use a permanent token) |
| `CRON_SECRET` | new random string |

3. Deploy, then open `/admin` and sign in with the admin from `db:seed`.
4. Vercel's free Hobby plan runs the housekeeping cron **once a day** (`vercel.json`) and is meant for non-commercial use, which is fine for a demo. For real sales, move to Vercel Pro ($20/mo) and set the cron to hourly (`0 * * * *`), or host on Netlify.

## 3. Demo script for the founder
1. Home → shop by concern → open a product → **Add to bag** → Checkout.
2. Fill in name, WhatsApp phone and **email** (required), then pick a Lagos area and watch the delivery fee update.
3. Payment: **Transfer to Belladerma's account** is selected. "Pay online" shows *Coming soon* (switched on once Paystack/Bachs is finalised).
4. **Place order** → account details + order reference → tap **"I've made the transfer"** (no real transfer needed; the page says so).
5. Admin side: the alert email arrives → **Admin → Orders** → open the order → **"Payment received, confirm"**.
6. Refresh the buyer's page: **Paid** + printable delivery note. Then show Admin → Products (edit a price or photo) and Admin → Delivery (edit a fee).

## Known demo limits
- Prices and some sizes are placeholders (TBC) until Bella Derma confirms them.
- WhatsApp order alerts need Meta to approve the 6 templates (`docs/PROCESS.md` §5). Until then only email goes out.
- Resend sends only to your own account email until `belladerma.com.ng` is verified.
