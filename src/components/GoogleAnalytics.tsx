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
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    // Vanilla GA4 config. We do NOT pass allow_google_signals or
    // allow_ad_personalization_signals here — both are deprecated and
    // setting either to false silently flips gtag.js into consent-aware
    // mode, which then refuses to fire /collect or set _ga cookies until
    // an explicit gtag('consent', ...) declaration goes through. Since
    // PetPalHQ does not run Google Ads, the values that those flags would
    // gate (cross-device user stitching, demographics) are not reachable
    // anyway. anonymize_ip keeps the privacy posture.
    gtag('config', measurementId, {
      anonymize_ip: true,
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