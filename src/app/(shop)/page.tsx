import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ProductCard } from "@/components/ProductCard";
import { RoutineCard } from "@/components/RoutineCard";
import { cartLine, listProducts, routineSteps } from "@/lib/catalog";
import { CONCERN_LABELS, naira, waLink } from "@/lib/format";
import { ROUTINES } from "@/lib/routines";
import { getSettings } from "@/lib/settings";
import { isDemoMode } from "@/lib/payments";
import { homeSampleReviews } from "@/lib/sample-reviews";
import { ReviewCard, SAMPLE_NOTE } from "@/components/Reviews";

const FAQ: [string, string][] = [
  ["Which products should I start with?", "Start with the basics: a cleanser, one treatment for your main concern, a moisturiser and daily SPF. The routines above put this together for you. Not sure? Message us on WhatsApp and we'll suggest a routine for your skin."],
  ["Are your products made for dark skin?", "Yes. Belladerma is targeted skincare for melanin-rich skin, focused on acne, dark spots and barrier care. Every product is NAFDAC registered."],
  ["How long does delivery take?", "Lagos orders usually arrive in 1–2 days. Other states take 2–5 days depending on location. You'll see the exact fee and delivery time at checkout before you pay."],
  ["How do I pay?", "Transfer to Belladerma's company account using your order reference. Once we confirm it, usually within a few hours, you'll get a confirmation and your delivery note by email and WhatsApp."],
  ["Is Belladerma the same as Purederma?", "Yes. We renamed from Purederma Skincare to Belladerma to align with trademark rules and NAFDAC registration. Same team, same care."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ concern?: string }> }) {
  const { concern } = await searchParams;
  const db = await getDb();
  const [products, zones, settings] = await Promise.all([
    listProducts(),
    db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sort)),
    getSettings(),
  ]);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const shown = concern ? products.filter((p) => p.concern === concern) : products;
  const concerns = Object.keys(CONCERN_LABELS).filter((c) => products.some((p) => p.concern === c));
  const routines = ROUTINES.map((r) => ({ ...r, steps: routineSteps(r, products) })).filter((r) => r.steps.length >= 2);
  const reviews = isDemoMode()
    ? homeSampleReviews().map((r) => ({ r, product: products.find((p) => p.concern === r.concern && p.featured)?.name ?? products.find((p) => p.concern === r.concern)?.name }))
    : [];
  const maxOff = Math.max(0, ...products.map((p) => (p.salePrice != null && p.salePrice < p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0)));

  return (
    <>
      {/* HERO: one message, one main action (research: single clear CTA beats product cards in the hero) */}
      <section className="wrap grid items-center gap-8 py-8 md:grid-cols-2 md:py-14">
        <div className="order-2 md:order-1">
          <div className="eyebrow">Targeted skincare for melanin-rich skin</div>
          <h1 className="mt-2 text-5xl md:text-6xl">Thoughtful formulas.<br />Consistent care.</h1>
          <p className="mt-4 max-w-md text-muted">Treat acne and dark spots, strengthen your barrier, and protect your progress with daily SPF. Every product NAFDAC registered.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="#shop" className="btn-primary">{maxOff > 0 ? `Shop the sale · ${maxOff}% off` : "Shop all products"}</Link>
            <Link href="#routines" className="btn-ghost">Build your routine</Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <li>✓ NAFDAC registered</li><li>✓ Delivery across Nigeria</li><li>✓ Help on WhatsApp</li>
          </ul>
        </div>
        <Link href="#shop" className="order-1 block overflow-hidden rounded-3xl md:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/products/range.jpg" alt="The Belladerma Skincare range" className="aspect-[4/3] w-full object-cover" />
        </Link>
      </section>

      {/* START HERE: a short, curated entry point before the full range */}
      {featured.length > 0 && (
        <section className="border-t border-line bg-white py-14">
          <div className="wrap">
            <div className="eyebrow">New to Belladerma?</div>
            <h2 className="mt-2 text-4xl">Start here</h2>
            <p className="mt-2 text-muted">Three everyday essentials for even, protected, healthy-looking skin.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => <ProductCard key={p.id} p={p} line={cartLine(p)} />)}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS: social proof near the top (demo: clearly labelled samples) */}
      {reviews.length > 0 && (
        <section className="wrap py-14">
          <div className="eyebrow">Reviews</div>
          <h2 className="mt-2 text-4xl">Loved for consistent results</h2>
          <p className="mt-2 text-xs text-gold-ink">{SAMPLE_NOTE}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map(({ r, product }) => <ReviewCard key={r.name} r={r} product={product} />)}
          </div>
        </section>
      )}

      {/* SHOP BY CONCERN: how skincare shoppers decide (problem first, product second) */}
      <section id="shop" className="wrap scroll-mt-20 py-14">
        <div className="eyebrow">Shop</div>
        <h2 className="mt-2 text-4xl">Shop by concern</h2>
        <p className="mt-2 text-muted">{products.length} products for face and body.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/#shop" scroll={false} className={`chip px-4 py-2 text-sm ${!concern ? "bg-green text-white" : "border border-line bg-white"}`}>All</Link>
          {concerns.map((c) => (
            <Link key={c} href={`/?concern=${c}#shop`} scroll={false} className={`chip px-4 py-2 text-sm ${concern === c ? "bg-green text-white" : "border border-line bg-white"}`}>{CONCERN_LABELS[c]}</Link>
          ))}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <ProductCard key={p.id} p={p} line={cartLine(p)} />)}
        </div>
        {shown.length === 0 && <p className="mt-6 text-muted">No products here yet.</p>}
      </section>

      {/* ROUTINES: complete regimens raise basket size and answer "what do I use with this?" */}
      {routines.length > 0 && (
        <section id="routines" className="scroll-mt-20 border-y border-line bg-white py-14">
          <div className="wrap">
            <div className="eyebrow">Build your routine</div>
            <h2 className="mt-2 text-4xl">Routines that work together</h2>
            <p className="mt-2 max-w-xl text-muted">Pick your goal and add the whole routine in one tap. You can change quantities in your bag.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {routines.map((r) => (
                <RoutineCard key={r.id} title={r.title} blurb={r.blurb}
                  steps={r.steps.map(({ step, when, line, stock }) => ({ step, when, line, stock }))} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-14">
        <div className="wrap grid items-center gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-mint p-8">
            <div className="eyebrow">Myth vs fact</div>
            <p className="serif mt-2 text-3xl line-through decoration-danger decoration-[3px]">&quot;You don&apos;t need SPF if you&apos;re dark-skinned.&quot;</p>
            <p className="serif mt-3 text-3xl font-bold">Dark skin needs SPF too.</p>
          </div>
          <div>
            <h2 className="text-4xl">Melanin helps. It doesn&apos;t do the whole job.</h2>
            <p className="mt-3 text-muted">UV still reaches the skin. On deeper skin tones the result is usually not sunburn but dark spots and uneven tone that take months to fade. If you&apos;re treating acne marks, daily SPF keeps your progress from being undone.</p>
            <Link href="/products/skin-protect-spf-50" className="btn-ghost mt-5">Shop Skin Protect SPF 50+</Link>
          </div>
        </div>
      </section>

      {/* COMMUNITY + HELP: real channels instead of invented reviews */}
      <section className="bg-green-deep py-12 text-white">
        <div className="wrap grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-4xl text-white">Not sure what your skin needs?</h2>
            <p className="mt-2 text-[#cfe0d8]">Message us on WhatsApp for a free routine recommendation, and follow @{settings.store.instagram} for tips, results and new launches.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <a href={waLink(settings.store.whatsapp, "Hi Belladerma, can you recommend a routine for my skin?")} target="_blank" rel="noopener" className="btn bg-[#25d366] text-white">Get a routine on WhatsApp</a>
            <a href={`https://www.instagram.com/${settings.store.instagram}/`} target="_blank" rel="noopener" className="btn border border-white/40 text-white hover:bg-white/10">Follow on Instagram</a>
          </div>
        </div>
      </section>

      <section id="delivery" className="wrap scroll-mt-20 py-14">
        <div className="eyebrow">Delivery & payment</div>
        <h2 className="mt-2 text-4xl">We deliver across Nigeria</h2>
        <p className="mt-2 text-muted">Fees are worked out from your location at checkout.{settings.freeDeliveryAbove > 0 && ` Free delivery on orders above ${naira(settings.freeDeliveryAbove)}.`}</p>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-cream text-left text-xs tracking-wider text-muted uppercase">
              <tr><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Covers</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Time</th></tr>
            </thead>
            <tbody>
              {zones.filter((z) => z.active).map((z) => (
                <tr key={z.code} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{z.label}</td><td className="px-4 py-3">{z.covers}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{z.fee ? naira(z.fee) : "Free"}</td><td className="px-4 py-3">{z.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-line bg-white py-14">
        <div className="wrap max-w-3xl">
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-2 text-4xl">Questions, answered</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none justify-between gap-4 font-semibold">{q}<span className="text-green group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
