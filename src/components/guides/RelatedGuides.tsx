import Link from "next/link";
import Image from "next/image";
import { getGuideBySlug } from "@/lib/guides";

interface RelatedGuidesProps {
  slugs?: string[];
}

export default function RelatedGuides({ slugs }: RelatedGuidesProps) {
  if (!slugs?.length) return null;

  const guides = slugs
    .map((slug) => getGuideBySlug(slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  if (!guides.length) return null;

  return (
    <section id="related-guides" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        More Guides
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group block rounded-lg overflow-hidden border bg-white"
            style={{ borderColor: "var(--color-cream-deep)" }}
          >
            <div
              className="aspect-video relative"
              style={{ backgroundColor: "var(--color-cream-deep)" }}
            >
              {g.image && (
                <Image
                  src={g.image}
                  alt={g.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--color-teal)" }}
              >
                {g.category}
              </p>
              <h3
                className="font-serif text-base font-bold leading-tight group-hover:underline"
                style={{ color: "var(--color-navy)" }}
              >
                {g.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
