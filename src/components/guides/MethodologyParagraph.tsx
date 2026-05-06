import Link from "next/link";

interface MethodologyParagraphProps {
  expertSourceCount?: number;
  reviewMethod?: string;
}

export default function MethodologyParagraph({
  expertSourceCount,
  reviewMethod,
}: MethodologyParagraphProps) {
  return (
    <section className="mb-16">
      <p
        className="text-base leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        Every product on this list has been scored against the{" "}
        <Link
          href="/methodology"
          className="font-semibold hover:underline"
          style={{ color: "var(--color-teal)" }}
        >
          PetPal Gear Score
        </Link>
        , a weighted composite of expert consensus, observed effectiveness, animal safety,
        long-term durability, and value.{" "}
        {reviewMethod && <>Review method: {reviewMethod}.{" "}</>}
        {expertSourceCount && expertSourceCount > 0 && (
          <>Synthesized from <strong>{expertSourceCount}+ expert sources</strong>.</>
        )}
      </p>
    </section>
  );
}
