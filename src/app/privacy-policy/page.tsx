import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PetPalHQ privacy policy — how we collect, use, and protect your information.",
  alternates: { canonical: `${siteConfig.url}/privacy-policy` },
  robots: { index: false, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto px-4 max-w-3xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: April 2026</p>

      <div className="prose max-w-none">
        <p>
          PetPalHQ (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates at petpalhq.com. This
          Privacy Policy explains how we collect, use, disclose, and safeguard information when you visit
          our website.
        </p>

        <h2>Information We Collect</h2>
        <h3>Automatically Collected Data</h3>
        <p>
          When you visit PetPalHQ, we automatically collect certain information about your device and
          usage patterns through cookies and analytics tools, including:
        </p>
        <ul>
          <li>IP address (anonymized)</li>
          <li>Browser type and version</li>
          <li>Pages viewed and time spent</li>
          <li>Referring URLs</li>
          <li>Device type and operating system</li>
        </ul>

        <h3>Information You Provide</h3>
        <p>
          If you subscribe to our newsletter or contact us, we collect your email address and any
          information you choose to include in your message.
        </p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To analyze site traffic and improve our content</li>
          <li>To send newsletters you have opted into (with easy unsubscribe)</li>
          <li>To respond to your inquiries</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>Analytics</h2>
        <p>
          We use Vercel Analytics and Google Analytics to understand how visitors use our site.
          These services may set cookies and collect information as described in their respective
          privacy policies. Google&apos;s IP anonymization is enabled on our property.
        </p>

        <h2>Affiliate Links & Third Parties</h2>
        <p>
          PetPalHQ contains affiliate links to Amazon and other retailers. When you click these
          links, you are subject to the privacy policies of those third-party sites. We recommend
          reviewing their policies before making purchases.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies for analytics and functionality purposes. You can control cookie preferences
          through your browser settings, though disabling cookies may affect site functionality.
        </p>

        <h2>Data Retention</h2>
        <p>
          Analytics data is retained in accordance with our analytics provider policies. Email
          addresses are retained until you unsubscribe.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct, or delete personal
          data we hold about you. Contact us at <a href="mailto:hello@petpalhq.com">hello@petpalhq.com</a>{" "}
          to exercise these rights.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          PetPalHQ is not directed to children under 13. We do not knowingly collect personal
          information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy periodically. Changes will be posted on this page with a revised
          &quot;Last updated&quot; date.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy questions, email <a href="mailto:hello@petpalhq.com">hello@petpalhq.com</a>.
        </p>
      </div>
    </main>
  );
}
