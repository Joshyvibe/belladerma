"use client";

import { useActionState } from "react";
import type { ProductView } from "@/lib/catalog";
import { CONCERN_LABELS } from "@/lib/format";
import { saveProductAction } from "../../actions";
import { Spinner } from "@/components/Loading";

/** `imageKeys` are the stored keys; `product.images` are the matching display URLs. */
export function ProductForm({ product, imageKeys = [] }: { product?: ProductView; imageKeys?: string[] }) {
  const [state, action, pending] = useActionState(saveProductAction.bind(null, product?.id ?? null), undefined);
  const p = product;
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="card space-y-4 p-5">
        <Field label="Name" name="name" defaultValue={p?.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="concern">Concern</label>
            <select id="concern" name="concern" defaultValue={p?.concern ?? "acne"} className="input">
              {Object.entries(CONCERN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Field label="Size" name="size" defaultValue={p?.size} placeholder="e.g. 50 ml" />
        </div>
        <Field label="Tagline (one line on cards)" name="tagline" defaultValue={p?.tagline} />
        <Area label="Description" name="description" defaultValue={p?.description} rows={4} />
        <Area label="How to use" name="howToUse" defaultValue={p?.howToUse} />
        <Area label="Ingredients" name="ingredients" defaultValue={p?.ingredients} />
      </div>

      <div className="space-y-5">
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₦)" name="price" defaultValue={p?.price} inputMode="numeric" required />
            <Field label="Sale price (₦)" name="salePrice" defaultValue={p?.salePrice ?? ""} inputMode="numeric" placeholder="optional" />
            <Field label="In stock" name="stock" defaultValue={p?.stock ?? 0} inputMode="numeric" />
            <Field label="Low-stock alert at" name="lowStockAt" defaultValue={p?.lowStockAt ?? 5} inputMode="numeric" />
          </div>
          <Field label="Badge (e.g. NEW, 20% OFF)" name="badge" defaultValue={p?.badge ?? ""} />
          <Field label="NAFDAC no. (if different per product)" name="nafdacNo" defaultValue={p?.nafdacNo ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="URL slug" name="slug" defaultValue={p?.slug} placeholder="auto from name" />
            <Field label="Sort order" name="sort" defaultValue={p?.sort ?? 0} inputMode="numeric" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-4 w-4 accent-green" /> Visible in shop</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="h-4 w-4 accent-green" /> Featured on home page</label>
        </div>

        <div className="card space-y-3 p-5">
          <div className="label">Photos</div>
          {imageKeys.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageKeys.map((k, i) => (
                <label key={k} className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p!.images[i]} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <span className="absolute right-1 bottom-1 flex items-center gap-1 rounded bg-white/90 px-1.5 text-xs"><input type="checkbox" name="keepImage" value={k} defaultChecked /> keep</span>
                </label>
              ))}
            </div>
          )}
          <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" className="input text-sm" />
          <p className="text-xs text-muted">JPG/PNG/WebP, up to 5 MB each. The first photo is the main image. Square photos look best.</p>
          <div>
            <label className="label" htmlFor="illustration">Placeholder drawing (used until a photo is added)</label>
            <select id="illustration" name="illustration" defaultValue={p?.illustration ?? "pump"} className="input">
              <option value="pump">Pump bottle</option><option value="dropper">Dropper bottle</option><option value="tube">Tube</option><option value="jar">Jar</option>
            </select>
          </div>
        </div>

        {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger" role="alert">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? <><Spinner />Saving…</> : product ? "Save changes" : "Add product"}</button>
      </div>
    </form>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} className="input" {...rest} /></div>;
}
function Area({ label, name, rows = 3, defaultValue }: { label: string; name: string; rows?: number; defaultValue?: string }) {
  return <div><label className="label" htmlFor={name}>{label}</label><textarea id={name} name={name} rows={rows} className="input" defaultValue={defaultValue} /></div>;
}
