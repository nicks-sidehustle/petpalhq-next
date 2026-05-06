import Image from "next/image";

interface GuideHeroProps {
  category: string;
  title: string;
  excerpt?: string;
  authorName?: string;
  updatedDate?: string;
  readTime?: string;
  heroImage?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function GuideHero({
  category,
  title,
  excerpt,
  authorName = "Nick Miles",
  updatedDate,
  readTime,
  heroImage,
}: GuideHeroProps) {
  return (
    <header className="mb-12">
      <div className="max-w-3xl">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          {category}
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-5 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          {title}
        </h1>
        {excerpt && (
          <p
            className="text-lg mb-6 leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            {excerpt}
          </p>
        )}
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          By <span className="font-medium" style={{ color: "var(--color-text)" }}>{authorName}</span>
          {updatedDate && <> {" · "}Updated {formatDate(updatedDate)}</>}
          {readTime && <> {" · "} {readTime}</>}
        </p>
        <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>
          PetPalHQ is reader-supported. We may earn a commission from qualifying Amazon
          purchases at no extra cost to you.
        </p>
      </div>
      {heroImage && (
        <div className="mt-8 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--color-cream-deep)" }}>
          <Image
            src={heroImage}
            alt={title}
            width={1600}
            height={900}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      )}
    </header>
  );
}
