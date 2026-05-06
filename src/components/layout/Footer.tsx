"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUSPrivacyJurisdiction, setDoNotSell, setOptOutAnalytics } from "@/lib/consent";

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "About", href: "/about" },
  { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  { label: "Methodology", href: "/methodology" },
];

const siteLinks = [
  { label: "Guides", href: "/guides" },
  { label: "Methodology", href: "/methodology" },
  { label: "Author", href: "/author/nick-miles" },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return <p className="text-sm" style={{ color: "var(--color-teal)" }}>{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <Input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-white text-gray-900 border-gray-300 text-sm"
      />
      <Button
        type="submit"
        disabled={status === "loading"}
        style={{ backgroundColor: "var(--color-coral)", color: "white" }}
        className="text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {status === "loading" ? "..." : "Subscribe"}
      </Button>
      {status === "error" && <p className="text-xs text-red-500 mt-1">{message}</p>}
    </form>
  );
}

function DoNotSellButton() {
  const [isUS, setIsUS] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    setIsUS(isUSPrivacyJurisdiction());
  }, []);

  if (!isUS) return null;

  const handle = () => {
    setDoNotSell(true);
    setOptOutAnalytics(true);
    setClicked(true);
  };

  return clicked ? (
    <span className="text-xs text-gray-400">Preference saved.</span>
  ) : (
    <button
      onClick={handle}
      className="text-xs text-gray-500 underline hover:text-gray-700"
    >
      Do Not Sell My Personal Information
    </button>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-200" style={{ backgroundColor: "var(--color-navy)", color: "white" }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand + newsletter */}
          <div>
            <p className="font-bold text-lg tracking-tight">
              <span className="text-white">PetPal</span>
              <span style={{ color: "var(--color-teal)" }}>HQ</span>
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
              Pet gear, through expert consensus.
            </p>
            <p className="text-xs mt-4 font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
              New guides in your inbox
            </p>
            <NewsletterForm />
          </div>

          {/* Site links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
              Site
            </p>
            <ul className="space-y-2">
              {siteLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
              Legal
            </p>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            &copy; {new Date().getFullYear()} PetPalHQ. As an Amazon Associate, we earn from qualifying purchases.
          </p>
          <DoNotSellButton />
        </div>
      </div>
    </footer>
  );
}
