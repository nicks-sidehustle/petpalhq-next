import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";

const PAGE_TITLE = "Privacy policy";
const PAGE_DESC =
  "How PetPalHQ collects, uses, and protects reader data — newsletter signups, anonymous analytics, cookies, third-party services (Google Analytics, Brevo, Amazon, ImprovMX, Vercel), and your CCPA + GDPR rights.";
const UPDATED_DATE = "2026-05-05";
const PAGE_URL = `${SITE_URL}/privacy-policy`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${PAGE_TITLE} | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "article",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-teal)" }}
      >
        Privacy
      </p>
      <h1
        className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight"
        style={{ color: "var(--color-navy)" }}
      >
        Privacy policy
      </h1>

      <div className="prose">
        <p>
          <strong>Last updated:</strong> {UPDATED_DATE}
        </p>

        <p>
          PetPalHQ (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates{" "}
          <a href={SITE_URL}>petpalhq.com</a>. This page explains what we
          collect, how we use it, who we share it with, and the rights you have
          under California&apos;s Consumer Privacy Act (CCPA / CPRA) and the
          European Union&apos;s General Data Protection Regulation (GDPR). It
          also covers the cookies and third-party services that the site
          relies on. We try to keep this page short and direct — if a section
          is unclear, write us at{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a> and
          we&apos;ll explain or correct it.
        </p>

        <h2 id="data-controller">Who we are</h2>
        <p>
          PetPalHQ is the data controller for personal information processed
          on this site. The site is operated by an independent editorial team
          based in the United States. Inquiries and data-rights requests
          should go to{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>;
          we respond within thirty days, and we do not require account
          creation to exercise a privacy right.
        </p>

        <h2 id="information-we-collect">Information we collect</h2>
        <p>
          We collect only the information we need to operate the site and the
          newsletter:
        </p>
        <ul>
          <li>
            <strong>Email address.</strong> When you subscribe to our
            newsletter, we collect the email address you submit and the source
            of the signup (homepage, footer, in-guide). We use this only to
            deliver guide updates you opted into.
          </li>
          <li>
            <strong>Optional message contents.</strong> If you email us at any
            of our published addresses (e.g.,{" "}
            <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>),
            those messages are stored by our inbound email forwarder and our
            inbox provider for as long as we keep correspondence.
          </li>
          <li>
            <strong>Anonymous analytics.</strong> Page views, referrer URLs,
            approximate location (country / region), device class, and
            browser, recorded only after you accept analytics cookies via the
            consent banner. We do not record your IP address or any
            personally-identifiable session data.
          </li>
          <li>
            <strong>Server &amp; security logs.</strong> Standard request logs
            from our hosting provider that include IP address, timestamp, and
            requested URL, retained briefly for abuse-prevention and outage
            diagnosis. These logs are not joined to newsletter or analytics
            data.
          </li>
          <li>
            <strong>Consent preferences.</strong> Your cookie-banner choices
            (accept / reject analytics, do-not-sell) are stored in a
            first-party cookie or local storage on your own device so we can
            honor your preference on subsequent visits.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect names, postal addresses, phone
          numbers, payment information, or precise geolocation. We do not run
          accounts; there is no login, no profile, no order history.
        </p>

        <h2 id="how-we-use-it">How we use the information</h2>
        <ul>
          <li>To send you guide updates if you subscribe to the newsletter.</li>
          <li>
            To understand which guides are read and which content topics merit
            refresh — strictly in aggregate, never tied to an individual.
          </li>
          <li>
            To respond to email inquiries, corrections, source suggestions,
            and privacy-rights requests.
          </li>
          <li>
            To prevent abuse and keep the site online (rate-limiting,
            bot-mitigation, outage diagnosis).
          </li>
        </ul>
        <p>
          We do not sell, rent, or trade personal information. We do not use
          personal information for behavioural advertising, profiling, or any
          form of automated decision-making with legal effect.
        </p>

        <h2 id="cookies">Cookies and similar technologies</h2>
        <p>
          The site uses a small number of cookies and equivalent storage
          mechanisms. We disclose them by purpose, not by name, because
          third-party libraries occasionally rename their cookies:
        </p>
        <ul>
          <li>
            <strong>Strictly necessary.</strong> A first-party cookie or local
            storage entry that records your consent-banner choice. This cannot
            be disabled because the site needs it to remember your decision.
          </li>
          <li>
            <strong>Analytics (consent-gated).</strong> Google Analytics 4
            cookies, set only after you accept analytics in the consent
            banner. See{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
              Google&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Affiliate cookies.</strong> When you click an Amazon
            product link, amazon.com sets cookies on its own domain to
            attribute the visit to PetPalHQ&apos;s Associates tag{" "}
            <code>{siteConfig.amazonTag}</code>. PetPalHQ does not read or
            access those cookies. See Amazon&apos;s{" "}
            <a
              href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ"
              target="_blank"
              rel="noopener"
            >
              cookies notice
            </a>
            .
          </li>
        </ul>
        <p>
          You can withdraw analytics consent at any time by clicking{" "}
          <strong>Do Not Sell My Personal Information</strong> in the footer
          (US visitors) or by clearing this site&apos;s cookies in your
          browser. Both clear our analytics cookies and stop further
          collection.
        </p>

        <h2 id="third-parties">Third-party services we rely on</h2>
        <p>
          PetPalHQ runs on a small set of well-known service providers. Each
          processes a narrow slice of data and operates under its own privacy
          policy:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> — hosting and content delivery.
            Server-side request logs and global edge delivery.{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">
              Vercel privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Google Analytics 4</strong> — anonymous traffic analytics,
            consent-gated and IP-anonymized.{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
              Google privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Brevo</strong> — newsletter delivery and subscriber list
            storage. Receives your email address and source-of-signup when
            you subscribe.{" "}
            <a href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener">
              Brevo privacy policy
            </a>
            .
          </li>
          <li>
            <strong>ImprovMX</strong> — inbound email forwarding. Forwards
            messages sent to <code>*@petpalhq.com</code> addresses to our
            mailbox.{" "}
            <a href="https://improvmx.com/privacy/" target="_blank" rel="noopener">
              ImprovMX privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Amazon Associates Program</strong> — affiliate
            click-tracking. Receives only the click event when you follow a
            product link from this site.{" "}
            <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener">
              Amazon privacy notice
            </a>
            . See our <Link href="/affiliate-disclosure">affiliate disclosure</Link> for the
            commercial relationship.
          </li>
        </ul>

        <h2 id="lawful-bases">Lawful bases (GDPR)</h2>
        <ul>
          <li>
            <strong>Consent</strong> — for analytics cookies and for
            newsletter subscription. You may withdraw consent at any time
            without affecting the lawfulness of prior processing.
          </li>
          <li>
            <strong>Legitimate interests</strong> — for operating the site,
            preventing abuse, and responding to inquiries. We have weighed
            this against your privacy interests; if you disagree with our
            assessment, contact us.
          </li>
          <li>
            <strong>Legal obligation</strong> — for retaining records when a
            statutory duty applies.
          </li>
        </ul>

        <h2 id="international-transfers">International data transfers</h2>
        <p>
          Some processors (Google, Vercel, Brevo, ImprovMX) are
          US-headquartered or operate global infrastructure. Where personal
          data of EU/UK visitors is transferred outside the EEA/UK, we rely on
          the relevant Standard Contractual Clauses or equivalent safeguards
          published by the processor. Documentation is available on request
          at <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>.
        </p>

        <h2 id="california-rights">
          California rights — CCPA / CPRA
        </h2>
        <p>
          If you are a California resident, you have the right to:
        </p>
        <ul>
          <li>
            Know what categories of personal information we have collected
            about you and how we use them (this page is the standing answer).
          </li>
          <li>Request a copy of the personal information we hold about you.</li>
          <li>
            Request deletion of your personal information, subject to
            statutory exceptions (e.g., legal records).
          </li>
          <li>Request correction of inaccurate personal information.</li>
          <li>
            <strong>Opt out of the sale or sharing</strong> of personal
            information for cross-context behavioural advertising. PetPalHQ
            does not sell or share personal information for that purpose; the
            <strong> Do Not Sell My Personal Information</strong> control in
            the site footer also disables analytics cookies as a one-click
            stronger preference.
          </li>
          <li>
            Be free of retaliation for exercising any of the rights above.
          </li>
        </ul>
        <p>
          To exercise any right, email{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>{" "}
          with the subject line <em>CCPA request</em>. We do not require
          identity verification beyond confirming the email address tied to
          the data we hold (typically the newsletter address).
        </p>

        <h2 id="gdpr-rights">European rights — GDPR</h2>
        <p>
          If you are in the European Union, the United Kingdom, or another
          jurisdiction with equivalent protections, you have the right to
          access, rectify, erase, restrict, port, or object to the processing
          of your personal information, and to withdraw consent at any time.
          Send requests to{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>. You
          also have the right to lodge a complaint with your local
          supervisory authority.
        </p>

        <h2 id="childrens-privacy">Children&apos;s privacy</h2>
        <p>
          PetPalHQ is not directed to children under the age of 13 (or the
          equivalent minimum age in your jurisdiction). We do not knowingly
          collect personal information from minors. If you believe a minor
          has submitted personal information through this site, write to{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>{" "}
          and we will delete it.
        </p>

        <h2 id="retention">Data retention</h2>
        <ul>
          <li>
            <strong>Newsletter email addresses</strong> are retained until you
            unsubscribe or request deletion. Every email we send contains a
            one-click unsubscribe link.
          </li>
          <li>
            <strong>Analytics records</strong> are retained for 14 months in
            Google Analytics&apos; configured retention setting.
          </li>
          <li>
            <strong>Server &amp; security logs</strong> are retained for up to
            30 days, then rotated.
          </li>
          <li>
            <strong>Email correspondence</strong> is retained as long as we
            have a reasonable need to refer back to it (typically 24 months).
          </li>
        </ul>

        <h2 id="security">Security</h2>
        <p>
          The site is delivered over HTTPS only. Newsletter and inbound-email
          processing run on managed third-party platforms that maintain their
          own SOC 2 or equivalent assurances. We don&apos;t store payment
          information or run user accounts, which materially limits the
          attack surface.
        </p>

        <h2 id="changes">Changes to this policy</h2>
        <p>
          When the site&apos;s data practices change in a material way, we
          update the <strong>Last updated</strong> date at the top of this
          page and (for newsletter subscribers) include a one-line note in the
          next dispatch. Older versions are available on request.
        </p>

        <h2 id="contact">Contact</h2>
        <p>
          Privacy requests, complaints, and corrections go to{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>. The
          companion documents are our{" "}
          <Link href="/affiliate-disclosure">affiliate disclosure</Link>{" "}
          (commercial relationships, FTC compliance) and the{" "}
          <Link href="/methodology">methodology page</Link> (how we evaluate
          products without first-hand testing). Editorial questions are
          handled by <Link href="/author/nick-miles">Nick Miles</Link>.
        </p>
      </div>
    </article>
  );
}
