"use client";

/**
 * RestockNotify — inline "email me when it's back" capture for a suppressed
 * out-of-stock pick.
 *
 * Owner ruling 2026-08-18 (standing): a pick suppressed for OOS gets an inline
 * restock capture rather than a dead-end label. The suppression law is
 * unchanged — we still never sell an unbuyable product, still never label a
 * direct-sale pick as "unavailable on Amazon" — this only converts the honest
 * dead end into a way back to the guide once the offer returns.
 *
 * MOUNT CONTRACT
 * This component RENDERS THE UNAVAILABILITY LABEL ITSELF. It is a drop-in
 * replacement for the `pick.available === false && pick.asin` <p> branch in
 * FeaturedPicksGrid.tsx and PickDeepDive.tsx — swap that paragraph for
 * <RestockNotify asin={pick.asin} productName={pick.name}
 * guideSlug={guideSlug} checkedOn={lastProductCheck} />, do not stack it under
 * the existing label or the headline renders twice.
 *
 * NO-JS BEHAVIOUR
 * The <form> carries a real method/action, so with JavaScript disabled the
 * browser posts it natively and /api/restock-notify answers form-encoded
 * requests with a styled HTML confirmation that links back to this guide.
 * With JS the submit is intercepted and answered inline. Nothing about the
 * capture depends on hydration having finished.
 *
 * The Brevo key never reaches this component — the route holds it server-side.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RestockNotifyProps {
  /** ASIN of the suppressed pick — the watch key. */
  asin: string;
  /** Product name as shown in the pick. */
  productName: string;
  /** Slug of the guide this pick lives on — the page that gets linked back. */
  guideSlug: string;
  /** Optional last-verified date, matching the existing label's suffix. */
  checkedOn?: string;
  /** Extra classes for the wrapper. */
  className?: string;
}

export default function RestockNotify({
  asin,
  productName,
  guideSlug,
  checkedOn,
  className,
}: RestockNotifyProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const fieldId = `restock-email-${asin}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Only take over the submit once we can actually handle it in JS.
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/restock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          asin,
          productName,
          guideSlug,
          // Honeypot mirrors the hidden field; always empty from a real user.
          website: "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the list. We'll email you once.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "That didn't go through. Try again in a moment.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again in a moment.");
    }
  };

  return (
    <div
      className={`rounded p-4${className ? ` ${className}` : ""}`}
      style={{ backgroundColor: "var(--color-cream-deep)" }}
      data-restock-notify={asin}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
        Currently unavailable on Amazon{checkedOn ? ` — checked ${checkedOn}` : ""}
      </p>

      {status === "success" ? (
        <p className="text-sm font-medium" style={{ color: "var(--color-teal)" }}>
          {message}
        </p>
      ) : (
        <>
          <form
            method="post"
            action="/api/restock-notify"
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 mt-2"
          >
            <input type="hidden" name="asin" value={asin} />
            <input type="hidden" name="productName" value={productName} />
            <input type="hidden" name="guideSlug" value={guideSlug} />
            {/* Honeypot: never visible, never focusable, never filled by a human. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            <label htmlFor={fieldId} className="sr-only">
              Your email address for a restock alert on {productName}
            </label>
            <Input
              id={fieldId}
              name="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="bg-white text-gray-900"
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              style={{ backgroundColor: "var(--color-coral)", color: "white" }}
              className="hover:opacity-90 transition-opacity font-medium whitespace-nowrap"
            >
              {status === "loading" ? "…" : "Email me when it's back"}
            </Button>
          </form>
          <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
            We&apos;ll send you one email when it&apos;s back in stock on Amazon. No newsletter, no
            spam.
          </p>
        </>
      )}

      {status === "error" && (
        <p className="text-xs mt-2" style={{ color: "#dc2626" }}>
          {message}
        </p>
      )}
    </div>
  );
}
