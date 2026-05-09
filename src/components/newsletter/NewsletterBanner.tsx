"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "petpal_banner_dismissed";
const DISMISSED_AT_KEY = "petpal_banner_dismissed_at";
const SUBSCRIBED_KEY = "petpal_newsletter_subscribed";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private browsing or storage full — ignore
  }
}

export default function NewsletterBanner() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    // Already subscribed — never show
    if (safeLocalGet(SUBSCRIBED_KEY) === "true") return;

    // Dismissed recently?
    const dismissedAt = safeLocalGet(DISMISSED_AT_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_TTL_MS) return;
    }

    // Legacy dismissed flag (no timestamp)
    if (safeLocalGet(DISMISSED_KEY) === "true" && !dismissedAt) return;

    setVisible(true);
  }, []);

  const dismiss = () => {
    safeLocalSet(DISMISSED_AT_KEY, String(Date.now()));
    safeLocalSet(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "banner" }),
      });
      if (res.ok) {
        setStatus("success");
        safeLocalSet(SUBSCRIBED_KEY, "true");
        setTimeout(() => setVisible(false), 2500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Newsletter signup banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "40px",
        backgroundColor: "var(--color-navy)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "0 12px",
      }}
    >
      {status === "success" ? (
        <span style={{ fontSize: "13px", fontWeight: 500 }}>
          You&rsquo;re in — see you Saturday!
        </span>
      ) : (
        <>
          <span style={{ fontSize: "13px", whiteSpace: "nowrap", display: "none" }} className="sm:inline">
            Vet-cited pet gear research, every Saturday.
          </span>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address for newsletter"
              style={{
                height: "28px",
                padding: "0 10px",
                borderRadius: "14px",
                border: "none",
                fontSize: "13px",
                outline: "none",
                minWidth: "170px",
                color: "var(--color-text)",
                backgroundColor: "white",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                height: "28px",
                padding: "0 14px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: "var(--color-coral)",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: status === "loading" ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {status === "loading" ? "..." : "Get the guide"}
            </button>
          </form>
          {status === "error" && (
            <span style={{ fontSize: "12px", color: "#fca5a5" }}>Try again</span>
          )}
        </>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss newsletter banner"
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: 1,
          padding: "4px",
        }}
      >
        &times;
      </button>
    </div>
  );
}
