import Link from "next/link";
import { CartButton, CartProvider } from "@/components/cart";
import { prettyPhone, waLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      {s.announcement && (
        <div className="no-print bg-green-deep px-4 py-2 text-center text-[13px] text-white">{s.announcement}</div>
      )}
      <header className="no-print sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur">
        <div className="wrap flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="serif grid h-9 w-9 place-items-center rounded-full bg-green text-[17px] font-bold text-white">BD</span>
            <span className="serif text-[22px] font-bold tracking-[.06em]">BELLADERMA</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted">
            <Link href="/#shop" className="hidden hover:text-green sm:inline">Shop</Link>
            <Link href="/#routines" className="hidden hover:text-green sm:inline">Routines</Link>
            <Link href="/#delivery" className="hidden hover:text-green sm:inline">Delivery</Link>
            <CartButton />
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="no-print bg-green-deep pt-11 pb-24 text-sm text-[#cfe0d8]">
        <div className="wrap grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <span className="serif text-[22px] font-bold tracking-[.06em] text-white">BELLADERMA</span>
            <p className="mt-3">Targeted skincare for melanin-rich skin. Thoughtful formulas. Consistent care.</p>
            <p className="mt-2 text-xs opacity-80">Formerly Purederma Skincare.</p>
          </div>
          <div>
            <b className="text-white">Contact</b>
            <p className="mt-2 leading-7">
              <a className="text-white" href={waLink(s.store.whatsapp)}>WhatsApp {prettyPhone(s.store.whatsapp)}</a><br />
              <a className="text-white" href={`https://www.instagram.com/${s.store.instagram}/`}>Instagram @{s.store.instagram}</a>
            </p>
          </div>
          <div>
            <b className="text-white">Regulatory</b>
            <p className="mt-2">NAFDAC Reg. No. {s.store.nafdacNo}<br />Approved 28 Feb 2025</p>
          </div>
        </div>
      </footer>

      <a href={waLink(s.store.whatsapp, "Hi Belladerma, I have a question")} target="_blank" rel="noopener"
        className="no-print fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] shadow-lg" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3 29l6.9-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm0 23.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.2 1.3-4-.3-.4c-1.1-1.7-1.7-3.6-1.7-5.6C5.4 9.8 10.2 5.1 16 5.1s10.6 4.7 10.6 10.5S21.8 26.2 16 26.2zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.7-.4z" /></svg>
      </a>
    </CartProvider>
  );
}
