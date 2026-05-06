'use client';

import { useEffect } from 'react';

// Google Analytics types
type GtagCommand = 'config' | 'event' | 'js' | 'set';
type GtagConfigParams = {
  page_path?: string;
  anonymize_ip?: boolean;
  allow_google_signals?: boolean;
  allow_ad_personalization_signals?: boolean;
};

declare global {
  interface Window {
    gtag: (command: GtagCommand, targetId: string | Date, params?: GtagConfigParams | Record<string, unknown>) => void;
    dataLayer: Array<unknown>;
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

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(command: GtagCommand, targetId: string | Date, params?: GtagConfigParams | Record<string, unknown>) {
      window.dataLayer.push([command, targetId, params]);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

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

// Helper function to track events
export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Helper function to track page views
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