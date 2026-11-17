import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";
import { SubmitButton } from "@/components/Loading";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

const NAV = [
  ["/admin", "Dashboard"], ["/admin/orders", "Orders"], ["/admin/products", "Products"],
  ["/admin/zones", "Delivery"], ["/admin/settings", "Settings"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-cream">
      <header className="no-print sticky top-0 z-30 bg-green-deep text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3">
          <Link href="/admin" className="serif shrink-0 text-lg font-bold tracking-[.06em] text-white">BD ADMIN</Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:bg-white/10">{label}</Link>)}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">
            <Link href="/" target="_blank" className="opacity-80 hover:opacity-100">View shop ↗</Link>
            <span className="hidden opacity-70 sm:inline">{admin.email}</span>
            <form action={logoutAction}><SubmitButton className="rounded-lg border border-white/30 px-2.5 py-1" pendingText="Logging out…">Log out</SubmitButton></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
