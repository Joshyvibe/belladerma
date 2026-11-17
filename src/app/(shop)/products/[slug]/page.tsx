import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/AddToBag";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { cartLine, listProducts, productBySlug, routineSteps } from "@/lib/catalog";
import { CONCERN_LABELS, naira, waLink } from "@/lib/format";
import { unitPrice } from "@/lib/pricing";
import { routinesWith } from "@/lib/routines";
import { getSettings } from "@/lib/settings";
import { isDemoMode } from "@/lib/payments";
import { sampleReviewsFor } from "@/lib/sample-reviews";
import { ReviewsSection, Stars } from "@/components/Reviews";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await productBySlug((await params).slug);
  return p ? { title: p.name, description: p.tagline } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const [s, all] = await Promise.all([getSettings(), listProducts()]);
  const price = unitPrice(p);

  // "Complete your routine": the other steps of the first routine this product belongs to.
  const routine = routinesWith(p.slug)[0];
  const pairs = routine ? routineSteps(routine, all, p.slug) : [];
  // "More for <concern>": alternatives in the same category.
  const more = all.filter((x) => x.concern === p.concern && x.id !== p.id).slice(0, 3);
  const reviews = isDemoMode() ? sampleReviewsFor(p.concern) : [];
  const avg = reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : 0;

  return (
    <div className="wrap py-8 md:py-12">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:text-green">Home</Link> / <Link href={`/?concern=${p.concern}#shop`} className="hover:text-green">{CONCERN_LABELS[p.concern]}</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <ProductImage product={p} className="rounded-3xl" />
            <div className="absolute top-4 left-4 flex gap-1.5">
              {p.badge && <span className="chip bg-green px-3 py-1.5 text-sm text-white">{p.badge}</span>}
              {price < p.price && <span className="chip bg-gold px-3 py-1.5 text-sm text-green-deep">−{Math.round((1 - price / p.price) * 100)}%</span>}
            </div>
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.images.slice(1).map((src) => <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover" />)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="eyebrow">{CONCERN_LABELS[p.concern]}</div>
          <h1 className="mt-2 text-5xl">{p.name}</h1>
          {reviews.length > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
              <Stars rating={avg} /> <span className="text-muted">{avg.toFixed(1)} · {reviews.length} sample reviews</span>
            </a>
          )}
          <p className="mt-3 text-muted">{p.tagline}</p>
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-green-deep">{naira(price)}</span>
            {price < p.price && <>
              <span className="text-lg text-muted line-through">{naira(p.price)}</span>
              <span className="chip bg-gold-soft text-gold-ink">You save {naira(p.price - price)}</span>
            </>}
          </div>
          <p className="mt-1 text-sm text-muted">{p.size}{p.stock > 0 && p.stock <= p.lowStockAt ? ` · Only ${p.stock} left` : ""}</p>

          <AddToBag line={cartLine(p)} stock={p.stock} withQty className="mt-6" />
          <ul className="mt-4 space-y-1 text-sm text-muted">
            <li>🚚 Delivery across Nigeria{s.freeDeliveryAbove > 0 ? `, free on orders above ${naira(s.freeDeliveryAbove)}` : ""}</li>
            <li>✓ NAFDAC registered · Pay by bank transfer</li>
            <li>💬 Questions? <a className="underline" href={waLink(s.store.whatsapp, `Hi Belladerma, I'd like to ask about ${p.name}`)} target="_blank" rel="noopener">Ask us on WhatsApp</a></li>
          </ul>

          {pairs.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-2xl">Complete your routine</h2>
                <span className="text-xs text-muted">{routine!.title}</span>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {pairs.map((x) => (
                  <li key={x.line.productId} className="flex items-center gap-3 py-3">
                    <Link href={`/products/${x.line.slug}`} className="shrink-0"><ProductImage product={x.line} className="w-14 rounded-lg" /></Link>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="text-[11px] font-semibold tracking-wider text-green-soft uppercase">{x.step} · {x.when}</div>
                      <Link href={`/products/${x.line.slug}`} className="block truncate font-semibold">{x.line.name}</Link>
                      <div className="text-muted">{naira(x.line.unit)}</div>
                    </div>
                    <AddToBag line={x.line} stock={x.stock} compact />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 divide-y divide-line border-y border-line">
            <Section title="About" body={p.description} open />
            <Section title="How to use" body={p.howToUse} />
            <Section title="Ingredients" body={p.ingredients} />
            <Section title="Delivery & payment" body="Lagos: 1–2 days. Other states: 2–5 days. You'll see the exact fee and delivery time at checkout. Pay by transfer to Belladerma's account using your order reference; we confirm it and send your delivery note." />
          </div>
        </div>
      </div>

      {reviews.length > 0 && <div id="reviews" className="scroll-mt-20"><ReviewsSection reviews={reviews} /></div>}

      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="text-4xl">More for {CONCERN_LABELS[p.concern].toLowerCase()}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => <ProductCard key={x.id} p={x} line={cartLine(x)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({ title, body, open }: { title: string; body: string; open?: boolean }) {
  if (!body) return null;
  return (
    <details open={open} className="group py-4">
      <summary className="flex cursor-pointer list-none justify-between font-semibold">{title}<span className="text-green group-open:rotate-45">+</span></summary>
      <p className="mt-2 whitespace-pre-line text-muted">{body}</p>
    </details>
  );
}
