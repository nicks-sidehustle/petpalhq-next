export function TrustBar() {
  return (
    <section className="border-b border-gray-100">
      <div className="container mx-auto px-4 py-3 max-w-3xl">
        <div className="flex justify-center items-center gap-4 text-xs text-gray-400">
          <span><strong className="text-gray-600">21</strong> sources</span>
          <span className="text-gray-200">|</span>
          <span><strong className="text-gray-600">177</strong> products</span>
          <span className="text-gray-200">|</span>
          <span>Updated <strong className="text-gray-600">daily</strong></span>
        </div>
      </div>
    </section>
  );
}
