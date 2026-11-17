import type { SampleReview } from "@/lib/sample-reviews";

export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`text-gold ${className}`} aria-label={`${rating} out of 5`}>
      {"★★★★★".slice(0, Math.round(rating))}<span className="text-line">{"★★★★★".slice(Math.round(rating))}</span>
    </span>
  );
}

const SampleTag = () => <span className="chip border border-dashed border-gold bg-gold-soft text-gold-ink">Sample</span>;

export const SAMPLE_NOTE = "Sample reviews for the demo. Real customer reviews will replace these.";

/** Product-page reviews block. */
export function ReviewsSection({ reviews }: { reviews: SampleReview[] }) {
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Reviews</div>
          <h2 className="mt-2 text-4xl">What customers say</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-green-deep">{avg.toFixed(1)}</span>
          <div className="text-sm"><Stars rating={avg} className="text-lg" /><div className="text-muted">{reviews.length} sample reviews</div></div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gold-ink">{SAMPLE_NOTE}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {reviews.map((r) => <ReviewCard key={r.name} r={r} />)}
      </div>
    </section>
  );
}

export function ReviewCard({ r, product }: { r: SampleReview; product?: string }) {
  return (
    <figure className="card flex flex-col p-5">
      <div className="flex items-center justify-between gap-2"><Stars rating={r.rating} /><SampleTag /></div>
      <blockquote className="mt-3 flex-1">
        <p className="font-semibold">{r.title}</p>
        <p className="mt-1 text-sm text-muted">{r.body}</p>
      </blockquote>
      <figcaption className="mt-4 text-sm">
        <b>{r.name}</b> <span className="text-muted">· {r.city}{product ? ` · ${product}` : ""}</span>
      </figcaption>
    </figure>
  );
}
