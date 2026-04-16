import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildWebSiteEntity } from "@/lib/schema";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Loyal & Found — Pet Gear, Thoughtfully Tested",
    template: `%s | Loyal & Found`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,

  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "Loyal & Found — Pet Gear, Thoughtfully Tested",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Loyal & Found",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loyal & Found — Pet Gear, Thoughtfully Tested",
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
  // Safe JSON-LD: content is from our own schema builders, not user input
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [buildOrganizationEntity(), buildWebSiteEntity()],
  });

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fraunces.variable} antialiased`}
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
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
    {
      title: "Guides",
      links: [
        { label: "All Guides", href: "/guides" },
        { label: "Dog Harnesses", href: "/guides/best-dog-harnesses-2026" },
        { label: "Cat Fountains", href: "/guides/best-cat-water-fountains-2026" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "How We Research", href: "/methodology" },
        { label: "Our Network", href: "/our-network" },
        { label: "About", href: "/about" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
        { label: "Privacy Policy", href: "/privacy-policy" },
      ],
    },
  ];

  return (
    <footer
      className="py-16"
      style={{ borderTop: "1px solid var(--oat)" }}
    >
      <div className="mx-auto px-6 max-w-[900px]">
        <div className="flex justify-between items-start flex-wrap gap-10 mb-12">
          {/* Brand */}
          <div style={{ maxWidth: 320 }}>
            <div
              className="text-xl mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                color: "var(--espresso)",
              }}
            >
              Loyal{" "}
              <em style={{ fontStyle: "italic", color: "var(--tomato)" }}>
                &amp;
              </em>{" "}
              Found
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--shale)",
                fontFamily: "var(--font-body)",
              }}
            >
              Independent pet product research. We read the experts, test what
              we can, and pick three products at three price points. No paid
              sponsorships.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 flex-wrap">
            {cols.map((col) => (
              <div key={col.title}>
                <div
                  className="mb-3"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--sandstone)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                  }}
                >
                  {col.title}
                </div>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm transition-opacity hover:opacity-100"
                        style={{
                          color: "var(--shale)",
                          fontFamily: "var(--font-body)",
                          opacity: 0.7,
                        }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex justify-between flex-wrap gap-3"
          style={{ borderTop: "1px solid var(--linen)" }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--sandstone)",
              fontFamily: "var(--font-body)",
            }}
          >
            As an Amazon Associate, we earn from qualifying purchases.
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--sandstone)",
              fontFamily: "var(--font-body)",
            }}
          >
            &copy; {new Date().getFullYear()} Loyal &amp; Found
          </span>
        </div>
      </div>
    </footer>
  );
}
