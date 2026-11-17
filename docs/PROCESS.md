# Belladerma Shop: Process Breakdown, Costs & Decisions

_17 Nov 2026. Builds on the original plan (`~/Downloads/plan.md`). This doc changes it in four ways: a multi-product catalogue with a cart, an admin panel, WhatsApp notifications, and a provider-agnostic payments layer._

---

## 1. What we know about the catalogue (public sources only)

From public Instagram post captions (@belladermaskin):

| Product | Evidence | Status |
|---|---|---|
| **Sunscreen SPF 50+** (UVA/UVB) | "Enjoy 20% OFF Belladerma SPF 50+" | Hero product, on sale |
| **PDRN 100 Serum** | "Meet the newest addition to the Belladerma family: PDRN 100 Serum… hydrated, smooth, fresh and radiant" | New launch (Nov 2026) |
| **Acne Control** | "Make Belladerma Acne Control part of your targeted skincare routine" | Exact format (gel/serum/wash) unknown |
| Others | The profile photo shows ~6 items: jars, tubes, a purple box | **Names unknown.** The client adds them from the admin panel |

Brand concerns (from the bio): **Acne · Dark spots · Barrier care**, plus sun protection. The store groups products by these concerns.

> Prices, sizes, ingredients and photos are **not public**. The seed data uses placeholders flagged "TBC". The client edits everything from Admin → Products, so no code change is needed.

---

## 2. Recommended stack and why

| Need | Pick | Why this and not something else |
|---|---|---|
| Web app (shop + admin + API) | **Next.js (App Router) + TypeScript** | One codebase for the storefront, admin and webhooks. Huge talent pool, easy to hand over |
| Database | **Postgres via Supabase** (prod); **PGlite** (local dev, zero setup) | Relational fits orders and money. Same SQL locally and in prod |
| ORM | **Drizzle** | Thin, typed, works with both drivers above |
| File storage (product photos, receipts) | **Supabase Storage** (prod), local disk (dev) | Already in Supabase, free 1 GB |
| Admin auth | Built-in email + password (bcrypt) + signed HTTP-only cookie | 1–3 admins. No need for a paid auth service |
| Online payments | **Payment adapter**: Paystack implemented, Bachs stubbed | Bachs has no public API docs or fees (see §6). Paystack is the documented Nigerian standard. Switching is a one-line config change |
| Email | **Resend** | Free 3,000/month (100/day) |
| WhatsApp | **WhatsApp Cloud API (direct from Meta, no reseller)** | About $0.0067 per utility message to a Nigerian number. Cheap enough to use (see §5) |
| Hosting | **Netlify Free** or **Vercel Pro** | Vercel's free Hobby plan is for non-commercial use only, so a shop needs Pro ($20/mo). Netlify Free allows commercial sites |
| Scheduled jobs | Platform cron hitting `/api/cron/housekeeping` | Auto-cancel stale orders, re-alert admins, and keep Supabase free from pausing |

---

## 3. Monthly running cost

Assumptions: ~200 orders/month, ₦1,500 ≈ $1 (adjust to today's rate). Third-party rates are from 2026 aggregator sources. **Verify them on the official pricing pages before quoting the client.**

| Item | Launch (lean) | Growth |
|---|---|---|
| Hosting | Netlify Free **$0** (or Vercel Pro $20) | Vercel Pro **$20** |
| Database + storage | Supabase Free **$0**\* | Supabase Pro **$25** |
| Email | Resend Free **$0** | Resend Pro $20 (only above 3,000/mo) |
| WhatsApp | ~1,000 msgs × $0.0067 ≈ **$7 (~₦10k)** | Scales with orders |
| Domain | Existing belladerma.com.ng | — |
| **Fixed total** | **≈ $7/mo (~₦10k)** | **≈ $45–70/mo** |
| Payment fees (per order) | Paystack: 1.5% + ₦100, ₦100 waived under ₦2,500, capped at ₦2,000. A ₦20,000 order ≈ **₦400** | Same |
| Bank transfer option | **₦0** gateway fee (costs admin time instead) | — |

\* Supabase Free pauses after 7 days with no activity. The daily housekeeping cron keeps it awake. Move to Pro once the shop makes steady sales.

---

## 4. Order lifecycle (statuses)

```
               ┌──────────── online (Paystack/Bachs) ────────────┐
NEW ORDER ─────┤                                                  ├──► PAID ──► PROCESSING ──► DISPATCHED ──► DELIVERED
               └─ transfer ─► AWAITING_TRANSFER ─► AWAITING_CONFIRMATION ─┘
                                     │                    │
                                     ▼                    ▼
                                 CANCELLED            REJECTED (buyer can retry / chat)
PENDING_PAYMENT ─► FAILED | CANCELLED (48h) | ON_HOLD (underpaid)
Any paid order ─► REFUNDED (admin, manual)
```

Rules:
- Only the **server** computes prices, discounts and delivery fees. The browser sends only product IDs, quantities and the location.
- An order becomes `PAID` only through a **verified provider webhook/verification** or an **admin confirmation**, never because the browser says so.
- Every status change is written to `order_events` (who, when, from → to, note). That's the audit trail.
- Status changes are idempotent. Confirming an already-paid order does nothing.

---

## 5. Notifications

### Channel decision
- **Customer → shop (free):** `wa.me` click-to-chat links with a pre-filled message ("Hi, I'm asking about order BD-…"). Cost ₦0, no setup. Used on every page.
- **Shop → customer and shop → admin (automated):** WhatsApp Cloud API **utility templates**, with email as the fallback, plus a link in every message.
  - Cost ≈ $0.0067/message to Nigerian numbers (marketing messages cost ~8× more, so we send **utility only**: order updates, no promos).
  - Since 1 Oct 2026, in-window messages are reportedly billed too, so budget every message.
  - **Coexistence:** Meta now lets the existing WhatsApp Business **app** number also run on the API, so the team keeps chatting on the phone as today. Needs app v2.24.17+ and a number with real history.
  - If WhatsApp is not set up yet, the app sends **email only**. Turning WhatsApp on means adding 3 environment variables, not a rebuild.

### Who gets what

| Event | Customer | Admin(s) |
|---|---|---|
| Order placed (online) | — (they're on the checkout page) | — |
| Online payment confirmed | ✅ "Payment received" + order/delivery-note link | ✅ "New paid order BD-… ready to pack" |
| Transfer order created | ✅ Bank details + order ref | — |
| Buyer clicks "I've paid" | ✅ "We're confirming your payment" | ✅ **"Confirm ₦X from NAME for BD-…"** + one-tap link |
| Admin confirms transfer | ✅ "Payment confirmed" + delivery note | ✅ (other admins) "Confirmed by X" |
| Admin rejects transfer | ✅ Reason + WhatsApp link | — |
| Dispatched | ✅ Courier + tracking | — |
| Delivered | ✅ Thank-you (+ review link later) | — |
| Transfer pending > 12h | — | ✅ Reminder |
| Low stock (≤ threshold) | — | ✅ Email |

### WhatsApp templates to submit to Meta (utility category)
1. `order_payment_received`: "Hi {{1}}, we've received ₦{{2}} for order {{3}}. View your delivery note: {{4}}"
2. `order_transfer_pending`: "Hi {{1}}, thanks for order {{3}}. We're confirming your transfer of ₦{{2}} and will update you shortly."
3. `order_dispatched`: "Hi {{1}}, order {{2}} is on its way with {{3}}. Tracking: {{4}}"
4. `order_rejected`: "Hi {{1}}, we couldn't confirm payment for order {{2}}: {{3}}. Reply here and we'll help."
5. `admin_confirm_transfer`: "Transfer to confirm: ₦{{1}} from {{2}} for {{3}}. Review: {{4}}"
6. `admin_new_paid_order`: "New paid order {{1}}: ₦{{2}}, {{3}} item(s), deliver to {{4}}. {{5}}"

Templates usually take 1–2 days to be approved.

---

## 6. Payments

### Online
- **Why an adapter:** Bachs (the client's choice) publishes no API docs, signature spec or fees. Searches found only its WooCommerce plugin listing. We can't safely build a live integration against it until they send the developer docs and sandbox keys.
- **What's built:** `PaymentProvider` interface → `paystack` (fully implemented: initialize → redirect/popup → webhook with `x-paystack-signature` HMAC-SHA512 check → verify call) and `bachs` (stub with the plan's event mapping, filled in once docs arrive).
- Pick the provider with `PAYMENT_PROVIDER=paystack|bachs`.
- **Recommendation to the client:** launch on Paystack (known fees, instant onboarding with CAC docs) and switch to Bachs later if its fees are better. Customers won't notice.

### Bank transfer (company account)
1. Checkout creates the order as `AWAITING_TRANSFER` and shows the bank, account name, number, exact amount and **order ref as narration**, with copy buttons.
2. The buyer taps **"I've made the transfer"** (optionally uploading a receipt, image or PDF up to 5 MB) → `AWAITING_CONFIRMATION`.
3. Admins get a WhatsApp/email alert with a **signed, single-use link (72h)**. It opens a confirm page, never acting on the click alone, so link scanners can't confirm payments.
4. The admin checks the bank app, then taps **Confirm** or **Reject (with a reason)**. This also works from Admin → Orders.
5. Housekeeping: no "I've paid" after 48h → `CANCELLED`. Unconfirmed after 12h → reminder to admins.

---

## 7. Customer journey

1. **Home:** hero (SPF promo), shop by concern (Acne · Dark spots · Barrier care · Sun protection), product grid, myth-busting block, delivery info, WhatsApp button.
2. **Product page:** gallery, price/sale, size, benefits, how to use, ingredients, "Add to bag", "Ask on WhatsApp".
3. **Bag:** a drawer that keeps items between visits (stored in the browser), with qty +/-.
4. **Checkout (one page):** contact (name, **WhatsApp phone required**, email optional), delivery (State → Lagos area → address, or pickup), live delivery fee and ETA, payment choice, then Place order.
5. **Order page** `/order/BD-…?t=<token>`: status timeline, transfer details or payment retry, receipt upload, delivery note once paid, WhatsApp help link. The link is private to the buyer (signed token), so there are no customer accounts.
6. **Delivery note** `/order/BD-…/note?t=…`: printable, and saves as a PDF from the browser.

---

## 8. Admin panel (`/admin`)

| Screen | What admins can do |
|---|---|
| **Login** | Email + password. Rate-limited. Sessions expire after 7 days |
| **Dashboard** | Today's revenue, orders needing action (awaiting confirmation, paid not dispatched), low stock |
| **Orders** | Filter by status, search by ref/phone. Open an order to confirm/reject a transfer, view the receipt, mark processing/dispatched (courier + tracking)/delivered, add notes, see the event log, print the delivery note |
| **Products** | Add/edit: name, slug, concern, short/long description, size, price, sale price, stock, low-stock threshold, how to use, ingredients, images (upload), active/featured toggles |
| **Delivery zones** | Edit fee/ETA per zone and the free-delivery threshold, without a code change |
| **Settings** | Bank details shown at checkout, admin notification phone numbers and emails, WhatsApp number |
| **Admins** | Add/remove admin users (owner role only) |

Roles: `owner` (everything) and `staff` (orders + products; no settings or admins).

---

## 9. Security checklist (built in)
- Server-side pricing, so tampering with the cart can't change the total.
- Webhook signature check + amount/currency match before marking paid.
- Signed, expiring, single-use admin action tokens, with POST-only confirmation pages.
- Bcrypt passwords, HTTP-only `SameSite=Lax` secure cookies, login rate limiting.
- Receipt uploads: type and size checks, random file names, served only to admins.
- Buyer order pages need an HMAC token (no guessing other people's orders by ref).
- Personal data limited to what delivery needs (Nigeria Data Protection Act 2023): name, phone, address, optional email. Add a short privacy notice.

---

## 10. Build phases

| # | Deliverable | Status |
|---|---|---|
| 0 | Demo page for the client pitch (`../bella-derma-demo`) | ✅ Done |
| 1 | Scaffold: catalogue, bag, checkout, delivery calc, order page, delivery note, admin (orders, products, zones, settings), transfer confirm flow, notification + payment adapters | ✅ Built & tested locally (`belladerma-shop/`) |
| 2 | Paystack test keys end-to-end, Resend domain, Supabase project + storage | Needs accounts |
| 3 | WhatsApp: Meta Business verification, number (coexistence), template approval | Needs client's Meta access |
| 4 | Real product data and photos, NAFDAC no., bank details, zone prices | Needs client |
| 5 | Mobile QA, go live, swap the Instagram link | — |
| 6 (later) | Bachs adapter, discount codes, reviews, abandoned-bag WhatsApp nudges (marketing rate) | — |

---

## 11. Still needed from Bella Derma
- [ ] Full product list: names, sizes, prices, sale prices, ingredients, directions, photos
- [ ] NAFDAC registration number(s), one per product if they differ
- [ ] Bank name, account name, account number
- [ ] Admin names, emails, WhatsApp numbers
- [ ] Confirm the zone fees + free-delivery threshold, and the courier they use
- [ ] Paystack account (CAC docs) or Bachs developer docs + sandbox keys
- [ ] Meta Business Manager access for WhatsApp setup
- [ ] Domain DNS access (belladerma.com.ng is down)

## 12. Sources
- Instagram @belladermaskin public posts (products, promo, NAFDAC, name change)
- WhatsApp Nigeria rates: [srileo.com](https://srileo.com/tools/whatsapp-api-pricing-calculator/nigeria/), [flowcall.co](https://www.flowcall.co/blog/whatsapp-business-api-pricing), [cylique.com](https://cylique.com/whatsapp-business-api-nigeria-full-pricing-breakdown/)
- WhatsApp coexistence: [chakrahq.com](https://chakrahq.com/article/whatsapp-business-app-api-coexistence-2026/amp/), [telnyx.com](https://telnyx.com/release-notes/whatsapp-coexistence)
- Paystack fees: [kolonell.com](https://kolonell.com/en/blog/paystack-vs-flutterwave-fees-breakdown-nigeria-2026), [afrotools.com](https://afrotools.com/tools/payment-fee-calculator/)
- Supabase limits: [jetadmin.io](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/), [automationatlas.io](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- Resend free tier: [resend.com/blog/new-free-tier](https://resend.com/blog/new-free-tier)
- Bachs: only the WordPress plugin listing is public. No API docs or fees found
