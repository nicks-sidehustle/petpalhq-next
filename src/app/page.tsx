import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { getAllGuides } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: siteConfig.url },
};

const collections = [
  {
    title: "For New Puppies",
    desc: "The first-year essentials",
    count: 6,
    href: "/guides",
  },
  {
    title: "For Senior Pets",
    desc: "Comfort as they age",
    count: 4,
    href: "/guides",
  },
  {
    title: "For Adventure Dogs",
    desc: "Trails, travel, the outdoors",
    count: 5,
    href: "/guides",
  },
  {
    title: "For Indoor Cats",
    desc: "Enrichment for apartment life",
    count: 4,
    href: "/guides",
  },
  {
    title: "For Small Spaces",
    desc: "Big love, tiny apartments",
    count: 3,
    href: "/guides",
  },
  {
    title: "For First-Time Owners",
    desc: "Starting from scratch",
    count: 5,
    href: "/guides",
  },
];

export default async function HomePage() {
  const allGuides = await getAllGuides();
  const featuredGuide = allGuides.find((g) => g.featured);
  const latestGuides = allGuides.slice(0, 4);

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "72px 36px 56px",
          maxWidth: 780,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--tomato)",
            marginBottom: 20,
            fontFamily: "var(--font-body)",
            fontWeight: 700,
          }}
        >
          Pet gear, thoughtfully tested
        </p>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 500,
            color: "var(--espresso)",
            lineHeight: 1.08,
            margin: "0 0 18px",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display)",
          }}
        >
          Real picks for{" "}
          <em style={{ fontStyle: "italic", color: "var(--tomato)" }}>
            real pet owners
          </em>
          .
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--shale)",
            lineHeight: 1.6,
            maxWidth: 580,
            margin: "0 auto 32px",
            fontFamily: "var(--font-body)",
          }}
        >
          We read dozens of expert reviews so you don&apos;t have to — then pick
          three products at three price points: one under $30, one sweet-spot,
          and one worth the splurge. No paid sponsorships. No fluff.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/guides"
            style={{
              padding: "12px 26px",
              background: "var(--tomato)",
              color: "var(--cream)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Browse guides
          </Link>
          <Link
            href="/methodology"
            style={{
              padding: "12px 26px",
              background: "#FFFFFF",
              color: "var(--espresso)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              border: "1px solid var(--oat)",
              textDecoration: "none",
            }}
          >
            How we research
          </Link>
        </div>
      </section>

      {/* ─── Value Tier Explainer ──────────────────────────────────── */}
      <section
        style={{ padding: "0 36px 56px", maxWidth: 900, margin: "0 auto" }}
      >
        <div
          style={{
            background: "var(--ivory)",
            borderRadius: 18,
            padding: "36px 32px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--tomato)",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "var(--espresso)",
                margin: 0,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              A pick for every budget
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {/* Budget */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "20px 22px",
                borderLeft: "4px solid var(--leaf)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--leaf)",
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  marginBottom: 8,
                }}
              >
                Best for the Money
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "var(--espresso)",
                  fontWeight: 500,
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-display)",
                }}
              >
                Under $30
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--shale)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-body)",
                }}
              >
                The experts&apos; top budget pick. Won&apos;t disappoint,
                won&apos;t break the bank.
              </div>
            </div>

            {/* Sweet Spot */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "20px 22px",
                borderLeft: "4px solid var(--sage)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--sage)",
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  marginBottom: 8,
                }}
              >
                The Sweet Spot
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "var(--espresso)",
                  fontWeight: 500,
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-display)",
                }}
              >
                $30&ndash;$75
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--shale)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-body)",
                }}
              >
                Our default recommendation. Where most people should land.
              </div>
            </div>

            {/* Splurge */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "20px 22px",
                borderLeft: "4px solid var(--honey)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--honey)",
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  marginBottom: 8,
                }}
              >
                Worth the Splurge
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "var(--espresso)",
                  fontWeight: 500,
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-display)",
                }}
              >
                $75+
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--shale)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-body)",
                }}
              >
                Only if you need what it does better. We&apos;ll tell you when.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Guide ────────────────────────────────────────── */}
      {featuredGuide && (
        <section
          style={{ padding: "0 36px 56px", maxWidth: 900, margin: "0 auto" }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--driftwood)",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            This week&apos;s feature
          </p>
          <Link
            href={`/guides/${featuredGuide.slug}`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--oat)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "32px 32px" }}>
                {featuredGuide.collection && (
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      background: "var(--ivory)",
                      color: "var(--tomato)",
                      borderRadius: 6,
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      marginBottom: 14,
                    }}
                  >
                    {featuredGuide.collection}
                  </div>
                )}
                <h2
                  style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color: "var(--espresso)",
                    margin: "0 0 10px",
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {featuredGuide.title}
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--shale)",
                    lineHeight: 1.6,
                    margin: "0 0 20px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {featuredGuide.description}
                </p>

                {/* Tier price chips */}
                {featuredGuide.tiers && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      marginBottom: 22,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--ivory)",
                        borderRadius: 8,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--leaf)",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Budget
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          color: "var(--espresso)",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {featuredGuide.tiers.budget.price}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--ivory)",
                        borderRadius: 8,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--sage)",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Sweet Spot
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          color: "var(--espresso)",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {featuredGuide.tiers.sweetSpot.price}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--ivory)",
                        borderRadius: 8,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--honey)",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Splurge
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          color: "var(--espresso)",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {featuredGuide.tiers.splurge.price}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: "10px 22px",
                    background: "var(--tomato)",
                    color: "var(--cream)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    display: "inline-block",
                  }}
                >
                  Read the guide
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ─── Browse by Collection ──────────────────────────────────── */}
      <section
        style={{ padding: "0 36px 56px", maxWidth: 900, margin: "0 auto" }}
      >
        <div
          style={{ paddingTop: 48, borderTop: "1px solid var(--oat)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 22,
            }}
          >
            <h2
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--espresso)",
                margin: 0,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              Browse by collection
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {collections.map((c, i) => (
              <Link
                key={i}
                href={c.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--oat)",
                    borderRadius: 12,
                    padding: "22px 20px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      color: "var(--espresso)",
                      marginBottom: 6,
                      lineHeight: 1.25,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {c.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--shale)",
                      fontFamily: "var(--font-body)",
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    {c.desc}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--tomato)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                    }}
                  >
                    {c.count} guides &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Latest Guides ─────────────────────────────────────────── */}
      <section
        style={{ padding: "0 36px 56px", maxWidth: 900, margin: "0 auto" }}
      >
        <div
          style={{ paddingTop: 48, borderTop: "1px solid var(--oat)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 22,
            }}
          >
            <h2
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--espresso)",
                margin: 0,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              Latest guides
            </h2>
            <Link
              href="/guides"
              style={{
                fontSize: 13,
                color: "var(--tomato)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              All guides &rarr;
            </Link>
          </div>
          <div>
            {latestGuides.map((g, i) => (
              <Link
                key={i}
                href={`/guides/${g.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: g.image ? "72px 1fr auto" : "1fr auto",
                    gap: 20,
                    padding: "22px 0",
                    borderBottom: "1px solid var(--linen)",
                    alignItems: "center",
                  }}
                >
                  {g.image && (
                    <div
                      style={{
                        position: "relative",
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "var(--ivory)",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={g.image}
                        alt={g.title}
                        fill
                        sizes="72px"
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  )}
                  <div>
                    {g.collection && (
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
                        {g.collection}
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
                      {g.title}
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
                      {g.excerpt || g.description}
                    </div>

                    {/* Tier chips */}
                    {g.tiers && (
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
                          Budget {g.tiers.budget.price}
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
                          Sweet Spot {g.tiers.sweetSpot.price}
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
                          Splurge {g.tiers.splurge.price}
                        </span>
                      </div>
                    )}
                  </div>
                  {g.sourceCount && (
                    <div
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: "var(--tomato)",
                        }}
                      >
                        {g.sourceCount}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--driftwood)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        sources
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Newsletter: The Weekly Dig ────────────────────────────── */}
      <section
        id="newsletter"
        style={{ padding: "0 36px 56px", maxWidth: 900, margin: "0 auto" }}
      >
        <div
          style={{
            background: "var(--espresso)",
            borderRadius: 18,
            padding: "48px 40px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--honey)",
              marginBottom: 14,
              fontFamily: "var(--font-body)",
              fontWeight: 700,
            }}
          >
            The weekly dig
          </p>
          <h2
            style={{
              fontSize: 32,
              color: "var(--cream)",
              margin: "0 0 10px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-display)",
            }}
          >
            New picks, every{" "}
            <em style={{ fontStyle: "italic", color: "var(--honey)" }}>
              Friday
            </em>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--sandstone)",
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto 26px",
              fontFamily: "var(--font-body)",
            }}
          >
            One email a week with our newest guides, seasonal care tips, and an
            honest &ldquo;what we passed on&rdquo; section. No deal spam.
          </p>
          <form
            style={{
              display: "flex",
              gap: 10,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "var(--walnut)",
                border: "1px solid var(--shale)",
                borderRadius: 8,
                color: "var(--cream)",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                background: "var(--tomato)",
                color: "var(--cream)",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
