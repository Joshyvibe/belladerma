import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Two kinds of files:
//   public/  product photos: public bucket (SUPABASE_BUCKET), anyone can view
//   private/ payment receipts: private bucket (SUPABASE_PRIVATE_BUCKET), only via short-lived
//            signed links handed out by /api/files after an admin login check
// Local dev writes to .data/uploads. With SUPABASE_URL set, files go to Supabase Storage.

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * The project API address, e.g. https://abcd.supabase.co. Also accepts the dashboard page URL
 * (https://supabase.com/dashboard/project/abcd), an easy copy-paste mistake that makes every
 * upload fail with 405, and trailing slashes.
 */
export function supabaseApiUrl(raw: string) {
  const ref = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/)?.[1];
  return ref ? `https://${ref}.supabase.co` : raw.replace(/\/+$/, "");
}

const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? {
        url: supabaseApiUrl(process.env.SUPABASE_URL),
        key: process.env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: process.env.SUPABASE_BUCKET || "belladerma",
        privateBucket: process.env.SUPABASE_PRIVATE_BUCKET || `${process.env.SUPABASE_BUCKET || "belladerma"}-private`,
      }
    : null;
type Sb = NonNullable<ReturnType<typeof supabase>>;
const bucketFor = (sb: Sb, key: string) => (key.startsWith("private/") ? sb.privateBucket : sb.bucket);
// Legacy service_role JWTs go in Authorization; new sb_secret_ keys must go in `apikey`. Send both.
const authHeaders = (key: string) => ({ Authorization: `Bearer ${key}`, apikey: key });

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
    const bucket = bucketFor(sb, key);
    const put = () => fetch(`${sb.url}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { ...authHeaders(sb.key), "Content-Type": file.type },
      body: bytes,
    });
    let res = await put();
    if (!res.ok && key.startsWith("private/") && /bucket not found/i.test(await res.clone().text())) {
      await ensurePrivateBucket(sb);
      res = await put();
    }
    if (!res.ok) throw new Error(`Upload to ${new URL(sb.url).host}/${bucket} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  } else {
    await fs.mkdir(path.join(LOCAL_ROOT, folder), { recursive: true });
    await fs.writeFile(path.join(LOCAL_ROOT, key), bytes);
  }
  return key;
}

/** Creates the private receipts bucket the first time it's needed (not public, 5 MB limit). */
async function ensurePrivateBucket(sb: Sb) {
  const res = await fetch(`${sb.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: sb.privateBucket, name: sb.privateBucket, public: false,
      file_size_limit: MAX_UPLOAD_BYTES, allowed_mime_types: Object.keys(ALLOWED),
    }),
  });
  if (!res.ok && !/already exists/i.test(await res.text())) throw new Error(`Couldn't create bucket ${sb.privateBucket}: ${res.status}`);
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
  const res = await fetch(`${sb.url}/storage/v1/object/sign/${bucketFor(sb, key)}/${key}`, {
    method: "POST",
    headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!res.ok) return null;
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${sb.url}/storage/v1${signedURL}`;
}
