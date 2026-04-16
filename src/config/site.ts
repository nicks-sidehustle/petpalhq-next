export const siteConfig = {
  name: "Loyal & Found",
  tagline: "Pet gear, thoughtfully tested",
  description: "We read dozens of expert reviews so you don't have to — then pick three products at three price points. No paid sponsorships. No fluff.",
  url: "https://petpalhq.com",

  // Branding — "Loyal & Found" warm palette
  colors: {
    primary: "#2A2520",   // Espresso
    accent: "#B5472E",    // Tomato
    background: "#FDF9F2", // Cream
    text: "#3C3530",      // Walnut
    sage: "#7A8970",
    leaf: "#5B7C4A",
    honey: "#D4A155",
  },

  // SEO
  keywords: ["pet gear reviews", "best dog harness", "cat water fountain", "pet product reviews", "expert pet reviews", "dog gear", "cat accessories", "pet buying guides"],

  // Social
  twitter: "@petpalhq",

  // Affiliate
  amazonTag: "petpalhq-20",

  // Analytics
  gaId: "",

  // Newsletter
  brevoListId: "",
};

export type SiteConfig = typeof siteConfig;
