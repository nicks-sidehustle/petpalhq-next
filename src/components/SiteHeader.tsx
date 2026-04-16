"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Search } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Guides", href: "/guides" },
  { label: "Reviews", href: "/reviews" },
  { label: "Methodology", href: "/methodology" },
  { label: "About", href: "/about" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile panel is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-shadow duration-300"
        style={{
          background: "var(--ink, #1C1209)",
          borderBottom: "1px solid rgba(87, 81, 74, 0.08)",
          boxShadow: scrolled
            ? "0 4px 24px -4px rgba(28, 18, 9, 0.25)"
            : "none",
        }}
      >
        {/* Thin gold accent line — the "quality seal" */}
        <div
          className="h-[1px] w-full"
          style={{ background: "linear-gradient(90deg, transparent 5%, var(--aged-gold, #C0A882) 50%, transparent 95%)" }}
        />

        <div className="mx-auto px-6 max-w-6xl flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl tracking-tight transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--hero-foreground, #f0fdf4)",
            }}
          >
            PetPal
            <span
              className="transition-colors"
              style={{ color: "var(--aged-gold, #C0A882)" }}
            >
              HQ
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium tracking-wide transition-opacity duration-200 opacity-50 hover:opacity-100"
                style={{ color: "var(--hero-foreground, #f0fdf4)" }}
              >
                {label}
              </Link>
            ))}

            {/* Divider */}
            <span
              className="w-[1px] h-4"
              style={{ background: "rgba(244, 241, 235, 0.12)" }}
            />

            <button
              className="opacity-40 hover:opacity-80 transition-opacity duration-200"
              style={{ color: "var(--hero-foreground)" }}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-1.5 -mr-1.5 transition-opacity hover:opacity-80"
            style={{ color: "var(--hero-foreground)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile slide-in panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Frosted glass backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(28, 18, 9, 0.40)" }}
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel sliding in from right */}
          <nav
            className="absolute top-0 right-0 h-full w-72 flex flex-col"
            style={{
              background: "var(--ink, #1C1209)",
              borderLeft: "1px solid rgba(87, 81, 74, 0.12)",
              animation: "slideInRight 0.25s ease-out",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 h-14 flex-shrink-0">
              <span
                className="text-lg tracking-tight"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--hero-foreground, #f0fdf4)",
                }}
              >
                PetPal
                <span style={{ color: "var(--aged-gold, #C0A882)" }}>HQ</span>
              </span>
              <button
                className="p-1.5 -mr-1.5 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--hero-foreground)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gold divider */}
            <div
              className="mx-6 h-[1px]"
              style={{ background: "rgba(192, 168, 130, 0.20)" }}
            />

            {/* Nav links */}
            <div className="flex flex-col px-6 pt-6 gap-1">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-sm font-medium tracking-wide transition-all duration-200 opacity-60 hover:opacity-100 hover:pl-1"
                  style={{ color: "var(--hero-foreground, #f0fdf4)" }}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Bottom accent */}
            <div className="mt-auto px-6 pb-8">
              <div
                className="h-[1px] mb-6"
                style={{ background: "rgba(192, 168, 130, 0.15)" }}
              />
              <p
                className="text-xs italic opacity-30"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--hero-foreground)",
                }}
              >
                Expert Reviews for
                <br />
                Discerning Pet Owners
              </p>
            </div>
          </nav>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
