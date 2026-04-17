'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface SavedProduct {
  productName: string;
  guideSlug: string;
  guideName: string;
  /** Optional product image URL. L&F tier data doesn't carry images today,
   * so this is optional — the drawer falls back to a bookmark icon. */
  image?: string;
  price: string | null;
  amazonUrl: string;
  /** ASIN for GA4 ecommerce correlation when re-clicked from the drawer */
  asin?: string;
  savedAt: number;
}

// Site-isolated storage key. SHE uses "she:saved-products"; we use "lf:" so
// users who visit both sites don't see cross-site bleed.
const STORAGE_KEY = 'lf:saved-products';
const MAX_SAVED = 50;

// --- External store for cross-component reactivity ---
// Using useSyncExternalStore so SaveButton (in a tier card) and the
// drawer badge count in the header stay in sync without prop drilling.

let listeners: Array<() => void> = [];
let cachedProducts: SavedProduct[] | null = null;

function emitChange() {
  cachedProducts = null; // bust cache so getSnapshot re-reads localStorage
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): SavedProduct[] {
  if (cachedProducts !== null) return cachedProducts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedProducts = raw ? JSON.parse(raw) : [];
  } catch {
    cachedProducts = [];
  }
  return cachedProducts!;
}

function getServerSnapshot(): SavedProduct[] {
  // SSR — always return an empty list, the client rehydrates from localStorage
  return [];
}

// Cross-tab sync: if the user saves something in one tab, all other tabs
// reflect it too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) emitChange();
  });
}

function writeSavedProducts(products: SavedProduct[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // localStorage full or unavailable — silent fail, state still updates
    // in-memory via emitChange below
  }
  emitChange();
}

export function useSavedProducts() {
  const products = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveProduct = useCallback(
    (product: Omit<SavedProduct, 'savedAt'>): boolean => {
      const current = getSnapshot();
      // Dedup by productName (case-insensitive) — same product saved from
      // two different guides collapses into one entry.
      const key = product.productName.toLowerCase();
      const existing = current.findIndex(
        (p) => p.productName.toLowerCase() === key
      );

      let updated: SavedProduct[];
      const entry: SavedProduct = { ...product, savedAt: Date.now() };

      if (existing !== -1) {
        updated = [...current];
        updated[existing] = entry;
      } else {
        // Prepend newest, evict oldest past MAX_SAVED
        updated = [entry, ...current];
        if (updated.length > MAX_SAVED) {
          updated = updated.slice(0, MAX_SAVED);
        }
      }

      const isFirstEverSave = current.length === 0;
      writeSavedProducts(updated);
      return isFirstEverSave;
    },
    []
  );

  const removeProduct = useCallback((productName: string) => {
    const current = getSnapshot();
    const key = productName.toLowerCase();
    writeSavedProducts(
      current.filter((p) => p.productName.toLowerCase() !== key)
    );
  }, []);

  const clearAll = useCallback(() => {
    writeSavedProducts([]);
  }, []);

  const isSaved = useCallback(
    (productName: string) => {
      const key = productName.toLowerCase();
      return products.some((p) => p.productName.toLowerCase() === key);
    },
    [products]
  );

  return {
    products,
    count: products.length,
    saveProduct,
    removeProduct,
    clearAll,
    isSaved,
  };
}
