"use client";

import { useState } from "react";
import { toast } from "sonner";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "footer",
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success("You're in. Expert pet-gear picks coming your way.");
        setEmail("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Something went wrong. Try again?");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div
        className="rounded-xl p-8 mb-8"
        style={{ background: "#f7eedd", border: "1px solid rgba(30, 58, 110, 0.15)" }}
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold" style={{ color: "#1e3a6e" }}>
            You&apos;re subscribed.
          </h3>
          <p className="text-sm mt-1" style={{ color: "#4a5570" }}>
            Check your inbox for a welcome email. New guides drop in your inbox as we ship them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-8 mb-8 relative overflow-hidden"
      style={{ background: "#fdfaf3", border: "1px solid rgba(30, 58, 110, 0.15)" }}
    >
      <div className="max-w-xl mx-auto text-center relative z-10">
        <span
          className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
          style={{ background: "rgba(45, 184, 197, 0.15)", color: "#1e3a6e" }}
        >
          PetPalHQ Newsletter
        </span>
        <h3 className="text-xl font-bold mb-2" style={{ color: "#1a2440" }}>
          Expert-Consensus Pet Gear Picks
        </h3>
        <p className="text-sm mb-4" style={{ color: "#4a5570" }}>
          Source-backed aquarium, reptile, and bird-gear picks delivered when new guides drop. No spam, no fluff.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          {/* Honeypot for spam */}
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 px-4 py-2.5 border rounded-lg text-sm placeholder-gray-500"
            style={{ borderColor: "rgba(30, 58, 110, 0.2)", color: "#1a2440" }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="text-white font-semibold py-2.5 px-5 rounded-lg transition-opacity text-sm whitespace-nowrap disabled:opacity-50"
            style={{ background: "#1e3a6e" }}
          >
            {isLoading ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        <p className="text-xs mt-3" style={{ color: "#4a5570" }}>
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
