"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SUBSCRIBED_KEY = "petpal_newsletter_subscribed";
const SESSION_FIRED_KEY = "petpal_exit_intent_fired";
const MIN_TIME_ON_PAGE_MS = 5_000; // mobile: must be on page 5+ seconds

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

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // private browsing or storage full — ignore
  }
}

export default function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageEntryTime = useRef<number>(Date.now());

  const shouldShow = useCallback((): boolean => {
    if (safeLocalGet(SUBSCRIBED_KEY) === "true") return false;
    if (safeSessionGet(SESSION_FIRED_KEY) === "true") return false;
    return true;
  }, []);

  const fire = useCallback(() => {
    if (!shouldShow()) return;
    safeSessionSet(SESSION_FIRED_KEY, "true");
    setOpen(true);
  }, [shouldShow]);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    pageEntryTime.current = Date.now();

    // Desktop: cursor leaves top of viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) {
        fire();
      }
    };

    // Mobile: page visibility hidden after 5+ seconds (app-switch / tab-switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const elapsed = Date.now() - pageEntryTime.current;
        if (elapsed >= MIN_TIME_ON_PAGE_MS) {
          fire();
        }
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fire]);

  // Focus trap + ESC close
  useEffect(() => {
    if (!open) return;

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
        body: JSON.stringify({ email, source: "exit-intent" }),
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

      {/* Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-intent-title"
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
          aria-label="Close newsletter popup"
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
            color: "var(--color-teal)",
            marginBottom: "8px",
          }}
        >
          Before you go
        </p>

        <h2
          id="exit-intent-title"
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "var(--color-navy)",
            marginBottom: "10px",
            lineHeight: 1.25,
          }}
        >
          Before you go — get the next gift guide first
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-muted)",
            marginBottom: "20px",
            lineHeight: 1.55,
          }}
        >
          Mother&rsquo;s Day, Father&rsquo;s Day, holidays. We send the gift-tier roundup 5 days
          early so you&rsquo;re never scrambling last minute.
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
            You&rsquo;re on the list — next guide arrives 5 days early!
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
                backgroundColor: "var(--color-navy)",
                color: "white",
                fontSize: "15px",
                fontWeight: 700,
                cursor: status === "loading" ? "wait" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {status === "loading" ? "Sending..." : "Get it 5 days early"}
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
