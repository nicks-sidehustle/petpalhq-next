"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Category {
  name: string;
  count: number;
  icon: string;
  href: string;
  description?: string;
  countLabel?: string;
}

interface CategoryBrowseProps {
  categories: Category[];
}

export function CategoryBrowse({ categories }: CategoryBrowseProps) {
  return (
    <section className="bg-[#f7efe4] py-16 md:py-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-10 max-w-2xl">
          <span className="editorial-tag mb-4">Choose your holiday job</span>
          <h2 className="mb-3 text-3xl font-bold text-[var(--brand-green-deep)] sm:text-4xl">
            Start by Need
          </h2>
          <p className="text-base leading-7 text-[var(--text-muted)]">
            Skip the generic category maze. Pick the part of Christmas you are trying to solve, then jump into the right buying guide.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-[var(--brand-green)]/15 bg-[var(--brand-green)]/15 md:grid-cols-2 lg:grid-cols-7">
          {categories.map((category, index) => (
            <Link
              key={category.href}
              href={category.href}
              className={`group min-h-56 bg-[var(--brand-cream)] p-5 transition-all hover:bg-white lg:col-span-1 ${
                index === 0 || index === 2 ? "lg:col-span-2" : ""
              }`}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <span className="mb-5 block text-4xl transition-transform duration-300 group-hover:-translate-y-1">
                    {category.icon}
                  </span>
                  <h3 className="text-lg font-bold leading-tight text-[var(--brand-green-deep)] transition-colors group-hover:text-[var(--brand-red)]">
                    {category.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                    {category.description ?? `${category.count} ${category.countLabel ?? 'products'}`}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[var(--brand-green)]/10 pt-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {category.count} {category.countLabel ?? 'guides'}
                  </span>
                  <ArrowRight className="h-5 w-5 text-[var(--brand-red)] transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
