import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers run as plain Node modules: PGlite ships WASM files, and postgres.js breaks when minified.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" }, // receipts and product photos
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        // Buyer order links carry a private token (?t=…). Only send our origin to other sites,
        // never the full URL, e.g. when someone taps the WhatsApp button on their order page.
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" }, // no clickjacking of admin buttons
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;
