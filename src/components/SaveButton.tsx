'use client';

import { useSavedProducts } from '@/hooks/useSavedProducts';

interface SaveButtonProps {
  productName: string;
  guideSlug: string;
  guideName: string;
  price: string | null;
  amazonUrl: string;
  asin?: string;
  /** Optional image URL — L&F tier data doesn't ship images today, but the
   * prop is here so a future redesign can use it without a component change. */
  image?: string;
  className?: string;
}

/** Plus-in-bookmark SVG (saved = filled tomato; unsaved = outlined driftwood).
 * Inline SVG instead of lucide-react since L&F is pinned to v1.7 which
 * predates BookmarkPlus/BookmarkCheck. */
function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={saved ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      {!saved && (
        <>
          <line x1="12" y1="7" x2="12" y2="13" />
          <line x1="9" y1="10" x2="15" y2="10" />
        </>
      )}
    </svg>
  );
}

/**
 * SaveButton — bookmark a tier product to the session shortlist. Lives next to
 * the "See price on Amazon" CTA inside each ValueTierCard. Click state syncs
 * across the card and the drawer badge via useSyncExternalStore.
 *
 * GA4 position downstream: when the user re-clicks the saved product from
 * the drawer, that click fires with link_position=saved_drawer.
 */
export function SaveButton({
  productName,
  guideSlug,
  guideName,
  price,
  amazonUrl,
  asin,
  image,
  className = '',
}: SaveButtonProps) {
  const { isSaved, saveProduct, removeProduct } = useSavedProducts();
  const saved = isSaved(productName);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (saved) {
      removeProduct(productName);
    } else {
      saveProduct({
        productName,
        guideSlug,
        guideName,
        image,
        price,
        amazonUrl,
        asin,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        saved
          ? `Remove ${productName} from shortlist`
          : `Save ${productName} to shortlist`
      }
      title={saved ? 'Saved to shortlist' : 'Save for later'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 14px',
        background: saved ? 'var(--sage)' : 'transparent',
        color: saved ? 'var(--cream)' : 'var(--driftwood)',
        border: saved ? '1px solid var(--sage)' : '1px solid var(--oat)',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      <BookmarkIcon saved={saved} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
