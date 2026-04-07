import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getAllGuides } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pet Gear Buying Guides",
  description: "Expert pet gear buying guides — dog harnesses, cat feeders, pet toys, and more. Researched and tested by our senior pet editor.",
  alternates: { canonical: `${siteConfig.url}/guides` },
};

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <main className="mx-auto px-4 max-w-4xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pet Gear Buying Guides</h1>
      <p className="text-gray-500 mb-8">
        In-depth buying guides researched and written by our senior pet editor, Rachel Cooper.
        Each guide compares the top products so you can make a confident decision.
      </p>

      {guides.length === 0 ? (
        <p className="text-gray-400 text-sm">No guides published yet — check back soon.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {guide.category}
                  </span>
                  <span className="text-xs text-gray-400">{guide.readTime}</span>
                </div>
                <h2 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-amber-600 transition-colors line-clamp-2">
                  {guide.title}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-3 mb-3">{guide.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {new Date(guide.publishDate).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    Read guide <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
