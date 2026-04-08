import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Our Network",
  description: "Explore all sites in the HQ Network — expert buying guides across home, garden, pets, food, gifts, and more.",
  alternates: { canonical: `${siteConfig.url}/our-network` },
};

const networkSites = [
  {
    name: "SmartHomeExplorer",
    url: "https://www.smarthomeexplorer.com",
    tagline: "Expert Smart Home Reviews",
    description: "Smart speakers, displays, doorbells, thermostats, and home automation gear.",
    icon: "🏠",
    category: "Smart Home",
  },
  {
    name: "GardenGearHQ",
    url: "https://gardengearhq.com",
    tagline: "Expert Garden & Outdoor Gear Reviews",
    description: "Garden tools, greenhouses, planters, composters, and outdoor gear for home gardeners.",
    icon: "🌿",
    category: "Garden",
  },
  {
    name: "DeskGearHQ",
    url: "https://deskgearhq.com",
    tagline: "Expert Desk & Workspace Reviews",
    description: "Monitors, chairs, desks, keyboards, and productivity gear for home offices and gaming setups.",
    icon: "💻",
    category: "Home Office",
  },
  {
    name: "ChristmasGearHQ",
    url: "https://christmasgearhq.com",
    tagline: "Your Guide to the Best Holiday Gear",
    description: "Christmas decorations, tree stands, lights, ornaments, and holiday storage — expert reviews for a magical season.",
    icon: "🎄",
    category: "Holiday",
  },
  {
    name: "FoodsInMovies",
    url: "https://www.foodsinmovies.com",
    tagline: "Cinema-Inspired Food & Kitchen Gear",
    description: "Recreate iconic movie meals — recipes, kitchen tools, and watch-party guides for film and food enthusiasts.",
    icon: "🎬",
    category: "Food & Film",
  },
  {
    name: "PetPalHQ",
    url: "https://petpalhq.com",
    tagline: "Expert Pet Gear Reviews & Buying Guides",
    description: "Dog harnesses, cat feeders, pet toys, and accessories — tested by a former vet tech.",
    icon: "🐾",
    category: "Pets",
    current: true,
  },
  {
    name: "OneClickAI",
    url: "https://oneclickai.io",
    tagline: "AI Tools for Business",
    description: "AI-powered tools and automations for business professionals — coming soon.",
    icon: "🤖",
    category: "AI & Tech",
  },
];

export default function OurNetworkPage() {
  return (
    <main className="mx-auto px-4 max-w-4xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Network</h1>
      <p className="text-gray-500 mb-10">
        PetPalHQ is part of the HQ Network — a collection of independent, expert-led buying guide sites
        covering everything from smart home gear to garden tools to pet accessories.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {networkSites.map((site) => (
          <div
            key={site.name}
            className={`border rounded-xl p-5 ${
              site.current
                ? "border-amber-400 bg-amber-50"
                : "border-gray-200 bg-white hover:border-amber-200 hover:shadow-sm transition-all"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{site.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={site.url}
                    target={site.current ? undefined : "_blank"}
                    rel={site.current ? undefined : "noopener noreferrer"}
                    className="font-bold text-gray-900 hover:text-amber-600 transition-colors"
                  >
                    {site.name}
                  </a>
                  {site.current && (
                    <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      You are here
                    </span>
                  )}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {site.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 italic">{site.tagline}</p>
                <p className="text-sm text-gray-600 mt-1.5">{site.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
