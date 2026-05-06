#!/usr/bin/env npx tsx
/**
 * GA4 verification probe — list visible properties + query data if accessible.
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
 * Service account must be added as Viewer on the GA4 property to query data.
 *
 * What it does:
 *   1. Lists all GA4 accounts/properties the SA can see (Admin API)
 *   2. If a petpalhq property is found, fetches last 7 days of:
 *      - Total sessions / users / pageviews
 *      - Top 10 pages by pageviews
 *      - Top 5 traffic sources
 *      - Real-time active users (last 30 min)
 *   3. Confirms the GA4 measurement ID matches G-LSY698MLR5
 */

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const EXPECTED_MEASUREMENT_ID = 'G-LSY698MLR5';
const SITE_DOMAIN = 'petpalhq.com';

async function main(): Promise<void> {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const authClient = await auth.getClient();
  const accessToken = (await authClient.getAccessToken()).token;
  if (!accessToken) throw new Error('Failed to get access token');

  // ─── Admin API — list everything visible to this SA ────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('GA4 ADMIN — properties visible to this service account');
  console.log('═══════════════════════════════════════════════════════════\n');

  const acctRes = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const acctJson = (await acctRes.json()) as {
    accountSummaries?: Array<{
      name: string;
      account: string;
      displayName: string;
      propertySummaries?: Array<{
        property: string;
        displayName: string;
        propertyType: string;
      }>;
    }>;
    error?: { message: string };
  };

  if (acctJson.error) {
    console.error('Admin API error:', acctJson.error.message);
    process.exit(1);
  }

  const summaries = acctJson.accountSummaries ?? [];
  if (summaries.length === 0) {
    console.log('⚠ No GA4 accounts visible to this service account.\n');
    console.log('Action: add', 'she-ga4@gen-lang-client-0647686547.iam.gserviceaccount.com');
    console.log('as a Viewer on the petpalhq.com GA4 property:');
    console.log('  https://analytics.google.com/ → Admin → Property Access Management → +');
    process.exit(2);
  }

  let petpalProperty: { property: string; displayName: string } | null = null;
  for (const acct of summaries) {
    console.log(`Account: ${acct.displayName} (${acct.account})`);
    for (const prop of acct.propertySummaries ?? []) {
      const id = prop.property.split('/')[1];
      console.log(`  └─ ${prop.displayName} (${prop.property}) [${prop.propertyType}]`);
      if (
        prop.displayName.toLowerCase().includes('petpal') ||
        prop.displayName.toLowerCase().includes(SITE_DOMAIN)
      ) {
        petpalProperty = { property: prop.property, displayName: prop.displayName };
      }
    }
  }
  console.log();

  if (!petpalProperty) {
    console.log('⚠ No petpalhq GA4 property found in visible properties.\n');
    console.log('The service account can see other properties but NOT petpalhq.');
    console.log('Action: add she-ga4@... as Viewer on the petpalhq GA4 property.');
    process.exit(2);
  }

  console.log(`✓ Found petpalhq property: ${petpalProperty.property}\n`);

  // ─── Verify measurement ID matches ──────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('GA4 ADMIN — data streams + measurement ID');
  console.log('═══════════════════════════════════════════════════════════\n');

  const streamsRes = await fetch(
    `https://analyticsadmin.googleapis.com/v1beta/${petpalProperty.property}/dataStreams`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const streamsJson = (await streamsRes.json()) as {
    dataStreams?: Array<{
      name: string;
      type: string;
      displayName: string;
      webStreamData?: { measurementId: string; defaultUri: string };
    }>;
    error?: { message: string };
  };

  if (streamsJson.error) {
    console.log('Streams error:', streamsJson.error.message);
  } else {
    let foundExpectedMeasurementId = false;
    for (const stream of streamsJson.dataStreams ?? []) {
      const mid = stream.webStreamData?.measurementId ?? '(non-web)';
      const uri = stream.webStreamData?.defaultUri ?? '';
      console.log(`  Stream: ${stream.displayName} [${stream.type}]`);
      console.log(`    Measurement ID: ${mid}`);
      console.log(`    URI: ${uri}`);
      if (mid === EXPECTED_MEASUREMENT_ID) {
        foundExpectedMeasurementId = true;
        console.log(`    ✓ matches expected ${EXPECTED_MEASUREMENT_ID}`);
      }
    }
    if (!foundExpectedMeasurementId) {
      console.log(`  ⚠ Expected measurement ID ${EXPECTED_MEASUREMENT_ID} NOT found in streams.`);
    }
    console.log();
  }

  // ─── Data API — last 7 days ─────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('GA4 DATA — last 7 days');
  console.log('═══════════════════════════════════════════════════════════\n');

  const totalsRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${petpalProperty.property}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
          { name: 'engagementRate' },
        ],
      }),
    },
  );
  const totalsJson = (await totalsRes.json()) as {
    rows?: Array<{ metricValues: Array<{ value: string }> }>;
    error?: { message: string };
  };

  if (totalsJson.error) {
    console.log('Totals error:', totalsJson.error.message);
  } else {
    const v = totalsJson.rows?.[0]?.metricValues ?? [];
    console.log(`  Sessions:     ${v[0]?.value ?? 0}`);
    console.log(`  Users:        ${v[1]?.value ?? 0}`);
    console.log(`  Pageviews:    ${v[2]?.value ?? 0}`);
    console.log(`  Events:       ${v[3]?.value ?? 0}`);
    console.log(`  Engagement %: ${((parseFloat(v[4]?.value ?? '0')) * 100).toFixed(1)}%`);
    console.log();
  }

  // ─── Top pages ──────────────────────────────────────────────────────────
  console.log('Top 10 pages by pageviews (last 7 days):\n');
  const pagesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${petpalProperty.property}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
    },
  );
  const pagesJson = (await pagesRes.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
    error?: { message: string };
  };
  if (pagesJson.error) {
    console.log('  Pages error:', pagesJson.error.message);
  } else if (!pagesJson.rows || pagesJson.rows.length === 0) {
    console.log('  (no rows — may indicate no data yet)');
  } else {
    for (const row of pagesJson.rows) {
      const path = row.dimensionValues[0].value.padEnd(60);
      const views = row.metricValues[0].value;
      console.log(`  ${path} ${views}`);
    }
  }
  console.log();

  // ─── Top traffic sources ────────────────────────────────────────────────
  console.log('Top 5 traffic sources (last 7 days):\n');
  const srcRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${petpalProperty.property}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 5,
      }),
    },
  );
  const srcJson = (await srcRes.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
    error?: { message: string };
  };
  if (srcJson.error) {
    console.log('  Sources error:', srcJson.error.message);
  } else if (!srcJson.rows || srcJson.rows.length === 0) {
    console.log('  (no rows)');
  } else {
    for (const row of srcJson.rows) {
      const src = `${row.dimensionValues[0].value} / ${row.dimensionValues[1].value}`.padEnd(40);
      console.log(`  ${src} ${row.metricValues[0].value}`);
    }
  }
  console.log();

  // ─── Real-time ──────────────────────────────────────────────────────────
  console.log('Real-time (last 30 min):\n');
  const rtRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${petpalProperty.property}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: [{ name: 'activeUsers' }],
      }),
    },
  );
  const rtJson = (await rtRes.json()) as {
    rows?: Array<{ metricValues: Array<{ value: string }> }>;
    error?: { message: string };
  };
  if (rtJson.error) {
    console.log('  Realtime error:', rtJson.error.message);
  } else {
    const active = rtJson.rows?.[0]?.metricValues?.[0]?.value ?? '0';
    console.log(`  Active users: ${active}`);
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✓ GA4 verification complete');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
