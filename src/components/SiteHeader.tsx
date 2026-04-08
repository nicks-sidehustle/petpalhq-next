"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Guides", href: "/guides" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
];

const petTabs = ["Dogs", "Cats", "Small Pets", "Birds", "Fish", "Outdoor"];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* Tier 1 — Dark top bar */}
      <div style={{ background: 'var(--ink, #1C1209)' }}>
        <div className="mx-auto px-6 max-w-5xl flex items-center justify-between h-11">
          <Link href="/" className="text-xl tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--hero-foreground, #f0fdf4)' }}>
            PetPal<span style={{ color: 'var(--terracotta, #E05C2A)' }}>HQ</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium transition-colors opacity-60 hover:opacity-100"
                style={{ color: 'var(--hero-foreground, #f0fdf4)' }}
              >
                {label}
              </Link>
            ))}
            <Search className="w-3.5 h-3.5 opacity-40 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: 'var(--hero-foreground)' }} />
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-1"
            style={{ color: 'var(--hero-foreground)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <nav className="sm:hidden px-6 pb-3 flex flex-col gap-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="text-sm py-1.5 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--hero-foreground)' }}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Tier 2 — Pet type tabs on parchment */}
      <div style={{ background: 'var(--parchment, #F5EDD8)', borderBottom: '1px solid rgba(28,18,9,0.08)' }}>
        <div className="mx-auto px-6 max-w-5xl py-2">
          <div className="pet-tabs">
            {petTabs.map((tab) => (
              <Link
                key={tab}
                href={`/reviews/${tab.toLowerCase().replace(/\s+/g, '-')}`}
                className="pet-tab"
              >
                {tab}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
