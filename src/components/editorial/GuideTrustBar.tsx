import Link from "next/link";
import { Calendar, Clock, ShieldCheck } from "lucide-react";

interface GuideTrustBarProps {
  updatedDate: string;
  readTime: string;
}

export function GuideTrustBar({ updatedDate, readTime }: GuideTrustBarProps) {
  return (
    <section className="mb-5 rounded-full border border-[var(--brand-green)]/10 bg-white/80 px-4 py-3 shadow-sm">
      <div className="grid gap-3 text-sm text-gray-600 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/author/sarah-mitchell" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-[var(--brand-red)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">S</span>
            Sarah Mitchell
          </Link>
          <span className="hidden text-gray-300 sm:inline">/</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[var(--brand-green)]" />
            Updated {updatedDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[var(--brand-green)]" />
            {readTime}
          </span>
        </div>
        <Link href="/affiliate-disclosure" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-green)] hover:text-[var(--brand-red)]">
          <ShieldCheck className="h-4 w-4" />
          Affiliate links disclosed
        </Link>
      </div>
    </section>
  );
}
