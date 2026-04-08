import type { Metadata } from "next";
import { Nunito, Fraunces } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildWebSiteEntity } from "@/lib/schema";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "PetPalHQ — Expert Pet Gear Reviews",
    template: `%s | PetPalHQ`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,

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
        url: `${siteConfig.url}/opengraph-image`,
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
    images: [`${siteConfig.url}/opengraph-image`],
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
      <body className={`${nunito.variable} ${fraunces.variable} antialiased`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
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
        <SiteHeader />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function Footer() {
  const cols = [
    { title: "Guides", links: [
      { label: "Dog Harnesses", href: "/guides/best-dog-harnesses-2026" },
      { label: "Cat Feeders", href: "/guides/best-automatic-cat-feeders-2026" },
      { label: "All Guides", href: "/guides" },
    ]},
    { title: "Categories", links: [
      { label: "Dogs", href: "/reviews/dogs" },
      { label: "Cats", href: "/reviews/cats" },
      { label: "Small Pets", href: "/reviews/small-pets" },
      { label: "All Categories", href: "/reviews" },
    ]},
    { title: "Company", links: [
      { label: "About Rachel", href: "/author/rachel-cooper" },
      { label: "Our Network", href: "/our-network" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
      { label: "Privacy", href: "/privacy-policy" },
    ]},
  ];

  return (
    <footer className="footer-section py-16">
      <div className="mx-auto px-6 max-w-5xl">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <span className="text-2xl tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              PetPal<span style={{ color: 'var(--terracotta)' }}>HQ</span>
            </span>
            <p className="text-sm mt-3 leading-relaxed opacity-60">
              Expert pet gear reviews tested by a former vet tech — for dogs, cats, and every pet in between.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm tracking-wider uppercase mb-4 opacity-90">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--gold)' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t pt-8" style={{ borderColor: 'rgba(107, 143, 113, 0.2)' }}>
          <p className="text-xs text-center opacity-50">
            &copy; {new Date().getFullYear()} PetPalHQ. All rights reserved. As an Amazon Associate, we earn from qualifying purchases.
          </p>
        </div>
      </div>
    </footer>
  );
}
