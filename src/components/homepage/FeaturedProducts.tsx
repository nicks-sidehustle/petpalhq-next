"use client";

import Link from "next/link";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { Product } from "@/data/products";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (!products.length) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const shortTitle = product.title.length > 60 
    ? product.title.substring(0, 60) + '...' 
    : product.title;

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-[var(--brand-green)]/15 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--brand-gold)]/70 hover:shadow-xl">
      {/* Image */}
      <div className="relative flex h-44 items-center justify-center bg-[var(--brand-cream)]">
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-green-deep)] shadow-sm">
          Catalog pick
        </div>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.title}
            className="max-h-full max-w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`text-gray-400 text-sm ${product.image ? 'hidden' : ''}`}>
          No Image
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category Badge */}
        <span className="rounded-full bg-[var(--brand-cream-dark)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-green)]">
          {product.category.replace(/-/g, ' ')}
        </span>

        {/* Title */}
        <h3 className="mt-3 min-h-10 text-sm font-bold leading-5 text-gray-900">
          {shortTitle}
        </h3>

        {/* Rating & Price */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-900">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
          <span className="font-bold text-[var(--brand-green)]">${product.price.toFixed(2)}</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-green)]" />
          Verified {product.lastVerified} · {product.availabilityStatus}
        </p>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Link
            href={`/reviews/${product.category}/${product.slug}`}
            className="rounded-full bg-[var(--brand-cream)] px-3 py-2 text-center text-sm font-bold text-[var(--brand-green)] transition-colors hover:bg-[var(--brand-cream-dark)]"
          >
            View Details
          </Link>
          <AffiliateLink
            href={product.amazonLink}
            productSlug={product.slug}
            productName={product.title}
            retailer={product.retailer}
            placement="featured_product_card"
            className="flex items-center justify-center gap-1 rounded-full bg-[var(--brand-green-deep)] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-green)]"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Price</span>
          </AffiliateLink>
        </div>
      </div>
    </article>
  );
}
