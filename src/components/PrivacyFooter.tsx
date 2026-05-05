'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FooterNewsletter } from './FooterNewsletter';
import { isUSPrivacyJurisdiction, setDoNotSell, setOptOutAnalytics } from '@/lib/consent';

export function PrivacyFooter() {
  const [isUSUser, setIsUSUser] = useState(false);

  useEffect(() => {
    setIsUSUser(isUSPrivacyJurisdiction());
  }, []);

  const handleDoNotSell = () => {
    setDoNotSell(true);
    setOptOutAnalytics(true);
    localStorage.setItem('cookie-consent', 'essential-only');
    localStorage.setItem('analytics-consent', 'false');
    
    // Show confirmation
    alert('Your preference has been updated. We will not sell your personal information.');
    
    // Trigger storage event for analytics to update
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div>
      <div className="w-full lg:max-w-[66.667%] mx-auto px-4 md:px-6">
        <FooterNewsletter />
      </div>
      <footer className="bg-gray-50 border-t border-gray-200 py-6">
      <div className="w-full lg:max-w-[66.667%] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600">
            <Link href="/privacy-policy" className="hover:text-gray-900 underline">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-gray-900 underline">
              About
            </Link>
            <Link href="/affiliate-disclosure" className="hover:text-gray-900 underline">
              Affiliate Disclosure
            </Link>
            {isUSUser && (
              <button
                onClick={handleDoNotSell}
                className="hover:text-gray-900 underline text-left"
              >
                Do Not Sell My Personal Information
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500 text-center md:text-right">
            <p>© {new Date().getFullYear()} PetPalHQ. All rights reserved.</p>
            <p className="text-xs mt-1">
              Amazon Associate - We earn from qualifying purchases
            </p>
          </div>
        </div>
      </div>
    </footer>
    </div>
  );
}