const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const productsDir = '/Users/nosh1/code/deskgearhq/markdown2html/deskgearhq-project/products';
const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.md'));

const products = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(productsDir, file), 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) continue;
  
  try {
    const frontmatter = yaml.parse(match[1]);
    const slug = file.replace('.md', '');
    
    // Normalize category to slug format
    const categorySlug = (frontmatter.category || 'uncategorized')
      .toLowerCase()
      .replace(/\s+/g, '-');
    
    products.push({
      slug,
      title: frontmatter.title || '',
      category: categorySlug,
      price: frontmatter.price || 0,
      rating: frontmatter.rating || 0,
      reviewCount: frontmatter.review_count || 0,
      image: frontmatter.image_url || '',
      amazonLink: frontmatter.affiliate_link || '',
      asin: frontmatter.asin || '',
      overview: frontmatter.overview || '',
      verdict: frontmatter.verdict || '',
      pros: Array.isArray(frontmatter.pros) ? frontmatter.pros : [],
      cons: Array.isArray(frontmatter.cons) ? frontmatter.cons : [],
      specs: frontmatter.specs || {},
      featured: frontmatter.featured || false,
    });
  } catch (e) {
    console.error('Error parsing', file, e.message);
  }
}

// Generate TypeScript file
const output = `// Auto-generated from Eleventy migration
export interface Product {
  slug: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  amazonLink: string;
  asin: string;
  overview: string;
  verdict: string;
  pros: string[];
  cons: string[];
  specs: Record<string, string>;
  featured: boolean;
}

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}

export function getFeaturedProducts(limit?: number): Product[] {
  const featured = products.filter(p => p.featured);
  return limit ? featured.slice(0, limit) : featured;
}

export function getAllProducts(): Product[] {
  return products;
}
`;

fs.writeFileSync('./src/data/products.ts', output);
console.log('Migrated ' + products.length + ' products');
