/**
 * POST /api/restock-notify — restock-alert signup for a suppressed OOS pick.
 *
 * Accepts BOTH shapes on purpose:
 *   - application/json           → answered with JSON (the hydrated component)
 *   - form-urlencoded / multipart → answered with a styled HTML confirmation
 *     page that links back to the guide (the no-JS native form post)
 *
 * Server-side only: BREVO_API_KEY is read here and never serialized into any
 * response body or client bundle.
 *
 * Privacy: the response is generic by construction. A brand-new signup, a
 * repeat signup, and an address already sitting in Brevo all produce the same
 * 200 and the same wording — the endpoint must not be usable to test whether
 * an address is on file.
 *
 * Anti-abuse is deliberately naive, and named as such: a honeypot field, shape
 * validation, and a per-instance in-memory IP counter. On Vercel's serverless
 * runtime the counter resets with each cold start and is not shared between
 * instances, so treat it as friction against casual scripting, not as a real
 * rate limiter. Upgrade path if this ever gets abused: the repo already has
 * @upstash/redis as a dependency — swap the Map for a Redis INCR with TTL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidAsin, isValidEmail, isValidGuideSlug } from '@/lib/restock-watch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

/** Same wording for every accepted request — see the privacy note above. */
const GENERIC_SUCCESS = "You're on the list. We'll email you once, when it's back.";

// --- Naive per-instance rate limit -----------------------------------------

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Bound the map so a long-lived instance can't grow it without limit.
  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      if (stamps.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_MAX;
}

/**
 * The client IP as the PLATFORM saw it — never as the caller claims it.
 *
 * The previous version read the LEFTMOST x-forwarded-for entry, which is the
 * one value in the whole request an attacker fully controls. Vercel appends to
 * x-forwarded-for rather than replacing it, so `X-Forwarded-For: <random>` on
 * every request produced a fresh rate-limit bucket each time and the limiter
 * became a no-op — a one-header bypass in front of an endpoint that writes to
 * Brevo.
 *
 * Trust order:
 *  1. x-real-ip — Vercel sets this from the real socket peer and overwrites any
 *     client-supplied value, so it cannot be forged from outside.
 *  2. the RIGHTMOST x-forwarded-for entry — the hop appended by the trusted
 *     proxy closest to us. Everything to its left was supplied by the caller.
 *
 * Falling back to a single 'unknown' bucket is deliberate: if neither header is
 * present, every such request shares one counter and gets rate-limited together.
 * Failing closed on an unidentifiable caller is the right side to err on.
 */
function clientIp(request: NextRequest): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;

  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const hops = fwd
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
}

// --- Payload parsing --------------------------------------------------------

interface Payload {
  email: string;
  asin: string;
  productName: string;
  guideSlug: string;
  website: string;
}

function coerce(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function readPayload(
  request: NextRequest
): Promise<{ payload: Payload; wantsHtml: boolean }> {
  const contentType = request.headers.get('content-type') || '';
  let raw: Record<string, unknown> = {};
  let wantsHtml = false;

  if (contentType.includes('application/json')) {
    raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    // Native <form> post — no JS on the page, or JS failed to hydrate.
    wantsHtml = true;
    const form = await request.formData().catch(() => null);
    if (form) {
      for (const [key, value] of form.entries()) {
        raw[key] = typeof value === 'string' ? value : '';
      }
    }
  }

  return {
    wantsHtml,
    payload: {
      email: coerce(raw.email).toLowerCase(),
      asin: coerce(raw.asin).toUpperCase(),
      productName: coerce(raw.productName),
      guideSlug: coerce(raw.guideSlug),
      website: coerce(raw.website),
    },
  };
}

// --- Responses --------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * No-JS confirmation. Painted in the site palette so the fallback still reads
 * as PetPalHQ rather than a raw JSON dump, and always offers the way back to
 * the guide the visitor came from.
 */
function htmlResponse(
  status: number,
  heading: string,
  body: string,
  guideSlug: string
): NextResponse {
  const backHref = isValidGuideSlug(guideSlug) ? `/guides/${guideSlug}` : '/guides';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(heading)} — PetPalHQ</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fdfaf3;color:#1a2440;margin:0;padding:48px 20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #f7eedd;border-radius:8px;padding:32px;">
<h1 style="color:#1e3a6e;font-size:22px;margin:0 0 12px;">${escapeHtml(heading)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${escapeHtml(body)}</p>
<a href="${escapeHtml(backHref)}" style="display:inline-block;background:#f29c3a;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px;">Back to the guide</a>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function respond(
  wantsHtml: boolean,
  status: number,
  message: string,
  guideSlug: string,
  heading = status === 200 ? 'Got it.' : "That didn't go through"
): NextResponse {
  if (wantsHtml) return htmlResponse(status, heading, message, guideSlug);
  return NextResponse.json({ ok: status === 200, message }, { status });
}

// --- Brevo ------------------------------------------------------------------

/**
 * Reads the contact's existing RESTOCK_ASINS so a second signup ADDS an ASIN
 * instead of overwriting the first one. A 404 (unknown contact) is the normal
 * first-signup path, not an error.
 */
async function existingAsins(email: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${BREVO_CONTACTS_URL}/${encodeURIComponent(email)}`, {
      headers: { accept: 'application/json', 'api-key': apiKey },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { attributes?: Record<string, unknown> };
    const current = data.attributes?.RESTOCK_ASINS;
    if (typeof current !== 'string') return [];
    return current
      .split(',')
      .map((a) => a.trim().toUpperCase())
      .filter(isValidAsin);
  } catch {
    return [];
  }
}

// --- Handler ----------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { payload, wantsHtml } = await readPayload(request);
  const { email, asin, productName, guideSlug, website } = payload;

  // Honeypot: a filled hidden field is a bot. Answer exactly like success so
  // the crawler learns nothing about what tripped it.
  if (website) {
    return respond(wantsHtml, 200, GENERIC_SUCCESS, guideSlug);
  }

  // productName is the one free-text field a stranger can put into our Brevo
  // record and, from there, into mail we send from our own domain. Length alone
  // was never the constraint that mattered: reject anything carrying a URL or
  // markup at the boundary, so the payload is never stored in the first place.
  // getRestockEmailTemplate() gates again at render time — this is the outer
  // of the two layers, not a substitute for it.
  const productNameLooksHostile = /(?:https?:\/\/|\/\/|www\.)/i.test(productName) || /[<>]/.test(productName);

  if (
    !isValidEmail(email) ||
    !isValidAsin(asin) ||
    !isValidGuideSlug(guideSlug) ||
    productName.length === 0 ||
    productName.length > 200 ||
    productNameLooksHostile
  ) {
    return respond(
      wantsHtml,
      400,
      'That email address or product reference did not look right. Please try again.',
      guideSlug
    );
  }

  if (rateLimited(clientIp(request))) {
    return respond(
      wantsHtml,
      429,
      'Too many signups from this connection just now. Please try again in a few minutes.',
      guideSlug
    );
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number.parseInt(process.env.BREVO_RESTOCK_LIST_ID || '', 10);

  if (!apiKey || !Number.isFinite(listId)) {
    // Provisioning gap, not a visitor mistake — say so plainly, log loudly.
    console.error(
      '[restock-notify] Missing BREVO_API_KEY and/or BREVO_RESTOCK_LIST_ID — signup dropped.'
    );
    return respond(
      wantsHtml,
      503,
      'Restock alerts are temporarily unavailable. Please check back shortly.',
      guideSlug
    );
  }

  const asins = Array.from(new Set([...(await existingAsins(email, apiKey)), asin]));

  try {
    const res = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        // updateEnabled stays TRUE deliberately. Turning it off does not make
        // this endpoint safer — it makes it dishonest: a second signup for a
        // different product would come back as `duplicate_parameter`, which the
        // handler below treats as success, so the visitor would be told they
        // are on the list for an ASIN we never recorded and would never mail
        // them about. A silent broken promise is worse than the write.
        //
        // What actually bounds the write is scope: every attribute below is
        // RESTOCK_*-namespaced, so this route can never touch a contact's
        // newsletter or drip attributes, and productName is gated above before
        // it can reach the record.
        updateEnabled: true,
        attributes: {
          RESTOCK_ASINS: asins.join(','),
          RESTOCK_PRODUCT: productName,
          RESTOCK_GUIDE: guideSlug,
          RESTOCK_REQUESTED_AT: new Date().toISOString(),
        },
      }),
    });

    const data = (await res.json().catch(() => null)) as { code?: string } | null;
    const isDuplicate =
      data?.code === 'duplicate_parameter' ||
      (res.status === 400 && JSON.stringify(data ?? {}).includes('Contact already exist'));

    if (!res.ok && !isDuplicate) {
      console.error('[restock-notify] Brevo error:', res.status, data);
      return respond(
        wantsHtml,
        502,
        'We could not record that just now. Please try again in a moment.',
        guideSlug
      );
    }

    // Identical response for new, repeat, and pre-existing contacts.
    return respond(wantsHtml, 200, GENERIC_SUCCESS, guideSlug);
  } catch (error) {
    console.error('[restock-notify] Unexpected error:', error);
    return respond(
      wantsHtml,
      500,
      'Something went wrong on our end. Please try again in a moment.',
      guideSlug
    );
  }
}
