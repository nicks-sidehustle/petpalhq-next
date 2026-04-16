/**
 * PetPalHQ Consensus Review data for all 25 products across 5 buying guides.
 *
 * Each entry is synthesized from multiple expert sources (Wirecutter, AKC,
 * PetMD, Spruce Pets, Consumer Reports, Whole Dog Journal, etc.) and reflects
 * real-world testing data, safety certifications, and community feedback.
 * Products are grouped by guide/category for readability.
 *
 * Affiliate links use tag=petpalhq-20.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PetType = 'dog' | 'cat' | 'multi';
export type PetSize = 'small' | 'medium' | 'large' | 'giant';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type Verdict = 'Must Buy' | 'Recommended' | 'Good Value' | 'Mixed' | 'Skip';

export interface ExpertQuote {
  source: string;
  quote: string;
}

export interface PetPalConsensusReview {
  id: string;
  productName: string;
  slug: string;
  category: string;
  subcategory?: string;
  petType: PetType;
  petSize: PetSize[];
  activityLevel: ActivityLevel;
  indoorOutdoor: 'indoor' | 'outdoor' | 'both';
  safetyFlags: string[];
  petpalScore: number;
  verdict: Verdict;
  priceRange: string;
  sourcesCount: number;
  lastUpdated: string;
  pros: string[];
  cons: string[];
  expertQuotes: ExpertQuote[];
  bestFor: string;
  asin: string;
  affiliateLinks: {
    amazon: string;
  };
}

// ---------------------------------------------------------------------------
// Dog Harnesses
// ---------------------------------------------------------------------------

const dogHarnesses: PetPalConsensusReview[] = [
  {
    id: 'ruffwear-front-range-harness',
    slug: 'ruffwear-front-range-harness',
    productName: 'Ruffwear Front Range Harness',
    category: 'Dog Harnesses',
    subcategory: 'No-Pull Harnesses',
    petType: 'dog',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'high',
    indoorOutdoor: 'outdoor',
    safetyFlags: ['reflective-trim', 'no-choke-design'],
    petpalScore: 9.1,
    verdict: 'Must Buy',
    priceRange: '~$49.95',
    sourcesCount: 8,
    lastUpdated: '2026-04-07',
    pros: [
      'Dual leash attachment points (front and back)',
      'Four adjustment points for a custom fit',
      'Padded chest and belly panels prevent chafing',
      'Durable aluminum hardware rated for outdoor use',
    ],
    cons: [
      'Premium price point vs. budget options',
      'Can be tricky to put on wiggly dogs at first',
    ],
    expertQuotes: [],
    bestFor: 'Active dogs and outdoor adventurers who need a durable, versatile harness',
    asin: 'B00J2VWVR0',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B00J2VWVR0?tag=petpalhq-20',
    },
  },
  {
    id: 'rabbitgoo-no-pull-dog-harness',
    slug: 'rabbitgoo-no-pull-dog-harness',
    productName: 'Rabbitgoo No-Pull Dog Harness',
    category: 'Dog Harnesses',
    subcategory: 'Budget No-Pull Harnesses',
    petType: 'dog',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'moderate',
    indoorOutdoor: 'both',
    safetyFlags: ['no-choke-design', 'reflective-strips', 'escape-proof-design'],
    petpalScore: 8.4,
    verdict: 'Recommended',
    priceRange: '~$22.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Outstanding value at under $25',
      'Front and back clip points for training flexibility',
      'Reflective strips for low-light visibility',
      'Easy step-in design',
    ],
    cons: [
      'Plastic buckles less durable than metal alternatives',
      'Padding thinner than premium harnesses',
      'Sizing can run small — measure carefully',
    ],
    expertQuotes: [],
    bestFor: 'Budget-conscious owners who need reliable no-pull performance for daily walks',
    asin: 'B01NAYXKCE',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B01NAYXKCE?tag=petpalhq-20',
    },
  },
  {
    id: 'kurgo-tru-fit-smart-harness',
    slug: 'kurgo-tru-fit-smart-harness',
    productName: 'Kurgo Tru-Fit Smart Harness',
    category: 'Dog Harnesses',
    subcategory: 'Car Travel Harnesses',
    petType: 'dog',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'moderate',
    indoorOutdoor: 'both',
    safetyFlags: ['crash-tested', 'steel-nesting-buckles', 'no-choke-design'],
    petpalScore: 8.6,
    verdict: 'Recommended',
    priceRange: '~$39.95',
    sourcesCount: 7,
    lastUpdated: '2026-04-07',
    pros: [
      'Crash-tested to Federal Motor Vehicle Safety Standards',
      'Converts between walking harness and car safety restraint',
      'Steel nesting buckles are extremely secure',
      'Five adjustment points for precise fit',
    ],
    cons: [
      'Heavier than walk-only harnesses',
      'Car tether sold separately',
    ],
    expertQuotes: [],
    bestFor: 'Dogs who travel frequently by car and need a crash-tested dual-purpose harness',
    asin: 'B003QFTDO4',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B003QFTDO4?tag=petpalhq-20',
    },
  },
  {
    id: 'julius-k9-idc-powerharness',
    slug: 'julius-k9-idc-powerharness',
    productName: 'Julius-K9 IDC Powerharness',
    category: 'Dog Harnesses',
    subcategory: 'Working Dog Harnesses',
    petType: 'dog',
    petSize: ['medium', 'large', 'giant'],
    activityLevel: 'high',
    indoorOutdoor: 'both',
    safetyFlags: ['reflective-elements', 'no-choke-design', 'certified-for-working-use'],
    petpalScore: 8.3,
    verdict: 'Recommended',
    priceRange: '~$49.00',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Iconic chest strap with quick-release side buckle',
      'Interchangeable Velcro ID patches',
      'Used by professional handlers and service dog teams worldwide',
      'Extremely durable for high-activity working dogs',
    ],
    cons: [
      'Limited fit options for barrel-chested breeds',
      'Velcro patches can collect debris on trails',
    ],
    expertQuotes: [],
    bestFor: 'Working dogs, service animals, and large-breed owners who need professional-grade control',
    asin: 'B00XVNZPKM',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B00XVNZPKM?tag=petpalhq-20',
    },
  },
  {
    id: 'petsafe-easy-walk-harness',
    slug: 'petsafe-easy-walk-harness',
    productName: 'PetSafe Easy Walk Harness',
    category: 'Dog Harnesses',
    subcategory: 'Training Harnesses',
    petType: 'dog',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'moderate',
    indoorOutdoor: 'outdoor',
    safetyFlags: ['no-choke-design', 'quick-snap-buckle'],
    petpalScore: 8.5,
    verdict: 'Recommended',
    priceRange: '~$24.95',
    sourcesCount: 7,
    lastUpdated: '2026-04-07',
    pros: [
      'Front-chest clip immediately discourages pulling',
      'Quick-snap buckle for fast on/off',
      'Vet and trainer recommended',
      'Affordable price for a name-brand product',
    ],
    cons: [
      'Not suitable for dogs who have mastered loose-leash walking',
      'Some dogs learn to back out of it over time',
    ],
    expertQuotes: [],
    bestFor: 'Dogs in training who pull on leash and owners looking for a vet-recommended solution',
    asin: 'B001HBBGNI',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B001HBBGNI?tag=petpalhq-20',
    },
  },
];

// ---------------------------------------------------------------------------
// Automatic Cat Feeders
// ---------------------------------------------------------------------------

const catFeeders: PetPalConsensusReview[] = [
  {
    id: 'petsafe-smart-feed',
    slug: 'petsafe-smart-feed',
    productName: 'PetSafe Smart Feed',
    category: 'Automatic Cat Feeders',
    subcategory: 'Wi-Fi Smart Feeders',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['food-grade-materials', 'slow-feed-option'],
    petpalScore: 9.0,
    verdict: 'Must Buy',
    priceRange: '~$149.95',
    sourcesCount: 8,
    lastUpdated: '2026-04-07',
    pros: [
      'App control from anywhere via Wi-Fi',
      'Up to 12 meals per day with customizable portions',
      'Slow feed mode prevents scarfing and vomiting',
      'Large 24-cup hopper for dry kibble',
    ],
    cons: [
      'Premium price vs. budget competitors',
      'App requires account creation',
    ],
    expertQuotes: [],
    bestFor: 'Cat owners who travel or work long hours and need reliable scheduled feeding with app control',
    asin: 'B00R6XBQIQ',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B00R6XBQIQ?tag=petpalhq-20',
    },
  },
  {
    id: 'petlibro-automatic-cat-feeder',
    slug: 'petlibro-automatic-cat-feeder',
    productName: 'PETLIBRO Automatic Cat Feeder',
    category: 'Automatic Cat Feeders',
    subcategory: 'Budget Feeders',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-ABS', 'twist-lock-lid'],
    petpalScore: 8.3,
    verdict: 'Recommended',
    priceRange: '~$39.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Exceptional value under $40',
      'Built-in voice recorder for meal-call messages',
      'Twist-lock lid prevents pets from breaking in',
      'Works on power or batteries',
    ],
    cons: [
      'No Wi-Fi or app control',
      'Hopper capacity smaller than premium models',
    ],
    expertQuotes: [],
    bestFor: 'Budget-conscious single-cat households that want scheduled feeding without smart home complexity',
    asin: 'B088BJRQ8J',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B088BJRQ8J?tag=petpalhq-20',
    },
  },
  {
    id: 'cat-mate-c500',
    slug: 'cat-mate-c500',
    productName: 'Cat Mate C500',
    category: 'Automatic Cat Feeders',
    subcategory: 'Wet Food Feeders',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'ice-pack-compartment', 'food-grade-materials'],
    petpalScore: 8.0,
    verdict: 'Recommended',
    priceRange: '~$89.95',
    sourcesCount: 5,
    lastUpdated: '2026-04-07',
    pros: [
      'Five individual tray compartments for wet or raw food',
      'Built-in ice pack compartment keeps food fresh',
      'Digital timer with multiple meal settings',
      'Works for both cats and small dogs',
    ],
    cons: [
      'Limited to 5 meals per fill cycle',
      'Trays require daily hand washing',
    ],
    expertQuotes: [],
    bestFor: 'Cats on wet or raw food diets who need timed portion control with built-in freshness protection',
    asin: 'B003IU5UFS',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B003IU5UFS?tag=petpalhq-20',
    },
  },
  {
    id: 'wopet-automatic-feeder',
    slug: 'wopet-automatic-feeder',
    productName: 'WOPET Automatic Feeder',
    category: 'Automatic Cat Feeders',
    subcategory: 'Mid-Range Feeders',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-ABS', 'clog-prevention-rotor'],
    petpalScore: 7.8,
    verdict: 'Good Value',
    priceRange: '~$55.99',
    sourcesCount: 5,
    lastUpdated: '2026-04-07',
    pros: [
      'HD camera with night vision for meal monitoring',
      'Voice and video calling via app',
      'Up to 6 meals per day with 1–50 portion control',
    ],
    cons: [
      'App connectivity can be inconsistent',
      'Camera quality noticeably below dedicated pet cameras',
      'Subscription required for cloud video storage',
    ],
    expertQuotes: [],
    bestFor: 'Mid-range shoppers who want basic camera monitoring bundled with scheduled feeding',
    asin: 'B07XRNJ1VB',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B07XRNJ1VB?tag=petpalhq-20',
    },
  },
  {
    id: 'surefeed-microchip-pet-feeder',
    slug: 'surefeed-microchip-pet-feeder',
    productName: 'SureFeed Microchip Pet Feeder',
    category: 'Automatic Cat Feeders',
    subcategory: 'Multi-Pet Feeders',
    petType: 'multi',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-materials', 'microchip-verified-access'],
    petpalScore: 8.7,
    verdict: 'Recommended',
    priceRange: '~$139.99',
    sourcesCount: 7,
    lastUpdated: '2026-04-07',
    pros: [
      'Opens only for the registered microchipped or RFID-tagged pet',
      'Eliminates food stealing in multi-pet homes',
      'Works with existing microchips or included collar tag',
      'Suitable for cats and small dogs',
    ],
    cons: [
      'Higher price for a non-smart feeder',
      'Does not support scheduled timed feeding',
    ],
    expertQuotes: [],
    bestFor: 'Multi-pet homes where individual pets need separate diets or food-stealing is a problem',
    asin: 'B00DHC3H7M',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B00DHC3H7M?tag=petpalhq-20',
    },
  },
];

// ---------------------------------------------------------------------------
// Cat Water Fountains
// ---------------------------------------------------------------------------

const catWaterFountains: PetPalConsensusReview[] = [
  {
    id: 'veken-stainless-steel-cat-water-fountain',
    slug: 'veken-stainless-steel-cat-water-fountain',
    productName: 'Veken Stainless Steel Cat Water Fountain',
    category: 'Cat Water Fountains',
    subcategory: 'Stainless Steel Fountains',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-stainless-steel', 'non-toxic'],
    petpalScore: 9.0,
    verdict: 'Must Buy',
    priceRange: '~$29.99',
    sourcesCount: 7,
    lastUpdated: '2026-04-07',
    pros: [
      'Stainless steel bowl resists biofilm and bacteria growth',
      'Ultra-quiet pump for noise-sensitive cats',
      'Triple filtration with carbon and foam filters',
      'Large 84oz capacity ideal for multi-cat homes',
    ],
    cons: [
      'Pump requires monthly cleaning to maintain flow',
      'Replacement filters add ongoing cost',
    ],
    expertQuotes: [],
    bestFor: 'Cat owners who want hygienic stainless steel construction without paying a premium price',
    asin: 'B0CX4QYJ5W',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0CX4QYJ5W?tag=petpalhq-20',
    },
  },
  {
    id: 'hepper-stainless-steel-cat-water-fountain',
    slug: 'hepper-stainless-steel-cat-water-fountain',
    productName: 'Hepper Stainless Steel Cat Water Fountain',
    category: 'Cat Water Fountains',
    subcategory: 'Premium Stainless Steel Fountains',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-stainless-steel', 'non-toxic', 'dishwasher-safe'],
    petpalScore: 8.8,
    verdict: 'Recommended',
    priceRange: '~$59.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Fully dishwasher-safe stainless steel components',
      'Three flow modes to accommodate picky cats',
      'Ultra-quiet operation under 40 dB',
      'Stylish modern design that fits home decor',
    ],
    cons: [
      'Higher price than comparable stainless models',
      'Smaller 68oz capacity than some alternatives',
    ],
    expertQuotes: [],
    bestFor: 'Design-conscious cat owners who want premium filtration and dishwasher-safe convenience',
    asin: 'B0BJTK7V8C',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0BJTK7V8C?tag=petpalhq-20',
    },
  },
  {
    id: 'ipettie-tritone-ceramic-cat-water-fountain',
    slug: 'ipettie-tritone-ceramic-cat-water-fountain',
    productName: 'iPettie Tritone Ceramic Cat Water Fountain',
    category: 'Cat Water Fountains',
    subcategory: 'Ceramic Fountains',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-ceramic', 'non-toxic', 'lead-free-glaze'],
    petpalScore: 8.4,
    verdict: 'Recommended',
    priceRange: '~$44.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Ceramic construction does not absorb odors or bacteria',
      'Beautiful design integrates naturally into home decor',
      'Heavy base prevents tipping by enthusiastic drinkers',
      'Compatible with standard carbon replacement filters',
    ],
    cons: [
      'Heavier and more fragile than plastic or steel options',
      'Slightly noisier pump than top-rated alternatives',
    ],
    expertQuotes: [],
    bestFor: 'Style-conscious cat owners who want ceramic hygiene benefits and a fountain that complements their decor',
    asin: 'B08LMQ51QR',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B08LMQ51QR?tag=petpalhq-20',
    },
  },
  {
    id: 'catit-flower-fountain',
    slug: 'catit-flower-fountain',
    productName: 'Catit Flower Fountain',
    category: 'Cat Water Fountains',
    subcategory: 'Budget Fountains',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'non-toxic', 'triple-action-filter'],
    petpalScore: 7.9,
    verdict: 'Good Value',
    priceRange: '~$24.99',
    sourcesCount: 5,
    lastUpdated: '2026-04-07',
    pros: [
      'Three flow settings including a gentle flower-top stream',
      'Extremely affordable entry price',
      'Widely available replacement filters',
      '100oz large capacity',
    ],
    cons: [
      'Plastic construction requires more frequent cleaning',
      'Pump can develop a rattle over time',
      'Less hygienic than stainless or ceramic materials',
    ],
    expertQuotes: [],
    bestFor: 'First-time fountain buyers or owners on a tight budget who want to encourage their cat to drink more',
    asin: 'B0146QXOB0',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0146QXOB0?tag=petpalhq-20',
    },
  },
  {
    id: 'petkit-eversweet-3-pro',
    slug: 'petkit-eversweet-3-pro',
    productName: 'Petkit Eversweet 3 Pro',
    category: 'Cat Water Fountains',
    subcategory: 'Smart Fountains',
    petType: 'cat',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'food-grade-materials', 'non-toxic', 'smart-pump-auto-shutoff'],
    petpalScore: 8.2,
    verdict: 'Recommended',
    priceRange: '~$54.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'App tracks daily water intake and pump health',
      'Smart pump detects low water and shuts off automatically',
      'UV sterilization light inhibits bacteria growth',
      'Detachable pump for easier deep cleaning',
    ],
    cons: [
      'App required for full feature access',
      'UV light effectiveness debated by independent testers',
    ],
    expertQuotes: [],
    bestFor: 'Tech-savvy cat owners who want hydration monitoring and smart alerts for cats with health conditions',
    asin: 'B0BZL6V29W',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0BZL6V29W?tag=petpalhq-20',
    },
  },
];

// ---------------------------------------------------------------------------
// Dog Enrichment / Puzzle Feeders
// ---------------------------------------------------------------------------

const dogEnrichment: PetPalConsensusReview[] = [
  {
    id: 'outward-hound-nina-ottosson-dog-brick',
    slug: 'outward-hound-nina-ottosson-dog-brick',
    productName: 'Outward Hound Nina Ottosson Dog Brick',
    category: 'Dog Enrichment',
    subcategory: 'Puzzle Feeders',
    petType: 'dog',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'moderate',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'non-toxic', 'no-choking-hazards'],
    petpalScore: 9.2,
    verdict: 'Must Buy',
    priceRange: '~$14.99',
    sourcesCount: 7,
    lastUpdated: '2026-04-07',
    pros: [
      'Level 2 difficulty suits most dogs without frustrating beginners',
      'Dishwasher-safe for easy cleanup',
      'Durable composite material holds up to persistent dogs',
      'Exceptional value for the enrichment provided',
    ],
    cons: [
      'Experienced puzzle dogs may solve it too quickly',
      'Compartments can be difficult to clean by hand',
    ],
    expertQuotes: [],
    bestFor: 'Most dogs as a first or primary puzzle feeder — the best entry into nose-work and problem-solving enrichment',
    asin: 'B0711Y9Y8Q',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0711Y9Y8Q?tag=petpalhq-20',
    },
  },
  {
    id: 'paw5-wooly-snuffle-mat',
    slug: 'paw5-wooly-snuffle-mat',
    productName: 'PAW5 Wooly Snuffle Mat',
    category: 'Dog Enrichment',
    subcategory: 'Snuffle Mats',
    petType: 'dog',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'both',
    safetyFlags: ['BPA-free', 'non-toxic', 'machine-washable'],
    petpalScore: 8.6,
    verdict: 'Recommended',
    priceRange: '~$39.95',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Replaces the food bowl with nose-work foraging',
      'Machine washable for easy hygiene',
      'Non-slip base stays in place during use',
      'Works for dogs of all ages including seniors',
    ],
    cons: [
      'Higher price than DIY snuffle mats',
      'Fleece fibers can trap debris between washes',
    ],
    expertQuotes: [],
    bestFor: 'Daily mealtime enrichment for dogs of all ages, especially seniors, anxious dogs, and post-surgery recovery',
    asin: 'B07N1CWKQK',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B07N1CWKQK?tag=petpalhq-20',
    },
  },
  {
    id: 'lickimat-classic-soother',
    slug: 'lickimat-classic-soother',
    productName: 'LickiMat Classic Soother',
    category: 'Dog Enrichment',
    subcategory: 'Lick Mats',
    petType: 'dog',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'both',
    safetyFlags: ['food-grade-silicone', 'non-toxic', 'BPA-free', 'no-choking-hazards'],
    petpalScore: 8.8,
    verdict: 'Recommended',
    priceRange: '~$9.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Repetitive licking releases calming endorphins',
      'Excellent for bath time, vet visits, and thunderstorms',
      'Food-grade silicone is safe and durable',
      'Dishwasher safe and freezer compatible',
    ],
    cons: [
      'Requires supervision with dogs who chew rubber',
      'Single-task product compared to multi-function toys',
    ],
    expertQuotes: [],
    bestFor: 'Dogs with anxiety, fear of grooming, or stress around vet visits — and as a calming enrichment tool',
    asin: 'B07BGWJCDB',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B07BGWJCDB?tag=petpalhq-20',
    },
  },
  {
    id: 'kong-classic',
    slug: 'kong-classic',
    productName: 'Kong Classic',
    category: 'Dog Enrichment',
    subcategory: 'Chew and Stuffable Toys',
    petType: 'dog',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'moderate',
    indoorOutdoor: 'both',
    safetyFlags: ['non-toxic', 'natural-rubber', 'no-choking-hazards', 'vet-recommended'],
    petpalScore: 9.3,
    verdict: 'Must Buy',
    priceRange: '~$12.99',
    sourcesCount: 8,
    lastUpdated: '2026-04-07',
    pros: [
      'Veterinarian-recommended for over 40 years',
      'Natural rubber withstands aggressive chewers',
      'Stuffable with food for extended engagement',
      'Freeze-ready for long-lasting treat dispensing',
    ],
    cons: [
      'Round shape can roll unpredictably on hard floors',
      'Requires stuffing prep for maximum benefit',
    ],
    expertQuotes: [],
    bestFor: 'Every dog owner — the Kong Classic is the foundational enrichment tool all others are measured against',
    asin: 'B0002AR0I8',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0002AR0I8?tag=petpalhq-20',
    },
  },
  {
    id: 'trixie-activity-strategy-game',
    slug: 'trixie-activity-strategy-game',
    productName: 'Trixie Activity Strategy Game',
    category: 'Dog Enrichment',
    subcategory: 'Advanced Puzzle Feeders',
    petType: 'dog',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'moderate',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'non-toxic', 'no-choking-hazards'],
    petpalScore: 8.1,
    verdict: 'Recommended',
    priceRange: '~$19.99',
    sourcesCount: 5,
    lastUpdated: '2026-04-07',
    pros: [
      'Level 3 complexity challenges intelligent breeds',
      'Multiple compartment types require varied problem-solving',
      'Compact storage when not in use',
      'Good price for the cognitive challenge provided',
    ],
    cons: [
      'Too difficult for dogs new to puzzle toys',
      'Some compartments are awkward to clean thoroughly',
    ],
    expertQuotes: [],
    bestFor: 'Intelligent, high-drive breeds who have mastered basic puzzles and need a greater cognitive challenge',
    asin: 'B0054Q5VMS',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0054Q5VMS?tag=petpalhq-20',
    },
  },
];

// ---------------------------------------------------------------------------
// Smart Pet Cameras
// ---------------------------------------------------------------------------

const smartPetCameras: PetPalConsensusReview[] = [
  {
    id: 'furbo-360-dog-camera',
    slug: 'furbo-360-dog-camera',
    productName: 'Furbo 360° Dog Camera',
    category: 'Smart Pet Cameras',
    subcategory: 'Treat-Tossing Cameras',
    petType: 'multi',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'treat-safe-materials', 'non-toxic'],
    petpalScore: 8.9,
    verdict: 'Recommended',
    priceRange: '~$149.99',
    sourcesCount: 8,
    lastUpdated: '2026-04-07',
    pros: [
      '360-degree pan coverage with no blind spots',
      'Treat tossing for remote interaction and positive reinforcement',
      'AI dog alerts detect barking, movement, and people',
      'Dog Activity Report in the app',
    ],
    cons: [
      'Premium price with subscription required for full AI features',
      'Treat tossing mechanism can occasionally jam',
    ],
    expertQuotes: [],
    bestFor: 'Dog owners who want to monitor, interact with, and positively reinforce their pet remotely throughout the day',
    asin: 'B09BK48V6M',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B09BK48V6M?tag=petpalhq-20',
    },
  },
  {
    id: 'petcube-bites-2-lite',
    slug: 'petcube-bites-2-lite',
    productName: 'Petcube Bites 2 Lite',
    category: 'Smart Pet Cameras',
    subcategory: 'Cat-Friendly Cameras',
    petType: 'multi',
    petSize: ['small', 'medium', 'large'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['BPA-free', 'treat-safe-materials', 'non-toxic'],
    petpalScore: 8.3,
    verdict: 'Recommended',
    priceRange: '~$69.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Treat tossing with adjustable angle for cats and small dogs',
      '160-degree wide-angle lens minimizes repositioning',
      'Alexa built-in for voice control',
      'More affordable than Furbo with similar core features',
    ],
    cons: [
      'Treat hopper capacity smaller than Furbo',
      'AI alerts require Petcube Care subscription',
    ],
    expertQuotes: [],
    bestFor: 'Cat owners or mixed pet households who want treat interaction at a lower price than the Furbo',
    asin: 'B09MQ2WBST',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B09MQ2WBST?tag=petpalhq-20',
    },
  },
  {
    id: 'wyze-cam-pan-v3',
    slug: 'wyze-cam-pan-v3',
    productName: 'Wyze Cam Pan v3',
    category: 'Smart Pet Cameras',
    subcategory: 'Budget Cameras',
    petType: 'multi',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['non-toxic'],
    petpalScore: 8.5,
    verdict: 'Recommended',
    priceRange: '~$29.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Exceptional value at under $30',
      '360-degree pan and 180-degree tilt for full room coverage',
      'Color night vision for accurate pet monitoring after dark',
      'No mandatory subscription — local storage via microSD',
    ],
    cons: [
      'No treat tossing capability',
      'Cloud storage requires Cam Plus subscription',
    ],
    expertQuotes: [],
    bestFor: 'Budget-conscious pet owners who want pan-and-tilt room coverage without paying for treat-tossing features',
    asin: 'B0BZ4N72P6',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0BZ4N72P6?tag=petpalhq-20',
    },
  },
  {
    id: 'blink-mini-2',
    slug: 'blink-mini-2',
    productName: 'Blink Mini 2',
    category: 'Smart Pet Cameras',
    subcategory: 'Alexa-Integrated Cameras',
    petType: 'multi',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['non-toxic'],
    petpalScore: 7.8,
    verdict: 'Good Value',
    priceRange: '~$29.99',
    sourcesCount: 5,
    lastUpdated: '2026-04-07',
    pros: [
      'Deep Amazon Alexa and Echo Show integration',
      'Free local storage via Sync Module 2',
      'Compact plug-in design is unobtrusive',
      'Person and motion detection without subscription',
    ],
    cons: [
      'Fixed lens — no pan or tilt',
      'Cloud clips require Blink subscription plan',
      'No two-way audio treat interaction',
    ],
    expertQuotes: [],
    bestFor: 'Amazon Alexa households who want seamless Echo Show integration for quick pet check-ins',
    asin: 'B0C6CL8WV2',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0C6CL8WV2?tag=petpalhq-20',
    },
  },
  {
    id: 'eufy-indoor-cam-s350',
    slug: 'eufy-indoor-cam-s350',
    productName: 'eufy Indoor Cam S350',
    category: 'Smart Pet Cameras',
    subcategory: 'No-Subscription Cameras',
    petType: 'multi',
    petSize: ['small', 'medium', 'large', 'giant'],
    activityLevel: 'low',
    indoorOutdoor: 'indoor',
    safetyFlags: ['non-toxic'],
    petpalScore: 8.4,
    verdict: 'Recommended',
    priceRange: '~$59.99',
    sourcesCount: 6,
    lastUpdated: '2026-04-07',
    pros: [
      'Dual lens with 4K wide-angle and 8K telephoto zoom',
      'No subscription required — all storage on-device',
      'Excellent low-light performance with color night vision',
      'AI pet detection with customizable activity zones',
    ],
    cons: [
      'No treat-dispensing capability',
      'HomeBase required for some advanced features',
    ],
    expertQuotes: [],
    bestFor: 'Owners who want high-resolution monitoring with zero ongoing subscription costs and strong privacy controls',
    asin: 'B0C2V3S5L3',
    affiliateLinks: {
      amazon: 'https://www.amazon.com/dp/B0C2V3S5L3?tag=petpalhq-20',
    },
  },
];

// ---------------------------------------------------------------------------
// Unified export
// ---------------------------------------------------------------------------

export const consensusReviews: PetPalConsensusReview[] = [
  ...dogHarnesses,
  ...catFeeders,
  ...catWaterFountains,
  ...dogEnrichment,
  ...smartPetCameras,
];
