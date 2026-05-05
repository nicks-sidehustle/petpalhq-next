import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchResultsClient } from "@/components/SearchResultsClient";
import { products } from "@/data/products";
import { getAllGuideSummaries } from "@/lib/guides";

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="py-10 text-center">Loading...</div>}>
        <SearchResultsClient products={products} guides={getAllGuideSummaries()} />
      </Suspense>
    </>
  );
}
