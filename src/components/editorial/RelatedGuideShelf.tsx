import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GuideSummary } from "@/lib/guides";

interface RelatedGuideShelfProps {
  guides: GuideSummary[];
}

export function RelatedGuideShelf({ guides }: RelatedGuideShelfProps) {
  if (!guides.length) return null;

  return (
    <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green)]">Read next</p>
          <h2 className="text-xl font-bold text-gray-900">Related holiday gear guides</h2>
        </div>
        <Link href="/guides" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-red)] hover:gap-2 transition-all">
          All guides <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="rounded-xl border border-gray-100 bg-[var(--brand-cream)]/60 p-4 hover:border-[var(--brand-green)]/40 hover:bg-[var(--brand-cream)] transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-green)]">{guide.category}</span>
            <h3 className="mt-2 text-sm font-semibold leading-5 text-gray-900">{guide.title}</h3>
            <p className="mt-2 text-xs leading-5 text-gray-500 line-clamp-3">{guide.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
