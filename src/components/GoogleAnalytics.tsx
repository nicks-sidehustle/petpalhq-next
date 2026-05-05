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
    // Check if user has given consent
    const hasConsent = localStorage.getItem('analytics-consent') === 'true';
    
    if (!hasConsent) {
      return; // Don't load GA if no consent
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(command: GtagCommand, targetId: string | Date, params?: GtagConfigParams | Record<string, unknown>) {
      window.dataLayer.push([command, targetId, params]);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      // Respect user privacy
      anonymize_ip: true,
      allow_google_signals: hasConsent,
      allow_ad_personalization_signals: hasConsent,
    });

    // Listen for consent changes
    const handleConsentChange = () => {
      const newConsent = localStorage.getItem('analytics-consent') === 'true';
      if (newConsent && !window.gtag) {
        // Reload page to properly initialize GA
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleConsentChange);
    
    return () => {
      window.removeEventListener('storage', handleConsentChange);
    };
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
export const trackPageView = (url: string, measurementId: string = 'G-81XLB5FSQ9') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', measurementId, {
      page_path: url,
    });
  }
};