// PetPalHQ - Exotic pet gear reviews via expert consensus
// Display brand: PetPalHQ. Domain: petpalhq.com.
// Vertical focus: aquarium, reptile, birds — expanding to small mammals + amphibians.
export const siteConfig = {
  name: "PetPalHQ",
  tagline: "Pet gear, through expert consensus",
  description: "Independent gear reviews for aquarium, reptile, and bird keepers. We synthesize expert consensus from veterinarians, aquarists, herpetologists, and ornithologists — then pick the gear that's actually worth your money.",
  url: "https://petpalhq.com",

  // Branding — drawn from the PetPalHQ logo. Five-color system, one color per role:
  //   navy (anchor / dog / "PetPal") + teal (aquatic & avian / cat / "HQ")
  //   + green (reptile / gecko) + coral (paw / heart / CTAs) + cream (background).
  colors: {
    primary: "#1e3a6e",      // Navy — anchor color, "PetPal" wordmark, dog silhouette
    primaryDark: "#13284e",  // Deep Navy — hover/pressed state for primary
    secondary: "#2db8c5",    // Teal — "HQ" wordmark, cat/parrot/fish silhouettes, aquatic+avian content
    secondaryDark: "#1e8a96",// Deep Teal — hover/pressed for teal CTAs
    tertiary: "#4caf50",     // Leaf Green — gecko, reptile vertical accent, planted-tank highlights
    tertiaryDark: "#357a38", // Deep Green — hover/pressed for green CTAs
    accent: "#f29c3a",       // Warm Coral — paw print, heart, primary CTAs, score-bar highs
    accentDark: "#d97f1d",   // Deep Coral — hover/pressed for coral CTAs
    background: "#fdfaf3",   // Cream — warm off-white body background
    backgroundDeep: "#f7eedd",// Deep Cream — section backgrounds, separators
    text: "#1a2440",         // Deep Navy-Black — body text, harmonizes with primary navy
    textMuted: "#4a5570",    // Slate — secondary text, captions
  },

  // SEO
  keywords: [
    "aquarium gear", "fish tank setup", "aquarium filter", "water test kit",
    "reptile habitat", "reptile UVB lighting", "bearded dragon enclosure", "leopard gecko setup",
    "smart bird feeder", "backyard birdwatching", "bird feeder camera",
    "exotic pet supplies", "pet gear reviews", "expert pet reviews"
  ],

  // Social
  twitter: "@petpalhq",

  // Affiliate
  amazonTag: "petpalhq-20",

  // Analytics
  gaId: "",

  // Newsletter
  brevoListId: "",
};

export const categories = [
  {
    id: "aquarium",
    name: "Aquarium",
    slug: "aquarium",
    description: "Freshwater aquarium gear — filtration, water quality, cycling, and care",
    icon: "🐟",
    count: 0
  },
  {
    id: "reptile",
    name: "Reptile",
    slug: "reptile",
    description: "Reptile habitat setup, lighting, heating, and environmental control",
    icon: "🦎",
    count: 0
  },
  {
    id: "birds",
    name: "Birds",
    slug: "birds",
    description: "Smart bird feeders, backyard birdwatching gear, and bird-friendly accessories",
    icon: "🐦",
    count: 0
  },
];

export type Category = typeof categories[number];

export const contentPillars = [
  {
    id: "water-quality",
    name: "Water Quality & Cycling",
    slug: "water-quality",
    description: "Aquarium water testing, conditioners, bacteria starters, and the nitrogen cycle",
    icon: "💧",
  },
  {
    id: "aquarium-filtration",
    name: "Aquarium Filtration",
    slug: "aquarium-filtration",
    description: "Filters, filter media, and ongoing maintenance for clear, healthy tanks",
    icon: "⚙️",
  },
  {
    id: "aquarium-care",
    name: "Aquarium Care & Cleaning",
    slug: "aquarium-care",
    description: "Cleaning tools, water changers, algae management, and tank upkeep",
    icon: "🧽",
  },
  {
    id: "reptile-habitat",
    name: "Reptile Habitat",
    slug: "reptile-habitat",
    description: "Enclosures, substrate, hides, humidity, and habitat design by species",
    icon: "🏜️",
  },
  {
    id: "reptile-lighting",
    name: "Reptile Lighting & Heat",
    slug: "reptile-lighting",
    description: "UVB bulbs, basking lamps, heat mats, thermostats, and lighting safety",
    icon: "☀️",
  },
  {
    id: "bird-feeders",
    name: "Bird Feeders & Backyard",
    slug: "bird-feeders",
    description: "Smart and standard feeders, bird baths, and backyard birdwatching gear",
    icon: "🪶",
  },
  {
    id: "expert-care",
    name: "Expert Care Guides",
    slug: "expert-care",
    description: "Cross-vertical care guides — feeding, health, enrichment, and species-specific advice",
    icon: "📖",
  },
] as const;

export type ContentPillar = typeof contentPillars[number];

export const categoryAliases = {
  // Aquarium synonyms
  "aquarium": "water-quality",
  "fish tank": "water-quality",
  "freshwater": "water-quality",
  "fish keeping": "water-quality",
  "tropical fish": "water-quality",
  "water quality": "water-quality",
  "cycling": "water-quality",
  "water test": "water-quality",
  "water conditioner": "water-quality",

  "filter": "aquarium-filtration",
  "aquarium filter": "aquarium-filtration",
  "canister filter": "aquarium-filtration",
  "hob filter": "aquarium-filtration",
  "sponge filter": "aquarium-filtration",
  "filter media": "aquarium-filtration",

  "cleaning": "aquarium-care",
  "tank cleaning": "aquarium-care",
  "gravel vacuum": "aquarium-care",
  "water changer": "aquarium-care",
  "algae": "aquarium-care",

  // Reptile synonyms
  "reptile": "reptile-habitat",
  "lizard": "reptile-habitat",
  "snake": "reptile-habitat",
  "gecko": "reptile-habitat",
  "leopard gecko": "reptile-habitat",
  "bearded dragon": "reptile-habitat",
  "ball python": "reptile-habitat",
  "tortoise": "reptile-habitat",
  "terrarium": "reptile-habitat",
  "vivarium": "reptile-habitat",
  "enclosure": "reptile-habitat",

  "uvb": "reptile-lighting",
  "uvb lighting": "reptile-lighting",
  "basking lamp": "reptile-lighting",
  "heat lamp": "reptile-lighting",
  "heat mat": "reptile-lighting",
  "thermostat": "reptile-lighting",
  "reptile lighting": "reptile-lighting",

  // Birds synonyms
  "bird": "bird-feeders",
  "birds": "bird-feeders",
  "bird feeder": "bird-feeders",
  "smart bird feeder": "bird-feeders",
  "birdwatching": "bird-feeders",
  "birding": "bird-feeders",
  "backyard birds": "bird-feeders",
  "bird bath": "bird-feeders",
} as const;
