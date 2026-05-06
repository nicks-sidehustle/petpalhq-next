/**
 * IndexNow — instant Bing/Yandex/Naver/Seznam/Yep/DuckDuckGo crawl ping.
 *
 * Key file MUST be served at: https://petpalhq.com/{INDEXNOW_KEY}.txt
 * with the key string as content. The crawlers fetch that URL to verify
 * domain ownership; if it 404s or content mismatches, our submissions
 * are silently dropped. (We learned this the hard way.)
 */

const INDEXNOW_KEY = '97b4501830e1517ea48c01d86ff03a81';
const HOST = 'petpalhq.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Ping IndexNow with a batch of URLs (max 10,000 per call).
 * Returns true on 200/202, false on failure.
 */
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  if (!urls.length) return true;

  const cleanUrls = [...new Set(urls)].map((u) =>
    u.startsWith('http') ? u : `https://${HOST}${u}`,
  );

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: cleanUrls,
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] Pinged ${cleanUrls.length} URLs`);
      return true;
    }
    console.error(
      `[IndexNow] Failed: ${response.status} ${response.statusText}`,
    );
    return false;
  } catch (err) {
    console.error('[IndexNow] Error:', err);
    return false;
  }
}

/**
 * Ping the canonical landing pages. Useful for sanity-checking the
 * keyfile is verifying after a deploy without burning budget on
 * the full guide list.
 */
export async function pingAllPages(): Promise<boolean> {
  const baseUrl = `https://${HOST}`;
  return pingIndexNow([
    baseUrl,
    `${baseUrl}/guides`,
    `${baseUrl}/methodology`,
  ]);
}
