import { type Verdict, verdictToSlug } from "@/lib/content/consensus-data";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VerdictBadge({ verdict, size = "md", className = "" }: VerdictBadgeProps) {
  const sizeClasses = {
    sm: "text-[0.6rem] px-2 py-0.5",
    md: "text-[0.7rem] px-2.5 py-1",
    lg: "text-xs px-3 py-1.5",
  };

  return (
    <span
      className={`verdict-badge ${sizeClasses[size]} ${className}`}
      data-verdict={verdictToSlug(verdict)}
    >
      {verdict}
    </span>
  );
}
