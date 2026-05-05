"use client";

import { useState, useEffect, useCallback } from "react";

interface ExitIntentPopupProps {
  siteName: string;
  headline: string;
  description: string;
  buttonText?: string;
  accentColor?: string;
}

export function ExitIntentPopup({
  siteName,
  headline,
  description,
  buttonText = "Subscribe",
  accentColor = "#4f46e5",
}: ExitIntentPopupProps) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const storageKey = `${siteName.replace(/\s+/g, "_").toLowerCase()}_exit_popup`;
  const subscribedKey = `${siteName.replace(/\s+/g, "_").toLowerCase()}_subscribed`;

  const dismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) || localStorage.getItem(subscribedKey)) return;
    } catch { return; }

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShow(true);
    };

    // Desktop: mouse leaves viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    // Mobile: scroll up quickly (likely leaving)
    let lastScrollY = window.scrollY;
    let scrollUpDistance = 0;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < lastScrollY) {
        scrollUpDistance += lastScrollY - currentY;
        if (scrollUpDistance > 300 && currentY > 200) trigger();
      } else {
        scrollUpDistance = 0;
      }
      lastScrollY = currentY;
    };

    // Delay listeners so popup doesn't fire immediately
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [storageKey, subscribedKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      });
      if (res.ok) {
        setStatus("success");
        try {
          localStorage.setItem(subscribedKey, "1");
          localStorage.setItem(storageKey, "1");
        } catch {}
      } else {
        const data = await res.json().catch(() => null);
        if (data?.message?.toLowerCase().includes("already")) {
          setStatus("success");
          try { localStorage.setItem(subscribedKey, "1"); localStorage.setItem(storageKey, "1"); } catch {}
        } else {
          setErrorMsg(data?.message || "Something went wrong.");
          setStatus("error");
        }
      }
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setStatus("error");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={dismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h3>
            <p className="text-gray-600">Check your inbox for a welcome email.</p>
            <button
              onClick={dismiss}
              className="mt-4 px-6 py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              Got it!
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">{headline}</h2>
            <p className="text-gray-600 mb-6">{description}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-400"
                style={{ focusRingColor: accentColor } as React.CSSProperties}
              />
              {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 rounded-lg text-white font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {status === "loading" ? "Subscribing..." : buttonText}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-4 text-center">🔒 No spam, ever. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </div>
  );
}
