import { NextResponse } from 'next/server';

const INDEXNOW_KEY = '97b4501830e1517ea48c01d86ff03a81';
const SITE_URL = 'https://petpalhq.com';

export async function POST(request: Request) {
  const { urls } = await request.json();

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: new URL(SITE_URL).hostname,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls || [`${SITE_URL}/sitemap.xml`],
    }),
  });

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
  });
}
