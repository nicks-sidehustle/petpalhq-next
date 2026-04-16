"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Guides", href: "/guides" },
  { label: "How We Research", href: "/methodology" },
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-shadow duration-300"
        style={{
          background: "var(--cream, #FDF9F2)",
          borderBottom: "1px solid var(--oat, #E9DDC9)",
          boxShadow: scrolled
            ? "0 2px 12px -4px rgba(42, 37, 32, 0.08)"
            : "none",
        }}
      >
        <div className="mx-auto px-6 max-w-[900px] flex items-center justify-between h-16">
          {/* Wordmark */}
          <div className="flex items-center gap-9">
            <Link
              href="/"
              className="transition-opacity hover:opacity-80"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 500,
                color: "var(--espresso)",
                letterSpacing: "-0.02em",
                textDecoration: "none",
              }}
            >
              Loyal{" "}
              <em style={{ fontStyle: "italic", color: "var(--tomato)" }}>
                &amp;
              </em>{" "}
              Found
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="transition-colors hover:opacity-100"
                  style={{
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    color: "var(--shale)",
                    opacity: 0.8,
                    textDecoration: "none",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: Newsletter pill + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="#newsletter"
              className="hidden sm:block transition-opacity hover:opacity-90"
              style={{
                padding: "8px 18px",
                background: "var(--espresso)",
                color: "var(--cream)",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Newsletter
            </Link>

            <button
              className="md:hidden p-1.5 -mr-1.5 transition-opacity hover:opacity-80"
              style={{ color: "var(--espresso)" }}
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
        </div>
      </nav>

      {/* Mobile slide-in panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(42, 37, 32, 0.30)" }}
            onClick={() => setMobileOpen(false)}
          />

          <div
            className="absolute top-0 right-0 h-full w-72 flex flex-col"
            style={{
              background: "var(--cream)",
              borderLeft: "1px solid var(--oat)",
              animation: "slideInRight 0.25s ease-out",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 h-16 flex-shrink-0">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 500,
                  color: "var(--espresso)",
                }}
              >
                Loyal{" "}
                <em style={{ fontStyle: "italic", color: "var(--tomato)" }}>
                  &amp;
                </em>{" "}
                Found
              </span>
              <button
                className="p-1.5 -mr-1.5 transition-opacity hover:opacity-80"
                style={{ color: "var(--espresso)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="mx-6 h-[1px]"
              style={{ background: "var(--oat)" }}
            />

            {/* Nav links */}
            <div className="flex flex-col px-6 pt-6 gap-1">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 transition-all duration-200 hover:pl-1"
                  style={{
                    fontSize: 15,
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    color: "var(--shale)",
                    textDecoration: "none",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Bottom tagline */}
            <div className="mt-auto px-6 pb-8">
              <div
                className="h-[1px] mb-6"
                style={{ background: "var(--linen)" }}
              />
              <p
                className="text-xs italic"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--driftwood)",
                  opacity: 0.6,
                }}
              >
                Pet gear, thoughtfully tested
              </p>
            </div>
          </div>

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
