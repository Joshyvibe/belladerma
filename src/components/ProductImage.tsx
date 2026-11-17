import { ProductArt } from "./ProductArt";

type P = { name: string; images: string[]; illustration: string };

/** First uploaded photo, or the drawn placeholder. `src` values are already browser URLs. */
export function ProductImage({ product, className = "" }: { product: P; className?: string }) {
  const src = product.images[0];
  return (
    <div className={`relative grid aspect-square place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#eef8f3_0%,var(--color-mint)_60%,var(--color-mint-deep)_100%)] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <ProductArt kind={product.illustration} name={product.name} className="h-[78%] w-auto drop-shadow-[0_18px_22px_rgba(21,54,40,.22)]" />
      )}
    </div>
  );
}
