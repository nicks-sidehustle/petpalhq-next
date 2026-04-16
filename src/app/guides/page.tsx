import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getAllGuides } from "@/lib/content";

export const metadata: Metadata = {
  title: "Buying Guides",
  description:
    "Expert pet gear buying guides — three picks at three price points. We read the reviews so you don't have to.",
  alternates: { canonical: `${siteConfig.url}/guides` },
};

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 500,
          color: "var(--espresso)",
          margin: "0 0 12px",
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-display)",
        }}
      >
        Buying Guides
      </h1>
      <p
        style={{
          fontSize: 17,
          color: "var(--shale)",
          lineHeight: 1.6,
          margin: "0 0 40px",
          fontFamily: "var(--font-body)",
        }}
      >
        Every guide picks three products at three price points — budget, sweet
        spot, and splurge. We read dozens of expert reviews so you don&apos;t
        have to.
      </p>

      {guides.length === 0 ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--driftwood)",
            fontFamily: "var(--font-body)",
          }}
        >
          No guides published yet — check back soon.
        </p>
      ) : (
        <div>
          {guides.map((guide, i) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 20,
                  padding: "22px 0",
                  borderBottom:
                    i < guides.length - 1
                      ? "1px solid var(--linen)"
                      : "none",
                  alignItems: "center",
                }}
              >
                <div>
                  {guide.collection && (
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--tomato)",
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {guide.collection}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 20,
                      color: "var(--espresso)",
                      marginBottom: 6,
                      lineHeight: 1.25,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {guide.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--shale)",
                      fontFamily: "var(--font-body)",
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    {guide.excerpt || guide.description}
                  </div>

                  {guide.tiers && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 9px",
                          background: "var(--ivory)",
                          color: "var(--leaf)",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Budget {guide.tiers.budget.price}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 9px",
                          background: "var(--ivory)",
                          color: "var(--sage)",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Sweet Spot {guide.tiers.sweetSpot.price}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 9px",
                          background: "var(--ivory)",
                          color: "var(--honey)",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Splurge {guide.tiers.splurge.price}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--driftwood)",
                    }}
                  >
                    {guide.readTime}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
