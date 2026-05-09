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

    // gtag.js v2 enforces Consent Mode v2 globally — it always uses ICS
    // and refuses to fire /collect or set _ga cookies until an explicit
    // gtag('consent', 'default', ...) runs through. Programmatic pushes
    // via a JS rest-args wrapper get rejected by the consent processor;
    // the only shape it reliably accepts is the literal Google snippet
    // using `arguments`. So we inject the setup as an inline script tag
    // — this also matches Google's official install instructions, which
    // run before the async gtag.js fetch resolves.
    const setup = document.createElement('script');
    setup.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
      gtag('js', new Date());
      gtag('config', '${measurementId}', { anonymize_ip: true });
    `;
    document.head.appendChild(setup);

    const lib = document.createElement('script');
    lib.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    lib.async = true;
    document.head.appendChild(lib);

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