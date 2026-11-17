import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import { NavProgress } from "@/components/NavProgress";
import "./globals.css";

const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["500", "600", "700"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Belladerma Skincare", template: "%s · Belladerma" },
  description: "Targeted skincare for melanin-rich skin. Acne, dark spots, barrier care and daily SPF. NAFDAC registered.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables go on <html> because the @theme tokens that reference them are defined on :root.
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <Suspense fallback={null}><NavProgress /></Suspense>
        {children}
      </body>
    </html>
  );
}
