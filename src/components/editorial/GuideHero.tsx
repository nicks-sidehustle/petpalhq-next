import { Calendar, Clock } from "lucide-react";

interface GuideHeroProps {
  title: string;
  description: string;
  category: string;
  updatedDate: string;
  readTime: string;
  image?: string;
}

export function GuideHero({ title, description, category, updatedDate, readTime }: GuideHeroProps) {
  return (
    <header className="mx-auto mb-8 max-w-3xl border-b border-[var(--brand-gold)]/30 pb-8">
      <span className="editorial-tag mb-5">{category}</span>
      <h1 className="mb-5 text-3xl font-bold leading-tight text-[var(--brand-green-deep)] sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      <p className="mb-6 text-lg leading-8 text-[var(--text-secondary)]">
        {description}
      </p>
      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          Updated {updatedDate}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {readTime}
        </span>
      </div>
    </header>
  );
}
