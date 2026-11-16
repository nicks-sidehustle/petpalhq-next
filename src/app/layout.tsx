import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildWebSiteEntity, SITE_URL } from "@/lib/schema";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AIReferrerTracker from "@/components/AIReferrerTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Header from "@/components/layout/Header";
import PrimeDaysBanner from "@/components/layout/PrimeDaysBanner";
import Footer from "@/components/layout/Footer";

// Fonts are bundled in src/app/fonts (Fontsource 5.x, SIL OFL 1.1) so builds
// never fetch fonts.googleapis.com — a Google Fonts blip failed the CI build on
// #242 (2026-11-15). Same families, weights, styles and CSS variables as the old
// next/font/google calls (latin subset).
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = localFont({
  src: [
    { path: "./fonts/source-serif-4-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-serif-4-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-serif-4-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/source-serif-4-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/source-serif-4-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-source-serif",
  display: "swap",
  // Match next/font/google's serif fallback metrics (Times New Roman base).
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  metadataBase: new URL(SITE_URL),
  // NOTE: intentionally NO default `alternates.canonical` here. A root-layout
  // default forces every child route that doesn't set its own canonical to
  // canonicalize to the homepage (an SEO bug that deindexes content). Each
  // route sets its own self-referential canonical; routes without one fall back
  // to self-referential by default. The homepage sets its own in app/page.tsx.
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/apple-touch-icon.png",
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
  robots: { index: true, follow: true },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [buildOrganizationEntity(), buildWebSiteEntity()],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <head>
        <meta
          name="impact-site-verification"
          content="4267b36a-9c73-463c-b12f-4650e1d57fe8"
          {...{ value: "4267b36a-9c73-463c-b12f-4650e1d57fe8" }}
        />
        <script
          id="schema-org-site"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ErrorBoundary>
          <GoogleAnalytics measurementId={siteConfig.gaId} />
          <AIReferrerTracker />
          <AnalyticsProvider />
          <PrimeDaysBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
