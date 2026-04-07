import Link from "next/link";

interface AuthorBylineProps {
  publishDate?: string;
  updatedDate?: string;
}

export function AuthorByline({ publishDate, updatedDate }: AuthorBylineProps) {
  const displayDate = updatedDate && updatedDate !== publishDate ? updatedDate : publishDate;
  const dateLabel = updatedDate && updatedDate !== publishDate ? "Updated" : "Published";

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500 my-4">
      {/* Avatar */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold border border-amber-200">
        R
      </div>
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/author/rachel-cooper" className="font-semibold text-gray-900 hover:text-amber-600 transition-colors">
            Rachel Cooper
          </Link>
          <span className="text-gray-400">·</span>
          <span className="text-xs text-gray-500">Senior Pet Editor</span>
        </div>
        {displayDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            {dateLabel}{" "}
            {new Date(displayDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
