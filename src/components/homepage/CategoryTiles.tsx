import Link from "next/link";
import { categories } from "@/config/site";

const categoryColors: Record<string, string> = {
  dogs: "var(--color-navy)",
  cats: "var(--color-teal)",
  aquarium: "var(--color-teal-deep)",
  reptile: "var(--color-green)",
  birds: "var(--color-coral)",
};

export default function CategoryTiles() {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-muted)" }}>
        Browse by pet
      </h2>
      <div className="grid grid-cols-5 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/reviews?category=${cat.slug}`}
            className="flex flex-col items-center justify-center gap-2 rounded-lg py-5 text-white text-center transition-opacity hover:opacity-90"
            style={{ backgroundColor: categoryColors[cat.id] || "var(--color-navy)" }}
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-sm font-medium">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
