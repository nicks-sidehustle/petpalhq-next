"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewsletterInline() {
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
        body: JSON.stringify({ email, source: "homepage-inline" }),
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

  return (
    <section
      className="rounded-lg px-6 py-8 text-center"
      style={{ backgroundColor: "var(--color-cream-deep)" }}
    >
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-navy)" }}>
        New gear guides, straight to your inbox
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        No spam. One email when a new guide drops.
      </p>

      {status === "success" ? (
        <p className="text-sm font-medium" style={{ color: "var(--color-teal)" }}>{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white text-gray-900"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            style={{ backgroundColor: "var(--color-coral)", color: "white" }}
            className="hover:opacity-90 transition-opacity font-medium"
          >
            {status === "loading" ? "..." : "Subscribe"}
          </Button>
        </form>
      )}

      {status === "error" && (
        <p className="text-xs mt-2" style={{ color: "#dc2626" }}>{message}</p>
      )}
    </section>
  );
}
