import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroSection } from "@/components/homepage/HeroSection";
import { MethodologyCallout } from "@/components/homepage/MethodologyCallout";
import { HomepageFAQ } from "@/components/homepage/HomepageFAQ";
import { products } from "@/data/products";
import { getAllGuideSummaries } from "@/lib/guides";
import { SITE_URL } from "@/lib/schema";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function HomePage() {
  const allGuides = getAllGuideSummaries();

  return (
    <>
      <SiteHeader />
      <HeroSection guideCount={allGuides.length} productCount={products.length} />
      <MethodologyCallout />
      <HomepageFAQ />
    </>
  );
}
