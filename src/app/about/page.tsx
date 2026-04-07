import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About PetPalHQ",
  description: "Learn about PetPalHQ's mission, methodology, and the team behind our expert pet gear reviews.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

export default function AboutPage() {
  return (
    <main className="mx-auto px-4 max-w-3xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">About PetPalHQ</h1>
      <p className="text-lg text-gray-500 mb-8">Expert pet gear reviews you can trust.</p>

      <div className="prose max-w-none">
        <h2>Our Mission</h2>
        <p>
          PetPalHQ exists to cut through the noise and help pet owners make smarter buying decisions.
          With thousands of pet products flooding the market every year, knowing what actually works — and
          what&apos;s worth your money — takes real research. That&apos;s what we do.
        </p>

        <h2>Who We Are</h2>
        <p>
          PetPalHQ is led by <Link href="/author/rachel-cooper">Rachel Cooper</Link>, our Senior Pet Editor and a
          former veterinary technician with over 10 years of hands-on experience with dogs, cats, and small animals.
          Rachel has evaluated hundreds of pet products — from budget basics to premium gear — and brings a clinical
          eye to every review.
        </p>

        <h2>Our Review Methodology</h2>
        <p>Every guide and review on PetPalHQ follows the same rigorous process:</p>
        <ol>
          <li>
            <strong>Research:</strong> We start with real user feedback across Amazon, Reddit, and veterinary forums
            to understand what pet owners actually struggle with.
          </li>
          <li>
            <strong>Shortlisting:</strong> We identify the top-selling and top-reviewed products in each category,
            then narrow to a test pool based on brand reputation, safety standards, and material quality.
          </li>
          <li>
            <strong>Hands-on evaluation:</strong> Products are assessed against criteria specific to that category —
            fit, ease of use, durability, safety, and value for money.
          </li>
          <li>
            <strong>Expert review:</strong> Rachel applies her veterinary background to flag any safety or health
            concerns that standard consumer reviews might miss.
          </li>
          <li>
            <strong>Ongoing updates:</strong> We revisit guides when new models launch or user feedback changes
            our recommendations.
          </li>
        </ol>

        <h2>Affiliate Disclosure</h2>
        <p>
          PetPalHQ participates in the Amazon Associates program and other affiliate programs. When you click
          a link on our site and make a purchase, we may earn a small commission at no extra cost to you.
          This never influences our recommendations — we only recommend products we genuinely believe are worth buying.
          Read our full <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> for details.
        </p>

        <h2>Contact Us</h2>
        <p>
          Have a question, product suggestion, or correction? Email us at{" "}
          <a href="mailto:hello@petpalhq.com">hello@petpalhq.com</a>.
        </p>
      </div>
    </main>
  );
}
