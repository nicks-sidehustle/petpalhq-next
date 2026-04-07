'use client';

import Image from "next/image";
import Link from "next/link";
import { Check, X, ShoppingCart, ExternalLink } from "lucide-react";

interface ProductCardProps {
  productName: string;
  description: string;
  image: string;
  ourTake: string;
  pros: string[];
  cons: string[];
  amazonAsin: string;
  affiliateTag?: string;
  price?: string;
  originalPrice?: string;
  category?: string;
  featured?: boolean;
  className?: string;
}

export function ProductCard({
  productName,
  description,
  image,
  ourTake,
  pros,
  cons,
  amazonAsin,
  affiliateTag = "petpalhq-20",
  price,
  originalPrice,
  category,
  featured = false,
  className,
}: ProductCardProps) {
  const amazonUrl = `https://www.amazon.com/dp/${amazonAsin}?tag=${affiliateTag}&linkCode=as2`;

  if (featured) {
    return (
      <div className={`border border-amber-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white ${className || ''}`}>
        <div className="grid lg:grid-cols-2 gap-0">
          <div className="p-6 lg:p-8 flex flex-col justify-between">
            <div>
              {category && (
                <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-3">
                  {category}
                </span>
              )}
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">{productName}</h2>
              <p className="text-gray-600 mb-4">{description}</p>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-5 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">Our Take</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{ourTake}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-5">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1 text-sm">
                    <Check className="w-4 h-4" /> Pros
                  </h4>
                  <ul className="space-y-1">
                    {pros.map((pro, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2 text-gray-700">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1 text-sm">
                    <X className="w-4 h-4" /> Cons
                  </h4>
                  <ul className="space-y-1">
                    {cons.map((con, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2 text-gray-700">
                        <X className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div>
              {price && (
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-amber-600">{price}</span>
                  {originalPrice && (
                    <span className="text-base text-gray-400 line-through">{originalPrice}</span>
                  )}
                </div>
              )}
              <Link
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy on Amazon
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-64 lg:min-h-0">
            <Image
              src={image}
              alt={productName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 bg-white flex flex-col ${className || ''}`}>
      <Link
        href={amazonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative h-48 block shrink-0"
      >
        <Image
          src={image}
          alt={productName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {category && (
          <span className="absolute top-3 left-3 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{productName}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{description}</p>
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-3 rounded-r">
          <p className="text-xs font-semibold text-gray-800 mb-0.5">Our Take</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{ourTake}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs flex-1">
          <div>
            <p className="font-semibold text-green-700 mb-1">Pros</p>
            <ul className="space-y-0.5">
              {pros.slice(0, 3).map((pro, idx) => (
                <li key={idx} className="flex items-start gap-1 text-gray-600">
                  <Check className="w-2.5 h-2.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{pro}</span>
                </li>
              ))}
              {pros.length > 3 && <li className="text-gray-400">+{pros.length - 3} more</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-red-700 mb-1">Cons</p>
            <ul className="space-y-0.5">
              {cons.slice(0, 3).map((con, idx) => (
                <li key={idx} className="flex items-start gap-1 text-gray-600">
                  <X className="w-2.5 h-2.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{con}</span>
                </li>
              ))}
              {cons.length > 3 && <li className="text-gray-400">+{cons.length - 3} more</li>}
            </ul>
          </div>
        </div>
        <div>
          {price && (
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-bold text-amber-600">{price}</span>
              {originalPrice && (
                <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
              )}
            </div>
          )}
          <Link
            href={amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy on Amazon
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
