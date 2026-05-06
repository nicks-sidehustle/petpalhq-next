import type { Metadata } from "next";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Search",
  description: "Search PetPalHQ guides and reviews.",
};

export default function SearchPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-6 text-center" style={{ color: "var(--color-navy)" }}>
        Search
      </h1>
      <Input
        type="search"
        placeholder="Search guides and reviews…"
        aria-label="Search"
        className="bg-white text-base"
      />
      <p className="text-sm mt-6 text-center" style={{ color: "var(--color-text-muted)" }}>
        Search functionality coming soon.
      </p>
    </div>
  );
}
