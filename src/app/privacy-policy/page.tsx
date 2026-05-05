import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Privacy Policy - ${siteConfig.name}`,
  description: `Privacy policy and data handling practices for ${siteConfig.name}.`,
  alternates: {
    canonical: `${siteConfig.url}/privacy-policy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you subscribe to our newsletter,
                and information automatically collected through your use of our website.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>IP address and general location</li>
                <li>Pages visited and time spent on site</li>
                <li>Referring website information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>To provide and improve our content and services</li>
                <li>To send you newsletters (with your consent)</li>
                <li>To analyze website usage and performance</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to enhance your browsing experience and analyze site traffic.
                You can control cookie preferences through our consent banner.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Types of Cookies:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Essential:</strong> Required for website functionality</li>
                <li><strong>Analytics:</strong> Help us understand site usage (Google Analytics)</li>
                <li><strong>Marketing:</strong> Support affiliate partnerships and advertising</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Affiliate Marketing Disclosure</h2>
              <p className="text-gray-700 mb-4">
                {siteConfig.name} participates in affiliate marketing programs, including the Amazon Associates Program.
                We may earn commissions from qualifying purchases made through our affiliate links at no additional cost to you.
              </p>
              <p className="text-gray-700">
                All affiliate relationships are clearly disclosed, and our product recommendations are based on
                expert consensus and independent editorial research.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Privacy Rights</h2>

              <h3 className="text-lg font-medium text-gray-900 mb-2">General Rights</h3>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to processing of your personal information</li>
                <li>Withdraw consent for marketing communications</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">US State Privacy Rights</h3>
              <p className="text-gray-700 mb-4">
                If you are a resident of California, Virginia, Colorado, Connecticut, or other states with comprehensive
                privacy laws, you have additional rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Right to Know:</strong> You can request details about the personal information we collect, use, and share</li>
                <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
                <li><strong>Right to Opt-Out:</strong> You can opt out of the sale or sharing of your personal information</li>
                <li><strong>Right to Correct:</strong> You can request correction of inaccurate personal information</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
              </ul>

              <div className="bg-[var(--color-parchment)] p-4 rounded-lg mb-4">
                <h4 className="font-medium text-[var(--color-evergreen)] mb-2">Do Not Sell My Personal Information</h4>
                <p className="text-[var(--color-evergreen)] text-sm">
                  We may share personal information with affiliate partners for marketing purposes.
                  You can opt out by clicking &quot;Do Not Sell My Info&quot; in our consent banner or by contacting us directly.
                </p>
              </div>

              <p className="text-gray-700 text-sm">
                To exercise any of these rights, please contact us at{' '}
                <a href="mailto:privacy@petpalhq.com" className="text-[var(--color-evergreen)] hover:underline">
                  privacy@petpalhq.com
                </a>{' '}
                or use the &quot;Do Not Sell My Info&quot; option in our consent banner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or our data practices, please contact us at:{' '}
                <a href="mailto:privacy@petpalhq.com" className="text-[var(--color-evergreen)] hover:underline">
                  privacy@petpalhq.com
                </a>
              </p>
            </section>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
