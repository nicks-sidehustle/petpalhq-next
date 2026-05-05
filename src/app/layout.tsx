import type { Metadata } from "next";
import { Nunito, Playfair_Display, Crimson_Pro } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildWebSiteEntity, SITE_URL } from "@/lib/schema";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const GA_MEASUREMENT_ID = "G-R9R6P7KVVE";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading", weight: ["400", "600", "700", "800"], style: ["normal", "italic"] });
const crimsonPro = Crimson_Pro({ subsets: ["latin"], variable: "--font-editorial", weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });

function getSeason(): "holiday" | "offseason" {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  // Holiday season: Oct 1 (month 9) through Jan 6 (month 0, day 6)
  if (month >= 9) return "holiday"; // Oct, Nov, Dec
  if (month === 0 && day <= 6) return "holiday"; // Jan 1-6
  return "offseason";
}

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: SITE_URL,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    site: siteConfig.twitter,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    buildOrganizationEntity(),
    buildWebSiteEntity(),
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-season={getSeason()}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <script
          id="schema-org-site"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className={`${nunito.variable} ${playfair.variable} ${crimsonPro.variable} font-sans antialiased`}>
        {children}
        <ExitIntentPopup
          siteName="PetPalHQ"
          headline="One last thing before you go"
          description="Get our expert-consensus pet gear guides delivered when new ones drop. Aquarium, reptile, and birding picks — no spam, no fluff."
          buttonText="Subscribe Free"
          accentColor="#1e3a6e"
        />
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
      { label: "Christmas Lights", href: "/guides" },
      { label: "Tree Stands", href: "/guides" },
      { label: "Ornaments", href: "/guides" },
      { label: "All 36 Guides", href: "/guides" },
    ]},
    { title: "Categories", links: [
      { label: "Trees & Stands", href: "/reviews/tree-stands" },
      { label: "Lights & Displays", href: "/reviews/lights" },
      { label: "Ornaments", href: "/reviews/ornaments" },
    ]},
    { title: "Company", links: [
      { label: "About", href: "/about" },
      { label: "Our Network", href: "/our-network" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
      { label: "Privacy", href: "/privacy-policy" },
    ]},
  ];

  return (
    <footer className="footer-holly py-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <span className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Christmas<span style={{ color: "var(--brand-gold)" }}>GearHQ</span>
            </span>
            <p className="text-sm mt-3 leading-relaxed opacity-60">
              Expert-curated holiday gear reviews — decorations, lights, trees, and everything for a magical season.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm tracking-wider uppercase mb-4 opacity-80">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm opacity-50 hover:opacity-100 transition-opacity" style={{ color: "var(--brand-gold)" }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t pt-8" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
          <p className="text-xs text-center opacity-50">
            &copy; {new Date().getFullYear()} PetPalHQ. All rights reserved. As an Amazon Associate, we earn from qualifying purchases.
          </p>
        </div>
      </div>
    </footer>
  );
}
