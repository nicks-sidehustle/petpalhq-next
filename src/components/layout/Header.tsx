"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { categories } from "@/config/site";

const navLinks = [
  { label: "Guides", href: "/guides" },
  { label: "Methodology", href: "/methodology" },
  { label: "About", href: "/about" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 font-bold text-xl tracking-tight">
          <span style={{ color: "var(--color-navy)" }}>PetPal</span>
          <span style={{ color: "var(--color-teal)" }}>HQ</span>
        </Link>

        {/* Category nav — desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/guides?vertical=${cat.slug}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side — search + mobile toggle */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="p-2 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Search size={18} />
          </Link>
          <button
            className="md:hidden p-2 rounded text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/guides?vertical=${cat.slug}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
