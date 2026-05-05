export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-6 w-20 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 rounded" />
          <div className="flex-1 h-10 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded mx-auto mt-2" />
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}