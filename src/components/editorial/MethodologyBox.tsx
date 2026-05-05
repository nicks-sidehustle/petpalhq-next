import Link from "next/link";
import { BarChart3 } from "lucide-react";

interface MethodologyBoxProps {
  expertSourceCount?: number;
  lastProductCheck?: string;
  className?: string;
}

export function MethodologyBox({
  expertSourceCount,
  lastProductCheck,
  className = "",
}: MethodologyBoxProps) {
  return (
    <section
      className={`rounded-lg p-5 ${className}`}
      style={{ background: "var(--color-parchment-dark)", border: "1px solid rgba(26, 71, 38, 0.08)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsla(150, 46%, 22%, 0.08)" }}>
          <BarChart3 className="w-5 h-5" style={{ color: "var(--color-evergreen)" }} />
        </div>
        <div>
          <h3 className="text-sm font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
            How We Score Products
          </h3>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            Every product in this guide is scored using the PetPal Gear Score: Expert Consensus (30%) + Effectiveness (25%) + Animal Safety (20%) + Durability (15%) + Value (10%).
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            {expertSourceCount != null && (
              <span>{expertSourceCount} expert sources analyzed</span>
            )}
            {lastProductCheck && (
              <span>Products verified {lastProductCheck}</span>
            )}
            <Link href="/methodology" className="font-semibold underline" style={{ color: "var(--color-cranberry)" }}>
              Read our full methodology
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
