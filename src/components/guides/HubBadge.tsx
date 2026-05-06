import Link from "next/link";
import type { Guide } from "@/lib/guides";

interface HubBadgeProps {
  hub?: Guide | null;
}

export default function HubBadge({ hub }: HubBadgeProps) {
  if (!hub) return null;

  return (
    <div className="mb-6 -mt-6">
      <Link
        href={`/guides/${hub.slug}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-white"
        style={{
          borderColor: "var(--color-navy)",
          color: "var(--color-teal)",
          backgroundColor: "transparent",
        }}
      >
        <span style={{ color: "var(--color-text-muted)" }}>Part of:</span>
        <span>{hub.title}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
