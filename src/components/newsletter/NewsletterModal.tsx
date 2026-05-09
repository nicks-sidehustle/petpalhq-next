"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SUBSCRIBED_KEY = "petpal_newsletter_subscribed";
const DISMISSED_AT_KEY = "petpal_modal_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TRIGGER_DELAY_MS = 45_000; // 45 seconds

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

export default function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dismiss = useCallback(() => {
    safeLocalSet(DISMISSED_AT_KEY, String(Date.now()));
    setOpen(false);
  }, []);

  useEffect(() => {
    // Already subscribed — never show
    if (safeLocalGet(SUBSCRIBED_KEY) === "true") return;

    // Dismissed recently?
    const dismissedAt = safeLocalGet(DISMISSED_AT_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_TTL_MS) return;
    }

    const timer = setTimeout(() => setOpen(true), TRIGGER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Focus trap + ESC close
  useEffect(() => {
    if (!open) return;

    // Move focus into modal
    setTimeout(() => inputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = [firstFocusRef.current, inputRef.current, lastFocusRef.current].filter(
        Boolean
      ) as HTMLElement[];
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, dismiss]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "modal" }),
      });
      if (res.ok) {
        setStatus("success");
        safeLocalSet(SUBSCRIBED_KEY, "true");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          zIndex: 998,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 999,
          backgroundColor: "var(--color-cream)",
          borderRadius: "12px",
          padding: "32px 28px",
          width: "min(480px, calc(100vw - 32px))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Close button — first focusable element */}
        <button
          ref={firstFocusRef}
          onClick={dismiss}
          aria-label="Close newsletter modal"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            lineHeight: 1,
            padding: "4px",
          }}
        >
          &times;
        </button>

        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-coral)",
            marginBottom: "8px",
          }}
        >
          Free resource
        </p>

        <h2
          id="newsletter-modal-title"
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "var(--color-navy)",
            marginBottom: "10px",
            lineHeight: 1.25,
          }}
        >
          Free: The 5-vet-source pet gear checklist
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-muted)",
            marginBottom: "20px",
            lineHeight: 1.55,
          }}
        >
          Every pick synthesized from Merck Vet Manual, AAHA, AVMA, and two peer-reviewed journals.
          No filler. One email, every Saturday.
        </p>

        {status === "success" ? (
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-teal)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Checklist is on its way — check your inbox!
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              ref={inputRef}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
              style={{
                height: "44px",
                padding: "0 14px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                outline: "none",
                color: "var(--color-text)",
                backgroundColor: "white",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <button
              ref={lastFocusRef}
              type="submit"
              disabled={status === "loading"}
              style={{
                height: "44px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--color-coral)",
                color: "white",
                fontSize: "15px",
                fontWeight: 700,
                cursor: status === "loading" ? "wait" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {status === "loading" ? "Sending..." : "Send the checklist"}
            </button>
            {status === "error" && (
              <p style={{ fontSize: "12px", color: "#dc2626", margin: 0 }}>
                Something went wrong — please try again.
              </p>
            )}
          </form>
        )}

        <p
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            marginTop: "14px",
            textAlign: "center",
          }}
        >
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </>
  );
}
