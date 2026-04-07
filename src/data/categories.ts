export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  count: number;
}

export const categories: Category[] = [
  {
    id: "dogs",
    name: "Dogs",
    slug: "dogs",
    description: "Harnesses, leashes, toys, beds, training tools, and nutrition for your canine companion",
    icon: "🐕",
    count: 18,
  },
  {
    id: "cats",
    name: "Cats",
    slug: "cats",
    description: "Feeders, litter boxes, scratching posts, toys, and health products for your feline friend",
    icon: "🐈",
    count: 14,
  },
  {
    id: "small-pets",
    name: "Small Pets",
    slug: "small-pets",
    description: "Cages, bedding, food, and enrichment for rabbits, guinea pigs, hamsters, and more",
    icon: "🐇",
    count: 8,
  },
  {
    id: "birds",
    name: "Birds",
    slug: "birds",
    description: "Cages, perches, feeders, toys, and nutrition for parrots, finches, canaries, and more",
    icon: "🦜",
    count: 6,
  },
  {
    id: "fish",
    name: "Fish",
    slug: "fish",
    description: "Tanks, filters, lighting, food, and accessories for freshwater and saltwater fish",
    icon: "🐠",
    count: 7,
  },
  {
    id: "outdoor-travel",
    name: "Outdoor & Travel",
    slug: "outdoor-travel",
    description: "Carriers, car seats, travel bowls, camping gear, and adventure accessories for pets on the go",
    icon: "🎒",
    count: 10,
  },
];
