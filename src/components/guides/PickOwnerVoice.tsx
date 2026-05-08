import type { OwnerVoiceQuote } from "@/lib/guides";

interface PickOwnerVoiceProps {
  quotes: OwnerVoiceQuote[];
}

/**
 * Renders verbatim community quotes for a pick.
 *
 * Hard rule: quotes must be populated via scripts/fetch-reddit-quotes.ts
 * (the ONLY sanctioned source). Never generate, paraphrase, or infer quotes.
 * This component renders nothing when no quotes exist.
 */
export default function PickOwnerVoice({ quotes }: PickOwnerVoiceProps) {
  if (!quotes.length) return null;

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-1 mb-4">
        <h3
          className="font-serif text-lg font-bold"
          style={{ color: "var(--color-navy)" }}
        >
          What owners are saying
        </h3>
        <p
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Verbatim quotes from community forums — signal, not editorial endorsement.
        </p>
      </div>

      <div className="space-y-4">
        {quotes.map((q, i) => (
          <blockquote
            key={i}
            className="border-l-4 pl-4 py-1"
            style={{ borderLeftColor: "var(--color-teal)" }}
          >
            <p
              className="text-sm leading-relaxed italic mb-2"
              style={{ color: "var(--color-text)" }}
            >
              &ldquo;{q.quote}&rdquo;
            </p>
            <footer
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span className="font-medium">{q.author}</span>
              {" · "}
              <a
                href={q.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-teal)" }}
              >
                {q.sourceLabel}
              </a>
              {" · "}
              <time dateTime={q.date}>{q.date}</time>
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
