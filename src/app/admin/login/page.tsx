import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin login", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const { next = "/admin" } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="serif grid h-9 w-9 place-items-center rounded-full bg-green font-bold text-white">BD</span>
          <span className="serif text-xl font-bold tracking-[.06em]">BELLADERMA ADMIN</span>
        </div>
        <LoginForm next={next} />
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 text-xs text-muted">Local dev: sign in with ADMIN_EMAIL / ADMIN_PASSWORD from .env.local.</p>
        )}
      </div>
    </div>
  );
}
