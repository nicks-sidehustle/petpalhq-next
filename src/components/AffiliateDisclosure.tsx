import Link from "next/link";

/**
 * FTC-compliant affiliate disclosure — Loyal & Found style.
 * Must appear near the top of any page containing affiliate links.
 */
export function AffiliateDisclosure() {
  return (
    <p
      style={{
        fontSize: 13,
        fontStyle: "italic",
        marginBottom: 24,
        padding: "10px 16px",
        background: "var(--ivory)",
        border: "1px solid var(--oat)",
        borderRadius: 8,
        color: "var(--shale)",
        fontFamily: "var(--font-body)",
        lineHeight: 1.6,
      }}
    >
      This page contains affiliate links. If you purchase through these links,
      we may earn a commission at no extra cost to you.{" "}
      <Link
        href="/affiliate-disclosure"
        style={{
          textDecoration: "underline",
          color: "var(--tomato)",
          textUnderlineOffset: 2,
        }}
      >
        Learn more
      </Link>
      .
    </p>
  );
}
