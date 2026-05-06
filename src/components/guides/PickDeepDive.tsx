import Image from "next/image";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { buildAmazonUrl, type GuidePick, slugifyHeading } from "@/lib/guides";

interface PickDeepDiveProps {
  pick: GuidePick;
}

export default function PickDeepDive({ pick }: PickDeepDiveProps) {
  const anchor = slugifyHeading(pick.name);
  // pick.bodyHtml is rendered from first-party MDX in src/content/guides via marked() — trusted.

  return (
    <section
      id={anchor}
      className="mb-16 scroll-mt-24 pt-8 border-t"
      style={{ borderColor: "var(--color-cream-deep)" }}
    >
      <div className="flex flex-wrap items-baseline gap-3 mb-4">
        <span
          className="font-serif text-3xl md:text-4xl font-bold"
          style={{ color: "var(--color-coral)" }}
        >
          {pick.score > 0 ? pick.score.toFixed(1) : ""}
          {pick.score > 0 && (
            <span className="text-xl" style={{ color: "var(--color-text-muted)" }}>
              /10
            </span>
          )}
        </span>
        {pick.label && (
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-teal)" }}
          >
            · {pick.label}
          </span>
        )}
      </div>

      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6 leading-tight"
        style={{ color: "var(--color-navy)" }}
      >
        {pick.brand && <span style={{ color: "var(--color-text-muted)" }}>{pick.brand} </span>}
        {pick.name}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          className="md:col-span-1 rounded-lg overflow-hidden"
          style={{ backgroundColor: "var(--color-cream-deep)" }}
        >
          <div className="aspect-square relative">
            {pick.image && (
              <Image
                src={pick.image}
                alt={pick.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-6"
              />
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {pick.price && (
            <p
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--color-navy)" }}
            >
              {pick.price}
            </p>
          )}
          {pick.keyFeatures.length > 0 && (
            <ul
              className="space-y-1.5 mb-5 text-sm"
              style={{ color: "var(--color-text)" }}
            >
              {pick.keyFeatures.map((f, i) => (
                <li key={i} className="flex">
                  <span
                    className="mr-2"
                    style={{ color: "var(--color-teal)" }}
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {pick.asin && (
            <AffiliateLink
              href={buildAmazonUrl(pick.asin)}
              productName={pick.name}
              placement="guide-deep-dive"
              className="inline-block text-sm font-semibold uppercase tracking-widest py-3 px-6 rounded"
              style={{
                backgroundColor: "var(--color-coral)",
                color: "white",
              }}
            >
              Buy on Amazon
            </AffiliateLink>
          )}
        </div>
      </div>

      {pick.bodyHtml && (
        <div
          className="prose mb-8"
          dangerouslySetInnerHTML={{ __html: pick.bodyHtml }}
        />
      )}

      {(pick.pros.length > 0 || pick.cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {pick.pros.length > 0 && (
            <div
              className="p-5 rounded-lg border"
              style={{
                borderColor: "var(--color-cream-deep)",
                backgroundColor: "var(--color-cream-deep)",
              }}
            >
              <h3
                className="font-serif font-bold mb-3 text-base"
                style={{ color: "var(--color-navy)" }}
              >
                What We Love
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text)" }}>
                {pick.pros.map((p, i) => (
                  <li key={i} className="flex">
                    <span
                      className="mr-2 font-bold"
                      style={{ color: "var(--color-green)" }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pick.cons.length > 0 && (
            <div
              className="p-5 rounded-lg border"
              style={{ borderColor: "var(--color-cream-deep)" }}
            >
              <h3
                className="font-serif font-bold mb-3 text-base"
                style={{ color: "var(--color-navy)" }}
              >
                What Could Be Better
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text)" }}>
                {pick.cons.map((c, i) => (
                  <li key={i} className="flex">
                    <span
                      className="mr-2 font-bold"
                      style={{ color: "var(--color-coral)" }}
                      aria-hidden="true"
                    >
                      –
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {pick.verdict && (
        <div
          className="p-5 rounded-lg border-l-4"
          style={{
            backgroundColor: "var(--color-cream-deep)",
            borderLeftColor: "var(--color-teal)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-teal)" }}
          >
            The Verdict
          </p>
          {pick.verdictHtml ? (
            <p
              className="text-base leading-relaxed affiliate-prose"
              style={{ color: "var(--color-text)" }}
              dangerouslySetInnerHTML={{ __html: pick.verdictHtml }}
            />
          ) : (
            <p className="text-base leading-relaxed" style={{ color: "var(--color-text)" }}>
              {pick.verdict}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
