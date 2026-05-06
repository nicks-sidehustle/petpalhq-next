'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (!measurementId) return;

    // Default-on. Skip only if the visitor explicitly opted out via the
    // Privacy Choices link in the footer.
    const optedOut = localStorage.getItem('analytics-consent') === 'false';
    if (optedOut) return;

    // Init dataLayer + gtag stub BEFORE injecting the script so any pushes
    // queued here are processed once gtag.js loads.
    window.dataLayer = window.dataLayer || [];
    // Standard Google snippet uses `arguments` so the entry length matches
    // the actual call's arity. Pushing a fixed 3-tuple makes 'js' calls
    // look like 3-arg calls with a trailing undefined, which gtag.js
    // misinterprets — preventing _ga cookies + /collect from ever firing.
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // If the visitor opts out from the footer button (same-tab path also
    // dispatches this event), reload so the GA script + cookies stop firing.
    const handleStorageChange = () => {
      if (localStorage.getItem('analytics-consent') === 'false') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [measurementId]);

  return null;
}

export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

export const trackPageView = (
  url: string,
  measurementId: string = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
) => {
  if (!measurementId) return;
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', measurementId, {
      page_path: url,
    });
  }
};