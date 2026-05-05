import Link from 'next/link';

export function AuthorByline() {
  return (
    <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold flex-shrink-0">
        S
      </div>
      <div>
        <Link href="/author/sarah-mitchell" className="font-medium text-gray-900 hover:underline">
          Sarah Mitchell
        </Link>
        <span className="mx-1">·</span>
        <span>Holiday Decor Editor</span>
      </div>
    </div>
  );
}
