/**
 * Unit tests for the affiliate_link_click param builder.
 *
 * Covers the two classes of logic that decide whether a GA4 report is truthful:
 *   1. POSITION MAPPING — which surface gets credit for the click, including
 *      the href-derived fallback that instruments markdown prose links.
 *   2. REFERRER CLASSIFICATION — the ai_source dimension AEO work is judged on.
 * Plus /go/ href parsing (ASIN vs search fallback) and the "omit, never send
 * empty string" rule that keeps GA4 custom dimensions out of "(other)".
 *
 * Pure functions only — no DOM required. `buildAffiliateClickParams` takes all
 * ambient state (engagement, user type, ai source, page path) as an explicit
 * context argument precisely so it can be tested without a browser.
 *
 * Uses Node's native test runner via tsx, matching this repo's existing
 * scripts/test/placeholder-price.test.ts convention:
 *
 *   npx tsx --test scripts/test/affiliate-telemetry.test.ts
 *   (or `npm run test:affiliate-telemetry`)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAffiliateClickParams,
  classifyAiSource,
  detectUserType,
  normalizeLinkPosition,
  parseGoHref,
  type AffiliateClickContext,
} from '../../src/lib/analytics/affiliate-telemetry';

// A fixed context so assertions describe the builder, not the clock.
const CTX: AffiliateClickContext = {
  engagement: {
    time_on_page_before_click: 42,
    scroll_depth_at_click: 65,
    click_index: 1,
  },
  userType: 'human',
  aiSource: null,
  pagePath: '/guides/best-dog-gps-trackers-2026',
};

// ─── Position mapping ───────────────────────────────────────────────────────

test('normalizeLinkPosition snake_cases PetPal\'s real placement identifiers', () => {
  // These are the actual `placement` values passed by this repo's call sites —
  // preserved verbatim apart from casing/separators, never renamed to match
  // another site's vocabulary.
  assert.equal(normalizeLinkPosition('guide-featured-picks'), 'guide_featured_picks');
  assert.equal(normalizeLinkPosition('guide-comparison-table'), 'guide_comparison_table');
  assert.equal(normalizeLinkPosition('guide-deep-dive'), 'guide_deep_dive');
  assert.equal(normalizeLinkPosition('review-buybox'), 'review_buybox');
  assert.equal(normalizeLinkPosition('deals-page'), 'deals_page');
  assert.equal(normalizeLinkPosition('inline'), 'inline');
});

test('normalizeLinkPosition handles rail subtags and messy input', () => {
  assert.equal(normalizeLinkPosition('rail_b2s_gps'), 'rail_b2s_gps');
  assert.equal(normalizeLinkPosition('  Rail V2  '), 'rail_v2');
  assert.equal(normalizeLinkPosition('a//b--c'), 'a_b_c');
});

test('normalizeLinkPosition never yields an empty dimension value', () => {
  // GA4 buckets empty strings into "(other)"; 'unknown' stays queryable.
  assert.equal(normalizeLinkPosition(undefined), 'unknown');
  assert.equal(normalizeLinkPosition(''), 'unknown');
  assert.equal(normalizeLinkPosition('---'), 'unknown');
  assert.equal(normalizeLinkPosition(null), 'unknown');
});

test('explicit linkPosition wins over the href param', () => {
  const params = buildAffiliateClickParams(
    { href: '/go/B0CGZ1F2R9?s=best-dog-gps-trackers-2026&p=inline', linkPosition: 'guide-deep-dive' },
    CTX,
  );
  assert.equal(params.link_position, 'guide_deep_dive');
});

test('position falls back to the href p= param for prose links', () => {
  // This is the path that instruments markdown bodies: no component passes a
  // placement, so the renderer's `?p=` value is the only authority.
  const params = buildAffiliateClickParams(
    { href: '/go/B0CGZ1F2R9?s=best-dog-gps-trackers-2026&p=inline' },
    CTX,
  );
  assert.equal(params.link_position, 'inline');
});

test('position is unknown when neither prop nor href supplies one', () => {
  // e.g. /deals, whose hrefs are bare /go/{ASIN} with no s=/p=.
  const params = buildAffiliateClickParams({ href: '/go/B0CGZ1F2R9' }, CTX);
  assert.equal(params.link_position, 'unknown');
});

// ─── /go/ href parsing ──────────────────────────────────────────────────────

test('parseGoHref reads ASIN, slug and position out of a prose href', () => {
  const parsed = parseGoHref('/go/B0CGZ1F2R9?s=best-dog-gps-trackers-2026&p=inline');
  assert.equal(parsed?.asin, 'B0CGZ1F2R9');
  assert.equal(parsed?.linkType, 'product');
  assert.equal(parsed?.guideSlug, 'best-dog-gps-trackers-2026');
  assert.equal(parsed?.position, 'inline');
  assert.equal(parsed?.searchTerm, undefined);
});

test('parseGoHref classifies a non-ASIN id as a search fallback', () => {
  // buildAmazonDest sends these to /s?k=, which converts worse than /dp/ —
  // the split has to be visible in reporting.
  const parsed = parseGoHref('/go/dog%20gps%20tracker?s=best-dog-gps-trackers-2026');
  assert.equal(parsed?.linkType, 'search');
  assert.equal(parsed?.searchTerm, 'dog gps tracker');
  assert.equal(parsed?.asin, undefined);
});

test('parseGoHref picks up the placement subtag, click-time value winning', () => {
  assert.equal(parseGoHref('/go/B0CGZ1F2R9?st=rail_v2')?.ascsubtag, 'rail_v2');
  assert.equal(
    parseGoHref('/go/B0CGZ1F2R9?st=rail_v2&ascsubtag=live')?.ascsubtag,
    'live',
  );
});

test('parseGoHref accepts absolute same-origin hrefs', () => {
  // anchor.href reads back absolute; the listener must still parse it.
  const parsed = parseGoHref('https://petpalhq.com/go/B0CGZ1F2R9?p=inline');
  assert.equal(parsed?.asin, 'B0CGZ1F2R9');
  assert.equal(parsed?.position, 'inline');
});

test('parseGoHref returns null for non-money links', () => {
  assert.equal(parseGoHref('/guides/best-dog-gps-trackers-2026'), null);
  assert.equal(parseGoHref('https://www.merckvetmanual.com/'), null);
  assert.equal(parseGoHref(''), null);
  assert.equal(parseGoHref('/go/'), null);
});

test('a lowercase 10-char id is a search term, not an ASIN', () => {
  // Mirrors buildAmazonDest's /^[A-Z0-9]{10}$/ — case-sensitive on purpose.
  assert.equal(parseGoHref('/go/heatedbeds')?.linkType, 'search');
});

// ─── Referrer classification ────────────────────────────────────────────────

test('classifyAiSource maps AI referrer hosts to canonical labels', () => {
  assert.equal(classifyAiSource('https://chatgpt.com/c/abc123'), 'chatgpt');
  assert.equal(classifyAiSource('https://chat.openai.com/'), 'chatgpt');
  assert.equal(classifyAiSource('https://claude.ai/chat/xyz'), 'claude');
  assert.equal(classifyAiSource('https://www.perplexity.ai/search?q=dog+gps'), 'perplexity');
  assert.equal(classifyAiSource('https://copilot.microsoft.com/chats/1'), 'copilot');
  assert.equal(classifyAiSource('https://search.brave.com/search?q=x'), 'brave-search');
  assert.equal(classifyAiSource('https://kagi.com/search?q=x'), 'kagi');
});

test('classifyAiSource prefers the specific chat surface over its host engine', () => {
  // bing.com/chat must beat a generic bing.com match, or the chat surface
  // loses credit to ordinary search. This is why AI_PATTERNS is ordered.
  assert.equal(classifyAiSource('https://www.bing.com/chat?q=best+dog+gps'), 'bing-chat');
});

test('classifyAiSource falls back to utm_source when there is no referrer', () => {
  // AI surfaces increasingly strip the Referer header; utm_source is the
  // remaining signal.
  assert.equal(classifyAiSource(undefined, 'chatgpt.com'), 'chatgpt');
  assert.equal(classifyAiSource('', 'perplexity'), 'perplexity');
  assert.equal(classifyAiSource(undefined, 'ChatGPT'), 'chatgpt');
});

test('classifyAiSource returns null for non-AI and malformed referrers', () => {
  assert.equal(classifyAiSource('https://www.google.com/search?q=dog+gps'), null);
  assert.equal(classifyAiSource('https://reddit.com/r/dogs'), null);
  assert.equal(classifyAiSource('not-a-url'), null);
  assert.equal(classifyAiSource(undefined, undefined), null);
  assert.equal(classifyAiSource('', ''), null);
});

test('detectUserType separates AI crawlers, search bots and humans', () => {
  assert.equal(detectUserType('Mozilla/5.0 (compatible; GPTBot/1.0)'), 'ai_crawler');
  assert.equal(detectUserType('Mozilla/5.0 (compatible; ClaudeBot/1.0)'), 'ai_crawler');
  assert.equal(detectUserType('PerplexityBot/1.0'), 'ai_crawler');
  assert.equal(detectUserType('Mozilla/5.0 (compatible; Googlebot/2.1)'), 'search_bot');
  assert.equal(detectUserType('Mozilla/5.0 (compatible; bingbot/2.0)'), 'search_bot');
  assert.equal(
    detectUserType(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ),
    'human',
  );
  assert.equal(detectUserType(''), 'unknown');
});

test('detectUserType checks AI signatures before search-bot substrings', () => {
  // 'Applebot-Extended' contains 'Applebot'; AI training crawlers must not be
  // filed as ordinary search bots.
  assert.equal(detectUserType('Mozilla/5.0 (compatible; Applebot-Extended/1.0)'), 'ai_crawler');
  assert.equal(detectUserType('Mozilla/5.0 (compatible; Google-Extended)'), 'ai_crawler');
});

// ─── Full payload contract ──────────────────────────────────────────────────

test('buildAffiliateClickParams emits the full param set for a product link', () => {
  const params = buildAffiliateClickParams(
    {
      href: '/go/B0CGZ1F2R9?s=best-dog-gps-trackers-2026&p=inline',
      productName: 'Tractive GPS Dog LTE',
      productSlug: 'tractive-gps-dog-lte',
    },
    CTX,
  );

  assert.equal(params.link_position, 'inline');
  assert.equal(params.link_type, 'product');
  assert.equal(params.amazon_asin, 'B0CGZ1F2R9');
  assert.equal(params.guide_slug, 'best-dog-gps-trackers-2026');
  assert.equal(params.product_name, 'Tractive GPS Dog LTE');
  assert.equal(params.product_slug, 'tractive-gps-dog-lte');
  assert.equal(params.retailer, 'amazon');
  assert.equal(params.user_type, 'human');
  assert.equal(params.page_path, '/guides/best-dog-gps-trackers-2026');
  // Engagement passes through from the snapshot.
  assert.equal(params.time_on_page_before_click, 42);
  assert.equal(params.scroll_depth_at_click, 65);
  assert.equal(params.click_index, 1);
});

test('guide_slug falls back to the pathname when the href lacks s=', () => {
  // The /deals surface emits bare /go/{ASIN}; the guide slug is not recoverable
  // there, but on a guide page the pathname still supplies it.
  const params = buildAffiliateClickParams({ href: '/go/B0CGZ1F2R9' }, CTX);
  assert.equal(params.guide_slug, 'best-dog-gps-trackers-2026');
});

test('guide_slug is omitted entirely off-guide rather than sent empty', () => {
  const params = buildAffiliateClickParams(
    { href: '/go/B0CGZ1F2R9', linkPosition: 'deals-page' },
    { ...CTX, pagePath: '/deals' },
  );
  assert.ok(!('guide_slug' in params));
  assert.equal(params.link_position, 'deals_page');
});

test('absent optional params are omitted, never sent as empty strings', () => {
  const params = buildAffiliateClickParams({ href: '/go/B0CGZ1F2R9?p=inline' }, {
    ...CTX,
    pagePath: '/deals',
  });
  for (const key of ['product_name', 'product_slug', 'search_term', 'ascsubtag', 'ai_source']) {
    assert.ok(!(key in params), `${key} should be omitted when unknown`);
  }
});

test('ai_source and ai_referred ride along only on AI-referred sessions', () => {
  const withAi = buildAffiliateClickParams(
    { href: '/go/B0CGZ1F2R9?p=inline' },
    { ...CTX, aiSource: 'chatgpt' },
  );
  assert.equal(withAi.ai_source, 'chatgpt');
  assert.equal(withAi.ai_referred, true);

  const withoutAi = buildAffiliateClickParams({ href: '/go/B0CGZ1F2R9?p=inline' }, CTX);
  assert.ok(!('ai_source' in withoutAi));
  assert.ok(!('ai_referred' in withoutAi));
});

test('search fallbacks report link_type=search and the search term', () => {
  const params = buildAffiliateClickParams(
    { href: '/go/heated%20cat%20bed?s=best-heated-cat-beds-2026&p=inline' },
    CTX,
  );
  assert.equal(params.link_type, 'search');
  assert.equal(params.search_term, 'heated cat bed');
  assert.ok(!('amazon_asin' in params));
});

test('link_url reports the href verbatim — telemetry never rewrites it', () => {
  // Guards the observe-only contract: no tag injection, no ascsubtag rewrite.
  const href = '/go/B0CGZ1F2R9?s=best-dog-gps-trackers-2026&p=inline';
  const params = buildAffiliateClickParams({ href }, CTX);
  assert.equal(params.link_url, href);
});
