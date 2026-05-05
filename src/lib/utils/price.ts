export function extractPricesFromRange(priceRange: string): { 
  currentPrice: number | undefined; 
  lowestPrice: number | undefined;
} {
  // Extract numbers from price range string like "$179-$199" or "$179-199"
  const matches = priceRange.match(/\$?(\d+)(?:\.\d{2})?(?:\s*[-–]\s*\$?(\d+)(?:\.\d{2})?)?/);
  
  if (!matches) {
    return { currentPrice: undefined, lowestPrice: undefined };
  }
  
  const firstPrice = parseInt(matches[1]);
  const secondPrice = matches[2] ? parseInt(matches[2]) : undefined;
  
  // If we have a range, use the lower price as current and higher as original/list price
  if (secondPrice) {
    return { 
      currentPrice: firstPrice, // Lower price is the current/sale price
      lowestPrice: secondPrice  // Higher price is the original price
    };
  }
  
  // Single price
  return { 
    currentPrice: firstPrice,
    lowestPrice: undefined
  };
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(0)}`;
}