"use client";

import { useState } from "react";
import { toast } from "sonner";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          source: "footer",
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success("🎄 You're in! Check your inbox for holiday deals.");
        setEmail("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Something went wrong. Try again?");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-green-50 border border-red-200 rounded-xl p-8 mb-8">
        <div className="text-center">
          <span className="text-3xl mb-2 block">🎁</span>
          <h3 className="text-lg font-semibold text-red-900">You&apos;re on the nice list!</h3>
          <p className="text-green-700 text-sm mt-1">Check your inbox for a welcome email with exclusive holiday deals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-50 via-white to-green-50 border-2 border-red-300 rounded-xl p-8 mb-8 relative overflow-hidden">
      {/* Decorative snowflakes */}
      <div className="absolute top-2 left-4 text-2xl opacity-20">❄️</div>
      <div className="absolute top-4 right-8 text-xl opacity-20">❄️</div>
      <div className="absolute bottom-3 left-12 text-lg opacity-20">❄️</div>
      
      <div className="max-w-xl mx-auto text-center relative z-10">
        <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          🎄 HOLIDAY GIVEAWAY
        </span>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Subscribe & Enter Our Holiday Giveaway!
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Get the best Christmas decoration deals, expert tips, and be automatically entered to win holiday prizes! 🎁
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          {/* Honeypot for spam */}
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            {isLoading ? "Subscribing..." : "🎅 Enter Giveaway →"}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-3">
          🔒 No spam, ever. Unsubscribe anytime. Winners announced monthly!
        </p>
      </div>
    </div>
  );
}
