"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Menu, X, Bookmark, Moon } from "lucide-react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Reviews", href: "/reviews" },
  { name: "Buying Guides", href: "/guides" },
  { name: "Scores", href: "/scores" },
  { name: "About", href: "/about" },
  { name: "Methodology", href: "/methodology" },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedCount] = useState(0); // placeholder for saved-shortlist counter
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "var(--color-parchment)",
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex items-center justify-between gap-6 py-4">
          {/* Stacked logo: house icon on top, wordmark beneath */}
          <Link
            href="/"
            className="flex flex-col items-center shrink-0"
            aria-label="PetPalHQ home"
          >
            <Image
              src="/logo-icon.png"
              alt=""
              width={44}
              height={44}
              priority
              className="rounded"
            />
            <span
              className="text-[0.7rem] mt-0.5 tracking-tight font-semibold"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              PetPalHQ
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>.com</span>
            </span>
          </Link>

          {/* Desktop nav — flat horizontal, centered between logo and right cluster */}
          <nav className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[0.95rem] font-medium transition-colors"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster: bookmark, dark-toggle, search */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Bookmark icon with notification badge */}
            <button
              aria-label="Saved items"
              className="relative p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <Bookmark className="w-5 h-5" />
              {savedCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
                  style={{
                    background: "var(--color-antique-gold)",
                    color: "var(--color-parchment)",
                  }}
                >
                  {savedCount}
                </span>
              )}
            </button>

            {/* Dark mode toggle (visual placeholder for v2 — site is dark-default) */}
            <button
              aria-label="Toggle theme"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <Moon className="w-5 h-5" />
            </button>

            {/* Search input — desktop only */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md"
              style={{
                background: "var(--color-parchment-dark)",
                border: "1px solid var(--border)",
              }}
            >
              <Search
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="text"
                placeholder="Search articles..."
                className="bg-transparent text-sm outline-none w-44"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            {/* Mobile menu trigger */}
            <button
              className="md:hidden p-1.5"
              style={{ color: "var(--text-primary)" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-medium"
                style={{
                  color:
                    pathname === item.href
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
