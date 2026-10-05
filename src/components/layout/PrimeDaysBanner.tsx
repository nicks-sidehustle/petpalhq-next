"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Prime Big Deal Days 2026 (owner 2026-10-05). Dates per Amazon's announcement:
// October 6–7, starting 12:01 a.m. PDT, Prime members only
// (https://www.aboutamazon.com/news/retail/amazon-prime-big-deals-day-2026-when-october-6-7).
// Rendered client-side only so the static pages need no rebuild to hide it:
// it shows until the end of Oct 7 Pacific time, then renders nothing.
// It links to our guides, never to an Amazon landing page (CLAUDE.md §3).
const START = Date.parse("2026-10-06T07:01:00Z"); // 12:01 a.m. PDT, Oct 6
const END = Date.parse("2026-10-08T07:00:00Z"); // midnight PDT after Oct 7
const DISMISS_KEY = "pp-prime-days-2026-dismissed";

type Phase = "hidden" | "soon" | "live";

function phaseAt(now: number): Phase {
  if (now >= END) return "hidden";
  return now >= START ? "live" : "soon";
}

export default function PrimeDaysBanner() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const dismissedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;
    const update = () => {
      if (!dismissedRef.current) setPhase(phaseAt(Date.now()));
    };
    update();
    timerRef.current = window.setInterval(update, 60_000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  if (phase === "hidden") return null;

  const dismiss = () => {
    dismissedRef.current = true;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage blocked: hide for this page view only
    }
    setPhase("hidden");
  };

  return (
    <div
      role="region"
      aria-label="Prime Big Deal Days"
      style={{ background: "var(--color-coral)", color: "var(--color-navy-deep)" }}
      className="border-b-2"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span
          className="font-extrabold uppercase tracking-wide text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--color-navy-deep)", color: "#ffffff" }}
        >
          {phase === "live" ? "On now" : "Starts Oct 6"}
        </span>
        <p className="font-semibold m-0 min-w-0 flex-1">
          {phase === "live"
            ? "Amazon Prime Big Deal Days runs through Oct 7 for Prime members."
            : "Amazon Prime Big Deal Days is Oct 6–7, for Prime members."}{" "}
          <span className="font-normal">
            Card prices show the date we checked them, so confirm the current price on Amazon.
          </span>
        </p>
        <Link
          href="/guides"
          className="font-bold underline underline-offset-2 whitespace-nowrap hover:opacity-80"
        >
          Browse our pet gear guides →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Prime Big Deal Days banner"
          className="p-1 rounded hover:bg-black/10"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
