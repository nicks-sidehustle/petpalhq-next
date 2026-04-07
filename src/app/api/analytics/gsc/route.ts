import { NextResponse } from 'next/server';

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3';

async function getAccessToken(): Promise<string> {
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyB64) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');

  const keyJson = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'));

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: keyJson.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(keyJson.private_key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '28');
    const siteUrl = 'https://petpalhq.com';

    const token = await getAccessToken();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const analyticsRes = await fetch(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 25,
        }),
      }
    );

    const analytics = await analyticsRes.json();

    const indexRes = await fetch(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const sitemaps = await indexRes.json();

    return NextResponse.json({
      site: siteUrl,
      period: `${days} days`,
      topQueries: analytics.rows?.map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: (row.ctr * 100).toFixed(1) + '%',
        position: row.position.toFixed(1),
      })) || [],
      sitemaps: sitemaps.sitemap?.map((s: { path: string; lastSubmitted: string; isPending: boolean; warnings: number; errors: number }) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted,
        isPending: s.isPending,
        warnings: s.warnings,
        errors: s.errors,
      })) || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
