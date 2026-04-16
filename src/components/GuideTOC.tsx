'use client';

import { useState, useEffect } from 'react';
import type { Heading } from '@/lib/content';

interface Props {
  headings: Heading[];
}

export function GuideTOC({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter to only H2s for the TOC to keep it compact
  const tocItems = headings.filter((h) => h.level === 2);

  useEffect(() => {
    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    for (const item of tocItems) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [tocItems]);

  if (tocItems.length < 3) return null;

  return (
    <>
      {/* Desktop: fixed sidebar on the left edge */}
      <nav
        className="hidden xl:block fixed top-24 left-[max(1rem,calc(50%-40rem))] max-h-[calc(100vh-8rem)] overflow-y-auto w-52"
        aria-label="Table of contents"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          On this page
        </p>
        <ul className="space-y-1">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`block text-sm py-1 border-l-2 pl-3 transition-colors ${
                  activeId === item.id
                    ? 'border-amber-500 text-amber-700 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: floating button + overlay */}
      <div className="xl:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
          style={{ background: 'var(--forest)' }}
          aria-label="Table of contents"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setIsOpen(false)}
            />
            <nav
              className="fixed bottom-20 right-6 z-50 w-72 max-h-80 overflow-y-auto rounded-xl shadow-xl bg-white border border-gray-200 p-4"
              aria-label="Table of contents"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                On this page
              </p>
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className={`block text-sm py-1.5 px-2 rounded transition-colors ${
                        activeId === item.id
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
    </>
  );
}
