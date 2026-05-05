import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";

export const metadata: Metadata = {
  title: `Our Network | ${siteConfig.name}`,
  description:
    "PetPalHQ is part of a small network of independent review sites operated by the same editorial team. Learn about our sister brands.",
  alternates: {
    canonical: `${SITE_URL}/our-network`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sisterSites = [
  {
    name: "SmartHomeExplorer.com",
    url: "https://www.smarthomeexplorer.com",
    description: "Expert-aggregated smart home device reviews.",
  },
  {
    name: "GardenGearHQ.com",
    url: "https://www.gardengearhq.com",
    description: "Expert garden and outdoor gear reviews — strong overlap on backyard birding gear and outdoor reptile habitats.",
  },
  {
    name: "DeskGearHQ.com",
    url: "https://www.deskgearhq.com",
    description: "Expert desk and office gear reviews.",
  },
  {
    name: "ChristmasGearHQ.com",
    url: "https://www.christmasgearhq.com",
    description: "Expert holiday decor and gift gear reviews — the place for pet-themed holiday decor and pet stockings.",
  },
  {
    name: "FoodsInMovies.com",
    url: "https://www.foodsinmovies.com",
    description: "Iconic food scenes from cinema, recipes, and kitchen gear.",
  },
];

export default function OurNetworkPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Our Network
          </h1>
          <p className="text-gray-600 mb-8">
            PetPalHQ is part of a small group of independently operated
            review sites managed by the same editorial team. Each site covers a
            distinct category and maintains its own editorial focus.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mb-4">
            PetPalHQ.com
            <span
              className="ml-3 text-sm font-medium px-2 py-0.5 rounded"
              style={{ background: "#f7eedd", color: "#1e3a6e" }}
            >
              You are here
            </span>
          </h2>
          <p className="text-gray-600 mb-8">
            Exotic pet gear reviews — synthesized from veterinarians, aquarists,
            herpetologists, and ornithologists. Aquarium, reptile, and backyard
            birding picks scored on a five-pillar consensus model.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Sister Brands</h2>
          <ul className="space-y-4 mb-10">
            {sisterSites.map((site) => (
              <li
                key={site.url}
                className="border border-gray-200 rounded-lg p-4"
              >
                <p className="font-semibold text-gray-900">{site.name}</p>
                <p className="text-sm text-gray-500 mt-1">{site.description}</p>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">
            Editorial Independence
          </h2>
          <p className="text-gray-600 mb-4">
            Each site in this network operates independently. Content decisions,
            product selections, and editorial opinions are made separately for
            each brand based on its own audience and subject matter. Shared
            ownership does not mean shared rankings or coordinated recommendations.
          </p>
          <p className="text-gray-600">
            All sites participate in affiliate programs. When you purchase
            through our links, we may earn a commission at no extra cost to you.
            This never influences which products we recommend.
          </p>
        </div>
      </main>
    </>
  );
}
