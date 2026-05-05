'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isUSPrivacyJurisdiction, setDoNotSell, setOptOutAnalytics } from '@/lib/consent';

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isUSUser, setIsUSUser] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    const isUS = isUSPrivacyJurisdiction();
    setIsUSUser(isUS);
    
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('analytics-consent', 'true');
    setShowBanner(false);
    // Trigger storage event for GA component
    window.dispatchEvent(new Event('storage'));
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie-consent', 'essential-only');
    localStorage.setItem('analytics-consent', 'false');
    setShowBanner(false);
  };

  const doNotSellMyInfo = () => {
    setDoNotSell(true);
    setOptOutAnalytics(true);
    localStorage.setItem('cookie-consent', 'essential-only');
    localStorage.setItem('analytics-consent', 'false');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto p-6 border-gray-200 bg-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {isUSUser ? 'Your Privacy Rights' : 'We respect your privacy'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isUSUser ? (
                <>
                  We collect and process personal information for analytics and affiliate marketing. 
                  Under state privacy laws, you have the right to opt out of the sale of your personal information. 
                  We use cookies for site functionality, analytics, and personalized content.{' '}
                </>
              ) : (
                <>
                  We use cookies and similar technologies to enhance your browsing experience, 
                  analyze site traffic, and provide personalized content. This includes cookies 
                  for analytics and affiliate marketing partnerships.{' '}
                </>
              )}
              <a 
                href="/privacy-policy" 
                className="text-[var(--brand-green)] hover:text-[var(--brand-green-deep)] underline"
              >
                Learn more in our Privacy Policy
              </a>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:ml-6">
            {isUSUser && (
              <Button
                variant="outline"
                onClick={doNotSellMyInfo}
                className="text-sm px-3 py-2 border-red-300 text-red-700 hover:bg-red-50"
              >
                Do Not Sell My Info
              </Button>
            )}
            <Button
              variant="outline"
              onClick={acceptEssential}
              className="text-sm px-4 py-2"
            >
              Essential Only
            </Button>
            <Button
              onClick={acceptAll}
              className="text-sm px-4 py-2 bg-[var(--brand-green)] hover:bg-[var(--brand-green-deep)]"
            >
              Accept All
            </Button>
          </div>
        </div>
        
        {/* Legal compliance footer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Affiliate Disclosure:</strong> As an Amazon Associate, we earn from qualifying purchases. 
            This helps support our site at no additional cost to you.
          </p>
        </div>
      </Card>
    </div>
  );
}