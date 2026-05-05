// Re-export from data directory for consistency
export * from '@/data/products';
import { products, Product } from '@/data/products';
import { categories } from '@/config/site';

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter(p => p.category === categorySlug);
}

export function getFeaturedProducts(limit: number = 6): Product[] {
  // If no featured products, return highest-rated
  const featured = products.filter(p => p.featured);
  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }
  // Fall back to top-rated
  return [...products]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getAllCategories() {
  return categories;
}

export function getCategoryBySlug(slug: string) {
  return categories.find(c => c.slug === slug);
}

export function getRelatedProducts(product: Product, limit: number = 4): Product[] {
  return products
    .filter(p => p.category === product.category && p.slug !== product.slug)
    .slice(0, limit);
}

// Map for display
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
