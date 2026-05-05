import Link from 'next/link';

export function AuthorByline() {
  return (
    <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
        style={{ background: "#f7eedd", color: "#1e3a6e" }}
      >
        N
      </div>
      <div>
        <Link href="/author/nick-miles" className="font-medium text-gray-900 hover:underline">
          Nick Miles
        </Link>
        <span className="mx-1">·</span>
        <span>Chief Editor</span>
      </div>
    </div>
  );
}
