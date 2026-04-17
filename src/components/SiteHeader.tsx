"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { SavedDrawer } from "@/components/SavedDrawer";
import { useSavedProducts } from "@/hooks/useSavedProducts";

function HeaderBookmarkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const navLinks = [
  { label: "Guides", href: "/guides" },
  { label: "How We Research", href: "/methodology" },
  { label: "About", href: "/about" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { count: savedCount } = useSavedProducts();

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

          {/* Right side: shortlist bookmark + Newsletter pill + mobile toggle */}
          <div className="flex items-center gap-3">
            {/* Shortlist trigger — shows a count badge when the user has saved
                products. Drawer state lives in this client component, so the
                count badge reacts live to saves from any ValueTierCard below
                (useSyncExternalStore keeps them in sync). */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={
                savedCount > 0
                  ? `Open shortlist (${savedCount} saved)`
                  : "Open shortlist"
              }
              title={
                savedCount > 0
                  ? `${savedCount} saved`
                  : "No saved products yet"
              }
              className="transition-opacity hover:opacity-80"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: savedCount > 0 ? "var(--espresso)" : "var(--driftwood)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <HeaderBookmarkIcon />
              {savedCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 8,
                    background: "var(--tomato)",
                    color: "var(--cream)",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </button>

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
              {/* Mobile-only shortlist trigger — close the mobile menu
                  first, then open the drawer on the next tick so the
                  slide-in/slide-out animations don't stack. */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => setDrawerOpen(true), 120);
                }}
                className="py-3 transition-all duration-200 hover:pl-1 flex items-center gap-2"
                style={{
                  fontSize: 15,
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  color: "var(--shale)",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "12px 0",
                }}
              >
                <HeaderBookmarkIcon />
                Shortlist
                {savedCount > 0 && (
                  <span
                    style={{
                      marginLeft: 4,
                      padding: "1px 8px",
                      borderRadius: 10,
                      background: "var(--tomato)",
                      color: "var(--cream)",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                )}
              </button>
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

      {/* Shortlist drawer — rendered at the root of the header so it can
          overlay the whole page. Open state is local to SiteHeader; the
          trigger button above calls setDrawerOpen(true). */}
      <SavedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
