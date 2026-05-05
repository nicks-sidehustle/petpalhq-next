"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Menu, X, Star, Droplet, Filter, Sparkles, Sun, Bird, BookOpen } from "lucide-react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Guides", href: "/guides" },
  { name: "Reviews", href: "/reviews" },
  { name: "Methodology", href: "/methodology" },
  { name: "About", href: "/about" },
];

const shelfItems = [
  { name: "All Guides", href: "/guides", icon: Star, color: "#f29c3a" },
  { name: "Water Quality", href: "/guides?pillar=water-quality", icon: Droplet, color: "#2db8c5" },
  { name: "Filtration", href: "/guides?pillar=aquarium-filtration", icon: Filter, color: "#2db8c5" },
  { name: "Aquarium Care", href: "/guides?pillar=aquarium-care", icon: Sparkles, color: "#2db8c5" },
  { name: "Reptile Habitat", href: "/guides?pillar=reptile-habitat", icon: BookOpen, color: "#4caf50" },
  { name: "Reptile Lighting", href: "/guides?pillar=reptile-lighting", icon: Sun, color: "#4caf50" },
  { name: "Bird Feeders", href: "/guides?pillar=bird-feeders", icon: Bird, color: "#2db8c5" },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50">
      {/* Tier 1 — Editorial tagline bar */}
      <div style={{ background: "#fdfaf3", borderBottom: "1px solid rgba(30, 58, 110, 0.08)" }}>
        <div className="container mx-auto px-6 py-1.5 max-w-5xl text-center">
          <p className="text-xs" style={{ color: "#4a5570", fontFamily: "var(--font-sans)" }}>
            Pet gear, through expert consensus —{" "}
            <Link href="/methodology" className="font-semibold underline" style={{ color: "#1e3a6e" }}>
              how we score
            </Link>
          </p>
        </div>
      </div>

      {/* Tier 2 — Main nav on navy */}
      <div style={{ background: "#1e3a6e" }}>
        <div className="container mx-auto px-6 py-3 max-w-5xl flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" aria-label="PetPalHQ home">
            <Image
              src="/logo-icon.png"
              alt=""
              width={36}
              height={36}
              priority
              className="rounded"
              style={{ background: "white" }}
            />
            <span
              className="text-xl tracking-tight"
              style={{ fontFamily: "var(--font-heading)", color: "white" }}
            >
              PetPal<span style={{ color: "#2db8c5" }}>HQ</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-medium transition-opacity"
                style={{
                  fontSize: "0.9375rem",
                  color: "white",
                  opacity: pathname === item.href ? 1 : 0.7,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: "#f29c3a" }} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-xs outline-none w-28 placeholder:text-white/60"
              style={{ color: "white" }}
            />
          </div>

          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-1"
            style={{ color: "white" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: "white", fontSize: "0.9375rem" }}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}

        {/* Pillar shelf */}
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="container mx-auto px-6 max-w-5xl flex gap-1 py-1">
            {shelfItems.map(({ name, href, icon: Icon, color }) => (
              <Link key={name} href={href} className="shelf-item">
                <Icon className="w-4 h-4" style={{ color }} />
                <span>{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
