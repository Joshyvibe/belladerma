import type { MetadataRoute } from "next";

// Keep private pages (admin, buyer orders, checkout, demo gateway, APIs) out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/order", "/checkout", "/pay", "/api"] },
  };
}
