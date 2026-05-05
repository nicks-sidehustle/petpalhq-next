import { NextResponse } from 'next/server';

const INDEXNOW_KEY = 'a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4';
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
