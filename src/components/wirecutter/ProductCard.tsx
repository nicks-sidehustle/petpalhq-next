import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  title: string;
  subtitle?: string;
  price: string;
  image: string;
  rating?: number;
  pros: string[];
  badge?: string;
  link: string;
  amazonLink: string;
  tested?: boolean;
}

export function ProductCard({
  title,
  subtitle,
  price,
  image,
  rating,
  pros,
  badge,
  link,
  amazonLink,
  tested = true,
}: ProductCardProps) {
  return (
    <div className="product-card bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {badge && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-red-600 text-white px-3 py-1 text-xs font-bold">
            {badge}
          </Badge>
        </div>
      )}
      
      <Link href={link} className="block">
        <div className="relative h-64 bg-gray-50">
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain p-4"
          />
        </div>
      </Link>

      <div className="p-6">
        {subtitle && (
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
            {subtitle}
          </p>
        )}
        
        <Link href={link}>
          <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-[var(--brand-green)] transition-colors">
            {title}
          </h3>
        </Link>

        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-gray-900">{price}</span>
          {rating && (
            <div className="flex items-center">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < rating ? 'fill-current' : 'fill-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              {tested && (
                <span className="ml-2 text-xs text-gray-500">TESTED</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {pros.map((pro, index) => (
            <div key={index} className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-700">{pro}</span>
            </div>
          ))}
        </div>

        <a
          href={amazonLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-md text-center transition-colors"
        >
          View on Amazon
        </a>
      </div>
    </div>
  );
}