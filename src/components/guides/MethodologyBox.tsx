import type { GuideMethodology, GuidePick } from "@/lib/guides";

const DEFAULT_FORMULA =
  "PetPal Gear Score = (Expert × 0.30) + (Effectiveness × 0.25) + (Animal Safety × 0.20) + (Durability × 0.15) + (Value × 0.10)";

const DEFAULT_FACTORS = [
  {
    name: "Expert Consensus",
    weight: 30,
    definition: "Synthesis of vet-recommended sources, hobbyists, and trade publications.",
  },
  {
    name: "Effectiveness",
    weight: 25,
    definition: "Does the product reliably do its core function under real-world conditions.",
  },
  {
    name: "Animal Safety",
    weight: 20,
    definition: "Chemical, thermal, and mechanical safety for the animal.",
  },
  {
    name: "Durability",
    weight: 15,
    definition: "Long-term reliability under wet, hot, or otherwise demanding conditions.",
  },
  {
    name: "Value",
    weight: 10,
    definition: "Price-to-quality given expected lifespan.",
  },
];

interface MethodologyBoxProps {
  methodology?: GuideMethodology;
  picks?: GuidePick[];
}

export default function MethodologyBox({ methodology, picks }: MethodologyBoxProps) {
  if (!methodology) return null;

  const formula = methodology.formula || DEFAULT_FORMULA;
  const factors = methodology.factors?.length ? methodology.factors : DEFAULT_FACTORS;

  const ranked = picks ? [...picks].sort((a, b) => b.score - a.score) : [];

  return (
    <section id="methodology" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        How We Score
      </h2>

      <div
        className="p-6 rounded-lg border mb-6"
        style={{
          borderColor: "var(--color-cream-deep)",
          backgroundColor: "var(--color-cream-deep)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--color-teal)" }}
        >
          Formula
        </p>
        <pre
          className="font-mono text-xs md:text-sm overflow-x-auto whitespace-pre-wrap mb-6 p-3 rounded bg-white"
          style={{ color: "var(--color-text)" }}
        >
          {formula}
        </pre>

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Score Factors
        </p>
        <dl className="space-y-3">
          {factors.map((f, i) => (
            <div key={i}>
              <dt className="font-semibold mb-0.5" style={{ color: "var(--color-navy)" }}>
                {f.name}{" "}
                <span
                  className="text-xs font-normal"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  · {f.weight}%
                </span>
              </dt>
              <dd className="text-sm" style={{ color: "var(--color-text)" }}>
                {f.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {ranked.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-cream-deep)" }}>
          <table className="w-full text-sm bg-white">
            <thead>
              <tr style={{ backgroundColor: "var(--color-cream-deep)" }}>
                <th className="text-left p-3" style={{ color: "var(--color-navy)" }} scope="col">
                  Rank
                </th>
                <th className="text-left p-3" style={{ color: "var(--color-navy)" }} scope="col">
                  Product
                </th>
                <th className="text-left p-3" style={{ color: "var(--color-navy)" }} scope="col">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr
                  key={p.rank}
                  className="border-t"
                  style={{ borderColor: "var(--color-cream-deep)" }}
                >
                  <td className="p-3 font-semibold" style={{ color: "var(--color-text-muted)" }}>
                    #{i + 1}
                  </td>
                  <td className="p-3" style={{ color: "var(--color-text)" }}>
                    {p.brand && <span style={{ color: "var(--color-text-muted)" }}>{p.brand} </span>}
                    {p.name}
                  </td>
                  <td className="p-3 font-semibold" style={{ color: "var(--color-coral)" }}>
                    {p.score.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
