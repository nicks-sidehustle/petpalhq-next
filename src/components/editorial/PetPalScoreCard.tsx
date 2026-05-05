import { type ConsensusReview, verdictToSlug } from "@/lib/content/consensus-data";
import { VerdictBadge } from "@/components/reviews/VerdictBadge";

interface ScoreCardProps {
  review: ConsensusReview;
  compact?: boolean;
  className?: string;
}

const PILLAR_LABELS: Record<string, string> = {
  expertConsensus: "Expert Consensus",
  effectiveness: "Effectiveness",
  animalSafety: "Animal Safety",
  durability: "Durability",
  value: "Value",
};

const PILLAR_WEIGHTS: Record<string, string> = {
  expertConsensus: "30%",
  effectiveness: "25%",
  animalSafety: "20%",
  durability: "15%",
  value: "10%",
};

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 shrink-0 text-[var(--text-muted)]" style={{ fontFamily: "var(--font-sans)" }}>
        {label} <span className="text-xs opacity-60">({weight})</span>
      </span>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-parchment-dark)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: score >= 8.5
              ? "var(--color-evergreen)"
              : score >= 7.0
                ? "var(--color-antique-gold)"
                : "var(--color-cranberry)",
          }}
        />
      </div>
      <span className="w-8 text-right font-semibold text-sm" style={{ fontFamily: "var(--font-heading)" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export function PetPalScoreCard({ review, compact = false, className = "" }: ScoreCardProps) {
  const { pillarScores, petpalGearScore, verdict, sourcesCount, lastUpdated } = review;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className="score-circle"
          data-verdict={verdictToSlug(verdict)}
        >
          {petpalGearScore.toFixed(1)}
        </div>
        <div>
          <VerdictBadge verdict={verdict} size="sm" />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            {sourcesCount} expert sources
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-5 ${className}`} style={{ borderColor: "rgba(26, 71, 38, 0.1)", background: "var(--color-card-surface)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            PetPal Gear Score
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
              {petpalGearScore.toFixed(1)}
            </span>
            <VerdictBadge verdict={verdict} size="md" />
          </div>
        </div>
        <div className="text-right text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          <p>{sourcesCount} expert sources</p>
          <p>Updated {lastUpdated}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {(Object.keys(PILLAR_LABELS) as Array<keyof typeof PILLAR_LABELS>).map((key) => (
          <ScoreBar
            key={key}
            label={PILLAR_LABELS[key]}
            score={pillarScores[key as keyof typeof pillarScores]}
            weight={PILLAR_WEIGHTS[key]}
          />
        ))}
      </div>

      <p className="mt-4 pt-3 border-t text-xs" style={{ borderColor: "rgba(26, 71, 38, 0.08)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
        Expert Consensus 30% + Effectiveness 25% + Animal Safety 20% + Durability 15% + Value 10%.{" "}
        <a href="/methodology" className="underline hover:no-underline">Our methodology</a>
      </p>
    </div>
  );
}
