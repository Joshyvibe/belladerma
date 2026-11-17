import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Two buckets of files:
//   public/  product photos (anyone can view)
//   private/ payment receipts (admins only, served through /api/files after an auth check)
// Local dev writes to .data/uploads. With SUPABASE_URL set, files go to Supabase Storage.

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_BUCKET || "belladerma" }
    : null;

export function validateUpload(file: File, opts: { allowPdf: boolean }) {
  if (!file || file.size === 0) return "No file";
  if (file.size > MAX_UPLOAD_BYTES) return "File is larger than 5 MB";
  const ok = ALLOWED[file.type] && (opts.allowPdf || file.type !== "application/pdf");
  return ok ? null : "Use a JPG, PNG or WebP image" + (opts.allowPdf ? " or a PDF" : "");
}

/** Saves a file and returns its storage path, e.g. "public/products/ab12.jpg". */
export async function saveUpload(file: File, folder: "public/products" | "private/receipts") {
  const name = `${crypto.randomUUID()}.${ALLOWED[file.type]}`;
  const key = `${folder}/${name}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const sb = supabase();
  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sb.key}`, "Content-Type": file.type },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  } else {
    await fs.mkdir(path.join(LOCAL_ROOT, folder), { recursive: true });
    await fs.writeFile(path.join(LOCAL_ROOT, key), bytes);
  }
  return key;
}

/** URL a browser can load. Private files go through the admin-checked file route. */
export function fileUrl(key: string) {
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key; // absolute URL or bundled /public file
  const sb = supabase();
  if (sb && key.startsWith("public/")) return `${sb.url}/storage/v1/object/public/${sb.bucket}/${key}`;
  return `/api/files/${key}`;
}

export async function readLocal(key: string) {
  const full = path.join(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Bad path");
  const ext = path.extname(full).slice(1);
  const type = Object.entries(ALLOWED).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  return { bytes: await fs.readFile(full), type };
}

/** Short-lived signed URL for a private file in Supabase. */
export async function signedUrl(key: string) {
  const sb = supabase();
  if (!sb) return null;
  const res = await fetch(`${sb.url}/storage/v1/object/sign/${sb.bucket}/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sb.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!res.ok) return null;
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${sb.url}/storage/v1${signedURL}`;
}
