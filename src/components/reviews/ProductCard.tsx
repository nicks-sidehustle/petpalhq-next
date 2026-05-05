"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, TrendingDown, Clock, Eye, Plus, Check } from "lucide-react";

interface ProductCardProps {
  id: string;
  slug: string;
  productName: string;
  category: string;
  consensusScore: number;
  verdict: string;
  priceRange: string;
  currentPrice?: number;
  lowestPrice?: number;
  image: string;
  pros: string[];
  cons: string[];
  sourcesCount: number;
  lastUpdated: string;
  trend?: string;
  stock?: "in-stock" | "low" | "out";
  affiliateLinks?: { amazon?: string; bestBuy?: string; manufacturer?: string; };
  onCompareToggle: (id: string) => void;
  isComparing: boolean;
  onQuickView: (id: string) => void;
}

export function ProductCard({
  id,
  slug,
  productName,
  category,
  consensusScore,
  verdict,
  priceRange,
  currentPrice,
  lowestPrice,
  image,
  pros,
  cons,
  sourcesCount,
  lastUpdated,
  trend,
  stock,
  onCompareToggle,
  isComparing,
  affiliateLinks,
  onQuickView
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  const amazonLink = affiliateLinks?.amazon || `https://www.amazon.com/s?k=${encodeURIComponent(productName)}&tag=petpalhq-20`;
  
  // Calculate if it's a deal
  const isDeal = trend === 'down' || (lowestPrice && currentPrice && currentPrice <= lowestPrice);
  const dealPercentage = lowestPrice && currentPrice 
    ? Math.round((1 - currentPrice / lowestPrice) * 100)
    : 0;

  const getVerdictColor = (verdict: string) => {
    switch(verdict) {
      case "Must Buy": return "bg-green-100 text-green-800 border-green-200";
      case "Recommended": return "bg-[var(--brand-cream)] text-[var(--brand-green-deep)] border-[var(--brand-green)]/30";
      case "Good Value": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quick Compare Checkbox */}
      <button
        onClick={() => onCompareToggle(id)}
        className={`absolute top-2 left-2 z-10 p-2 rounded-lg transition-all ${
          isComparing 
            ? 'bg-[var(--brand-green)] text-white' 
            : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white'
        }`}
        aria-label={isComparing ? "Remove from comparison" : "Add to comparison"}
      >
        {isComparing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {/* Quick View Button */}
      {isHovered && (
        <button
          onClick={() => onQuickView(id)}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-all"
          aria-label="Quick view"
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Image Section */}
      <Link href={`/reviews/${categorySlug}/${slug}`}>
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          <Image
            src={imageError ? '/images/placeholder-product.svg' : image}
            alt={productName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
          
          {/* Deal Badge */}
          {isDeal && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-red-500 text-white px-3 py-1">
                <TrendingDown className="w-3 h-3 mr-1" />
                {dealPercentage > 0 ? `${dealPercentage}% OFF` : 'Price Drop'}
              </Badge>
            </div>
          )}

          {/* Stock Indicator */}
          {stock === 'low' && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-orange-500 text-white">
                <Clock className="w-3 h-3 mr-1" />
                Only 3 left
              </Badge>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <Badge className={getVerdictColor(verdict)}>
            {verdict}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-gray-900">{consensusScore}/10</span>
          </div>
        </div>

        {/* Product Name */}
        <Link href={`/reviews/${categorySlug}/${slug}`}>
          <h3 className="font-bold text-lg text-gray-900 mb-2 hover:text-[var(--brand-green)] transition-colors line-clamp-2">
            {productName}
          </h3>
        </Link>

        {/* Price Section */}
        <div className="mb-3">
          {currentPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">${currentPrice}</span>
              {lowestPrice && currentPrice < lowestPrice && (
                <span className="text-sm text-gray-500 line-through">${lowestPrice}</span>
              )}
            </div>
          ) : (
            <span className="text-lg font-semibold text-gray-900">{priceRange}</span>
          )}
          {isDeal && (
            <p className="text-xs text-red-600 mt-1">
              🔥 Lowest price in 30 days
            </p>
          )}
        </div>

        {/* Quick Pros/Cons on Hover */}
        {isHovered && pros.length > 0 && (
          <div className="mb-3 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
            <p className="text-xs font-medium text-green-700">
              ✓ {pros[0]}
            </p>
            {cons.length > 0 && (
              <p className="text-xs font-medium text-red-700">
                ✗ {cons[0]}
              </p>
            )}
          </div>
        )}

        {/* Single Primary CTA */}
        <a 
          href={amazonLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mb-2"
        >
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold">
            <ShoppingCart className="w-4 h-4 mr-2" />
            See Best Price
            {currentPrice && (
              <span className="ml-auto opacity-90">${currentPrice}</span>
            )}
          </Button>
        </a>

        {/* Secondary Action - Less Prominent */}
        <Link href={`/reviews/${categorySlug}/${slug}`}>
          <Button variant="ghost" size="sm" className="w-full text-gray-600">
            Read full review →
          </Button>
        </Link>

        {/* Meta Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {sourcesCount} expert reviews
          </p>
          <p className="text-xs text-gray-500">
            Updated {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}