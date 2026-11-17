import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { readLocal, signedUrl } from "@/lib/storage";

// Serves uploads in local dev, and gates private files (payment receipts) behind admin login.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key.startsWith("public/") && !key.startsWith("private/")) return new NextResponse(null, { status: 404 });
  if (key.startsWith("private/") && !(await currentAdmin())) return new NextResponse(null, { status: 401 });

  const signed = key.startsWith("private/") ? await signedUrl(key) : null;
  if (signed) return NextResponse.redirect(signed);
  try {
    const { bytes, type } = await readLocal(key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Cache-Control": key.startsWith("public/") ? "public, max-age=31536000, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
