'use client';

import Script from 'next/script';
import { useEffect } from 'react';

// Google Analytics types
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: Array<unknown>;
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  useEffect(() => {
    // Check if user has opted out (CCPA "Do Not Sell" or manual opt-out)
    const optedOut = localStorage.getItem('opt-out-analytics') === 'true' ||
                     localStorage.getItem('do-not-sell') === 'true';

    if (optedOut) {
      // GA4 respects this window property — prevents all tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)[`ga-disable-${measurementId}`] = true;
      return;
    }

    // Listen for opt-out changes (e.g., user clicks "Do Not Sell" in footer)
    const handleOptOut = () => {
      const nowOptedOut = localStorage.getItem('opt-out-analytics') === 'true' ||
                          localStorage.getItem('do-not-sell') === 'true';
      if (nowOptedOut) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)[`ga-disable-${measurementId}`] = true;
      }
    };

    window.addEventListener('storage', handleOptOut);
    return () => window.removeEventListener('storage', handleOptOut);
  }, [measurementId]);

  // Check opt-out before rendering scripts
  // (SSR-safe: localStorage not available, so we always render the scripts
  //  and let the useEffect handle opt-out client-side)
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  );
}

// Helper function to track events
export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Helper function to track page views
export const trackPageView = (url: string, measurementId?: string) => {
  const id = measurementId ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return;
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', id, {
      page_path: url,
    });
  }
};
