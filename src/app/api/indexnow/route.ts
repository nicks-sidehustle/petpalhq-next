import { NextResponse } from 'next/server';

const INDEXNOW_KEY = 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9';
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
