#!/usr/bin/env node

/**
 * amazon-lookup.cjs — PetPalHQ self-contained copy.
 *
 * Vendored into petpalhq-next so the content pipeline NEVER shells into another
 * site's repo for ASIN verification. Generic Amazon Creators API v3.1 client:
 * OAuth (scope "creatorsapi::default") + searchItems/getItems. Returns ASIN,
 * price, image URL, affiliate link, brand, and listing feature bullets.
 *
 * Usage:
 *   node scripts/automation/amazon-lookup.cjs --product="Stainless steel cat water fountain"
 *   node scripts/automation/amazon-lookup.cjs --asin=B0XXXXXXXX
 *
 * Requires in petpalhq-next/.env.local (NOT another repo's):
 *   AMAZON_CLIENT_ID      amzn1.application-oa2-client.XXXXX
 *   AMAZON_CLIENT_SECRET  amzn1.oa2-cs.v1.XXXXX
 *   AMAZON_AFFILIATE_TAG  petpalhq08-20   (defaults to petpalhq08-20 if unset)
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.local') });

const fs = require('fs');
const path = require('path');

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'petpalhq08-20';
const CREDENTIAL_VERSION = '3.1';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon';
const MARKETPLACE = 'www.amazon.com';

// --- Arg parsing ---

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      args[key] = rest.join('=') || true;
    }
  });
  return args;
}

// --- OAuth token (v3.x: JSON body, scope creatorsapi::default) ---

let _cachedToken = null;
let _tokenExpiresAt = 0;

async function getAccessToken() {
  const clientId = process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET must be set in .env.local');
  }

  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) {
    return _cachedToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

// --- API helpers ---

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-marketplace': MARKETPLACE,
  };
}

// --- SearchItems ---

async function searchProduct(token, query) {
  const res = await fetch(`${API_BASE}/catalog/v1/searchItems`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({
      keywords: query,
      marketplace: MARKETPLACE,
      partnerTag: AFFILIATE_TAG,
      resources: [
        'images.primary.large',
        'images.primary.medium',
        'itemInfo.title',
        'itemInfo.features',
        'itemInfo.byLineInfo',
        'offersV2.listings.price',
        'offersV2.listings.availability',
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SearchItems failed ${res.status} for "${query}": ${text}`);
  }

  const data = await res.json();

  if (process.env.DEBUG) {
    console.error('SearchItems response:', JSON.stringify(data, null, 2));
  }

  const items = data.searchResult?.items || data.items || [];
  return items.length ? extractProduct(items[0], query) : null;
}

// --- GetItems by ASIN ---

async function getItem(token, asin) {
  const res = await fetch(`${API_BASE}/catalog/v1/getItems`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({
      itemIds: [asin],
      itemIdType: 'ASIN',
      marketplace: MARKETPLACE,
      partnerTag: AFFILIATE_TAG,
      resources: [
        'images.primary.large',
        'images.primary.medium',
        'itemInfo.title',
        'itemInfo.features',
        'itemInfo.byLineInfo',
        'offersV2.listings.price',
        'offersV2.listings.availability',
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetItems failed ${res.status} for ASIN ${asin}: ${text}`);
  }

  const data = await res.json();
  const items = data.itemsResult?.items || [];
  return items.length ? extractProduct(items[0], asin) : null;
}

// --- Extract product fields from response ---

function extractProduct(item, fallbackQuery) {
  const asin = item.asin || null;

  // Price from offers or offersV2
  const listing =
    item.offers?.listings?.[0] ||
    item.offersV2?.listings?.[0] ||
    null;
  // Creators API returns price under listing.price.money.displayAmount for
  // offersV2. Older responses used listing.price.displayAmount directly — keep
  // the fallback so older shapes still work.
  const price =
    listing?.price?.money?.displayAmount ||
    listing?.price?.displayAmount ||
    null;

  // Image URL — prefer large, fall back to medium
  const imageUrl =
    item.images?.primary?.large?.url ||
    item.images?.primary?.medium?.url ||
    null;

  const title =
    item.itemInfo?.title?.displayValue ||
    item.title ||
    fallbackQuery;

  // Listing feature bullets — often include active ingredients / specs, useful
  // for grounding product claims without a web fetch. May be absent for some items.
  const features =
    item.itemInfo?.features?.displayValues ||
    item.itemInfo?.features ||
    null;

  // Manufacturer/brand from the byline, when present.
  const brand =
    item.itemInfo?.byLineInfo?.brand?.displayValue ||
    item.itemInfo?.byLineInfo?.manufacturer?.displayValue ||
    null;

  const affiliateLink = asin
    ? `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(fallbackQuery)}&tag=${AFFILIATE_TAG}`;

  return { asin, title, price, imageUrl, affiliateLink, brand, features };
}

// --- Markdown patching ---

function extractProductNames(markdown) {
  const match = markdown.match(/^products:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(line => line.replace(/^\s+-\s+['"]?/, '').replace(/['"]?\s*$/, '').trim())
    .filter(Boolean);
}

function patchMarkdown(markdown, productMap) {
  let patched = markdown;

  for (const [productName, data] of Object.entries(productMap)) {
    if (!data) continue;
    const { asin, price, affiliateLink } = data;

    // Replace existing search links for this product with real ASIN link
    if (asin) {
      const searchKey = productName.replace(/\s+/g, '+');
      // Match /s?k= links for this product
      const searchPattern = new RegExp(
        `https://www\\.amazon\\.com/s\\?k=${searchKey.replace(/[+]/g, '[+]')}[^)"'\\s]*`,
        'g'
      );
      patched = patched.replace(searchPattern, affiliateLink);
    }

    // Replace ~$price in Price: lines with real price + ASIN link
    if (price && asin) {
      // Match: **Price:** [~$XXX on Amazon](url)  or  [$XXX on Amazon](url)
      const priceLinePattern = new RegExp(
        `(\\*\\*Price:\\*\\*\\s*)\\[~?\\$[\\d,.]+\\s*on Amazon\\]\\([^)]+\\)`,
        'g'
      );
      patched = patched.replace(priceLinePattern, `$1[${price} on Amazon](${affiliateLink})`);
    }
  }

  return patched;
}

async function patchGuide(guidePath, token) {
  console.log(`\nPatching: ${path.basename(guidePath)}`);
  const markdown = fs.readFileSync(guidePath, 'utf-8');
  const productNames = extractProductNames(markdown);

  if (!productNames.length) {
    console.log('  No products in frontmatter — skipping');
    return;
  }

  const productMap = {};
  for (const name of productNames) {
    process.stdout.write(`  "${name}" ... `);
    try {
      const result = await searchProduct(token, name);
      productMap[name] = result;
      if (result) {
        console.log(`ASIN: ${result.asin || '—'} | Price: ${result.price || '—'}`);
      } else {
        console.log('no results');
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      productMap[name] = null;
    }
    await new Promise(r => setTimeout(r, 1100)); // 1 TPS rate limit
  }

  const patched = patchMarkdown(markdown, productMap);
  fs.writeFileSync(guidePath, patched, 'utf-8');
  console.log(`  Saved.`);
  return productMap;
}

// --- Main ---

async function main() {
  const args = parseArgs();

  console.error('Getting Amazon access token (v3.1, creatorsapi::default scope)...');
  const token = await getAccessToken();
  console.error('Token OK.');

  if (args.product) {
    const result = await searchProduct(token, args.product);
    // stdout = JSON only (for machine consumption by wire-products.mjs)
    // stderr = status messages (for human readability in terminal)
    console.log(result ? JSON.stringify(result) : 'No results found.');
    return;
  }

  if (args.asin) {
    const result = await getItem(token, args.asin);
    console.log(result ? JSON.stringify(result) : 'Not found.');
    return;
  }

  if (args.patch) {
    await patchGuide(path.resolve(args.patch.replace(/^~/, process.env.HOME)), token);
    return;
  }

  if (args['patch-all']) {
    const queueDir = (args.queue || '.').replace(/^~/, process.env.HOME);
    const files = fs.readdirSync(queueDir)
      .filter(f => f.endsWith('.md') && !f.startsWith('QUEUE') && !f.startsWith('AUDIENCE'))
      .map(f => path.join(queueDir, f));

    if (!files.length) { console.log('No markdown files found.'); return; }

    console.log(`Patching ${files.length} guides in ${path.resolve(queueDir)}\n`);
    for (const file of files) {
      await patchGuide(file, token);
    }
    console.log('\nDone.');
    return;
  }

  console.error('Usage:');
  console.error('  node amazon-lookup.cjs --product="Echo Show 8 3rd Gen"');
  console.error('  node amazon-lookup.cjs --asin=B09B2NBYWN');
  console.error('  node amazon-lookup.cjs --patch=path/to/guide.md');
  console.error('  node amazon-lookup.cjs --patch-all --queue=path/to/queue/');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
