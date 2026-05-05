interface TrustSectionProps {
  sources: string[];
}

export function TrustSection({ sources }: TrustSectionProps) {
  return (
    <section className="py-10 border-t border-gray-100">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Sources we aggregate</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          {sources.map((source) => (
            <span key={source} className="text-sm text-gray-600 font-medium">
              {source}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          No sponsored content &middot; Updated daily &middot; Unbiased aggregation
        </p>
      </div>
    </section>
  );
}
