import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildWebSiteEntity } from "@/lib/schema";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "PetPalHQ — Expert Pet Gear Reviews",
    template: `%s | PetPalHQ`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  verification: { google: "" },
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "PetPalHQ — Expert Pet Gear Reviews",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "PetPalHQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PetPalHQ — Expert Pet Gear Reviews",
    description: siteConfig.description,
    images: [`${siteConfig.url}/og-default.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${lora.variable} font-sans antialiased`}>
        {/* Site-wide Organization + WebSite JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [buildOrganizationEntity(), buildWebSiteEntity()],
            }),
          }}
        />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-amber-100 py-8 mt-12 bg-amber-50">
      <div className="mx-auto px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-amber-800 font-semibold">
            {siteConfig.name}
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-gray-500 justify-center">
            <Link href="/about" className="hover:text-amber-700 transition-colors">About</Link>
            <Link href="/guides" className="hover:text-amber-700 transition-colors">Guides</Link>
            <Link href="/reviews" className="hover:text-amber-700 transition-colors">Reviews</Link>
            <Link href="/affiliate-disclosure" className="hover:text-amber-700 transition-colors">Affiliate Disclosure</Link>
            <Link href="/privacy-policy" className="hover:text-amber-700 transition-colors">Privacy Policy</Link>
            <Link href="/our-network" className="hover:text-amber-700 transition-colors">Our Network</Link>
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            As an Amazon Associate, we earn from qualifying purchases.
          </p>
        </div>
      </div>
    </footer>
  );
}
