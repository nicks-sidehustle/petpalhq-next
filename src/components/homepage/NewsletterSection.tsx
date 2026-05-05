"use client";

import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage("You're in! Holiday tips coming your way.");
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

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="holly-dark rounded-2xl p-10 md:p-16 text-center max-w-3xl mx-auto">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(201,162,39,0.2)" }}
          >
            <Mail className="w-7 h-7" style={{ color: "var(--brand-gold)" }} />
          </div>
          <h2
            className="text-3xl md:text-4xl mb-4 italic"
            style={{ fontFamily: "var(--font-heading)", color: "var(--brand-cream)" }}
          >
            Get Holiday Prep Tips Before Everyone Else
          </h2>
          <p className="mb-8 max-w-md mx-auto text-sm" style={{ color: "rgba(253,248,240,0.6)" }}>
            Join readers who get our best holiday gear picks, decorating ideas, and deal alerts every week.
          </p>

          {status === "success" ? (
            <div className="flex items-center justify-center gap-2 py-4 px-6 rounded-lg" style={{ background: "rgba(253,248,240,0.1)" }}>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span style={{ color: "var(--brand-cream)" }}>{message}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-5 py-3 rounded-full text-sm outline-none focus:ring-2"
                style={{ background: "rgba(253,248,240,0.1)", color: "var(--brand-cream)" }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-8 py-3 rounded-full font-semibold text-sm hover:scale-105 transition-transform disabled:opacity-50"
                style={{ background: "var(--brand-red)", color: "#fff" }}
              >
                {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Subscribe"}
              </button>
            </form>
          )}

          {status === "error" && <p className="text-red-300 text-sm mt-2">{message}</p>}
        </div>
      </div>
    </section>
  );
}
