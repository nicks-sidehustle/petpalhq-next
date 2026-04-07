import Link from "next/link";

/**
 * FTC-compliant affiliate disclosure component.
 * Must appear near the top of any page containing affiliate links,
 * before the first affiliate link the reader encounters.
 */
export function AffiliateDisclosure() {
  return (
    <p className="text-sm italic mb-6 bg-amber-50 border border-amber-200 rounded px-4 py-3 text-amber-900">
      This page contains affiliate links. If you purchase through these links, we may earn a
      commission at no extra cost to you.{" "}
      <Link href="/affiliate-disclosure" className="underline hover:text-amber-700">
        Learn more
      </Link>
      .
    </p>
  );
}
