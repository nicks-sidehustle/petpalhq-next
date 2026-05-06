import type { ReactNode } from "react";

interface ProseLayoutProps {
  title: string;
  children: ReactNode;
}

export default function ProseLayout({ title, children }: ProseLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl font-bold mb-6" style={{ color: "var(--color-navy)" }}>
        {title}
      </h1>
      <div className="prose">{children}</div>
    </div>
  );
}
