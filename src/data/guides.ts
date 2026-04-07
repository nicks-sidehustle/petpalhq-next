export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
}

export const guides: GuideEntry[] = [
  {
    slug: 'best-dog-harnesses-2026',
    title: 'Best Dog Harnesses 2026: Expert Picks for Every Breed',
    description: 'We tested 20+ dog harnesses to find the best no-pull, escape-proof, and adventure harnesses for every size and breed.',
    excerpt: 'Top 5 dog harnesses for 2026 — from no-pull training to hiking adventures. Tested by our senior pet editor.',
    category: 'Dogs',
    publishDate: '2026-04-06',
    updatedDate: '2026-04-06',
    readTime: '11 min read',
    featured: true,
    image: 'https://m.media-amazon.com/images/I/71CRJmnzDkL._AC_SL1500_.jpg',
  },
  {
    slug: 'best-automatic-cat-feeders-2026',
    title: 'Best Automatic Cat Feeders 2026: Smart & Reliable Picks',
    description: 'Keep your cat on schedule with the best automatic feeders — from app-connected smart feeders to reliable mechanical timers.',
    excerpt: 'Top 5 automatic cat feeders for 2026 — programmable, portion-controlled, and pet-safe. Tested and reviewed.',
    category: 'Cats',
    publishDate: '2026-04-06',
    updatedDate: '2026-04-06',
    readTime: '10 min read',
    featured: true,
    image: 'https://m.media-amazon.com/images/I/71bSqFDxGHL._AC_SL1500_.jpg',
  },
];
