/**
 * Consent management utilities for USA compliance (CCPA, state privacy laws)
 */

export type ConsentLevel = 'none' | 'essential-only' | 'accepted';
export type PrivacyRights = {
  doNotSell: boolean;
  optOutAnalytics: boolean;
  deletePersonalInfo: boolean;
};

export const getConsentLevel = (): ConsentLevel => {
  if (typeof window === 'undefined') return 'none';
  
  const consent = localStorage.getItem('cookie-consent');
  if (consent === 'accepted') return 'accepted';
  if (consent === 'essential-only') return 'essential-only';
  return 'none';
};

export const setConsentLevel = (level: ConsentLevel) => {
  if (typeof window === 'undefined') return;
  
  if (level === 'none') {
    localStorage.removeItem('cookie-consent');
  } else {
    localStorage.setItem('cookie-consent', level);
  }
};

export const hasAnalyticsConsent = (): boolean => {
  return getConsentLevel() === 'accepted';
};

export const hasMarketingConsent = (): boolean => {
  return getConsentLevel() === 'accepted';
};

export const hasConsentDecision = (): boolean => {
  return getConsentLevel() !== 'none';
};

// USA-specific privacy rights management
export const getPrivacyRights = (): PrivacyRights => {
  if (typeof window === 'undefined') return { doNotSell: false, optOutAnalytics: false, deletePersonalInfo: false };
  
  return {
    doNotSell: localStorage.getItem('do-not-sell') === 'true',
    optOutAnalytics: localStorage.getItem('opt-out-analytics') === 'true',
    deletePersonalInfo: false // This requires server-side handling
  };
};

export const setDoNotSell = (doNotSell: boolean) => {
  if (typeof window === 'undefined') return;
  
  if (doNotSell) {
    localStorage.setItem('do-not-sell', 'true');
    // Also opt out of analytics if they don't want data sold
    localStorage.setItem('analytics-consent', 'false');
  } else {
    localStorage.removeItem('do-not-sell');
  }
};

export const setOptOutAnalytics = (optOut: boolean) => {
  if (typeof window === 'undefined') return;
  
  if (optOut) {
    localStorage.setItem('opt-out-analytics', 'true');
    localStorage.setItem('analytics-consent', 'false');
  } else {
    localStorage.removeItem('opt-out-analytics');
  }
};

// Check if user is in a US state with privacy laws
export const isUSPrivacyJurisdiction = (): boolean => {
  // This is a simplified check - in production, you'd use IP geolocation
  // For now, we'll apply CCPA-style privacy to all US users
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const usTimezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Detroit', 'America/Anchorage', 'Pacific/Honolulu'
  ];
  return usTimezones.some(tz => timezone.includes(tz.split('/')[1]));
};

export const shouldShowUSPrivacyNotice = (): boolean => {
  return isUSPrivacyJurisdiction() && !hasConsentDecision();
};