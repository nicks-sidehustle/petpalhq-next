'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSavedProducts, type SavedProduct } from '@/hooks/useSavedProducts';
import { trackAffiliateClick, injectAscSubtag } from '@/lib/dataLayer';
import { getAffiliateClickEnrichment } from '@/lib/engagement';

interface SavedDrawerProps {
  open: boolean;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Strip long SEO subtitles from guide names.
 * "Best Dog Harnesses 2026: No-Pull, No-Escape..." → "Best Dog Harnesses 2026" */
function shortGuideName(name: string): string {
  const cut = name.split(/[:\u2014\u2013|\u2013\u2014]/, 1)[0].trim();
  return cut || name;
}

function BookmarkGlyph({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SavedProductItem({
  product,
  onRemove,
}: {
  product: SavedProduct;
  onRemove: () => void;
}) {
  const handleAmazonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // saved_drawer is its own funnel position — tracked separately from the
    // original featured_strip / sticky_bar / comparison_chart / guide_content
    // click the user made when they first saved the product.
    const enrichment = getAffiliateClickEnrichment();
    const { ascsubtag } = trackAffiliateClick({
      product_name: product.productName,
      link_position: 'saved_drawer',
      link_url: product.amazonUrl,
      cta_type: 'primary',
      content_section: shortGuideName(product.guideName),
      asin: product.asin,
      ...enrichment,
    });
    e.currentTarget.href = injectAscSubtag(product.amazonUrl, ascsubtag);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: 14,
        borderRadius: 10,
        border: '1px solid var(--oat)',
        background: '#FFFFFF',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--espresso)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.productName}
        </p>
        <Link
          href={`/guides/${product.guideSlug}`}
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            color: 'var(--tomato)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={product.guideName}
        >
          From: {shortGuideName(product.guideName)}
        </Link>
        {product.price && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'var(--driftwood)',
            }}
          >
            {product.price} <span style={{ opacity: 0.7 }}>&middot; saved {formatDate(product.savedAt)}</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${product.productName} from shortlist`}
          title="Remove"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            background: 'transparent',
            border: 'none',
            color: 'var(--driftwood)',
            cursor: 'pointer',
          }}
        >
          <TrashIcon />
        </button>
        <a
          href={product.amazonUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          onClick={handleAmazonClick}
          style={{
            display: 'inline-block',
            padding: '7px 12px',
            background: 'var(--tomato)',
            color: 'var(--cream)',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          See on Amazon
        </a>
      </div>
    </div>
  );
}

export function SavedDrawer({ open, onClose }: SavedDrawerProps) {
  const { products, count, removeProduct, clearAll } = useSavedProducts();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    clearAll();
    setConfirmClear(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42, 37, 32, 0.35)',
          zIndex: 60,
          animation: 'lf-drawer-fade 0.2s ease-out',
        }}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Your shortlist"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 420,
          background: 'var(--cream)',
          borderLeft: '1px solid var(--oat)',
          boxShadow: '-12px 0 32px -12px rgba(42, 37, 32, 0.18)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-body)',
          animation: 'lf-drawer-slide 0.28s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--oat)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--espresso)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            Your shortlist{count > 0 ? ` (${count})` : ''}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {count > 0 && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontSize: 12,
                  color: 'var(--driftwood)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Clear all
              </button>
            )}
            {confirmClear && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--driftwood)' }}>Clear {count}?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: 'var(--tomato)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: 'var(--driftwood)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shortlist"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--espresso)',
                cursor: 'pointer',
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Product list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {count === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 24px',
                color: 'var(--driftwood)',
              }}
            >
              <BookmarkGlyph size={40} />
              <p
                style={{
                  margin: '14px 0 4px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--espresso)',
                }}
              >
                Nothing saved yet
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--driftwood)',
                  lineHeight: 1.5,
                }}
              >
                Tap the Save button on any pick to build a shortlist you can come
                back to.
              </p>
            </div>
          ) : (
            products.map((product) => (
              <SavedProductItem
                key={`${product.productName}-${product.guideSlug}`}
                product={product}
                onRemove={() => removeProduct(product.productName)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--oat)',
            fontSize: 11,
            color: 'var(--driftwood)',
            textAlign: 'center',
          }}
        >
          Saved locally in your browser &middot; not sent anywhere
        </div>
      </aside>

      {/* Keyframes kept inline so the drawer is fully self-contained */}
      <style>{`
        @keyframes lf-drawer-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lf-drawer-slide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
