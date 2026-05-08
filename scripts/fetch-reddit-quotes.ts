#!/usr/bin/env node

/**
 * fetch-reddit-quotes.ts
 *
 * SANCTIONED QUOTE PIPELINE — this script is the ONLY approved way to
 * populate ownerVoice quotes in guide frontmatter.
 *
 * Hard rule: ownerVoice[].quote fields must be verbatim text from real
 * forum threads. Never generate, paraphrase, or infer quotes.
 * Workflow: owner runs this script during research → reviews output →
 * pastes verbatim YAML into pick frontmatter.
 *
 * Usage:
 *   npx tsx scripts/fetch-reddit-quotes.ts <thread-url>
 *   npx tsx scripts/fetch-reddit-quotes.ts <thread-url> --keep-authors
 *
 * Options:
 *   --keep-authors   Preserve real Reddit usernames (default: replace with "community member")
 *
 * Output: YAML block ready to paste into a pick's ownerVoice: frontmatter key.
 *   The "# score: N" annotation is a reference comment for the owner to use
 *   when filtering — it does NOT go into the final frontmatter.
 *
 * Rate limit: anonymous JSON endpoint, ~60 req/min limit.
 *   Single-threaded; 1100ms sleep between requests if called in a loop.
 */

const USER_AGENT = 'PetPalHQ-research/1.0 (research synthesis; contact: nick@petpalhq.com)';
const MIN_SCORE = 5;
const TOP_N = 10;

interface RedditComment {
  score: number;
  author: string;
  body: string;
  id: string;
  createdUtc: number; // Unix timestamp from Reddit's created_utc field
}

interface RedditListing {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: Record<string, unknown>;
    }>;
  };
}

function parseArgs(): { threadUrl: string; keepAuthors: boolean } {
  const args = process.argv.slice(2);
  const keepAuthors = args.includes('--keep-authors');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (!positional.length) {
    console.error('Usage: npx tsx scripts/fetch-reddit-quotes.ts <thread-url> [--keep-authors]');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/fetch-reddit-quotes.ts https://www.reddit.com/r/dogs/comments/abc123/some_thread/');
    process.exit(1);
  }

  return { threadUrl: positional[0], keepAuthors };
}

function normalizeRedditUrl(url: string): string {
  // Strip query params + trailing slash + .json if already present
  let normalized = url.split('?')[0].replace(/\/+$/, '').replace(/\.json$/, '');
  // Ensure it's a reddit.com URL
  if (!normalized.match(/^https?:\/\/(www\.)?reddit\.com\//)) {
    throw new Error(`Not a Reddit URL: ${url}`);
  }
  return normalized + '.json';
}

async function fetchThread(jsonUrl: string): Promise<RedditListing[]> {
  const res = await fetch(jsonUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit fetch failed ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected Reddit API response shape (expected array)');
  }
  return data as RedditListing[];
}

function extractTopLevelComments(listings: RedditListing[]): RedditComment[] {
  // Reddit thread JSON: [postListing, commentsListing]
  const commentsListing = listings[1];
  if (!commentsListing?.data?.children) {
    throw new Error('Could not find comments listing in Reddit response');
  }

  const comments: RedditComment[] = [];

  for (const child of commentsListing.data.children) {
    if (child.kind !== 't1') continue; // t1 = comment

    const d = child.data as {
      score?: number;
      author?: string;
      body?: string;
      id?: string;
      created_utc?: number;
    };

    const score = typeof d.score === 'number' ? d.score : 0;
    const author = typeof d.author === 'string' ? d.author : '[deleted]';
    const body = typeof d.body === 'string' ? d.body : '';
    const id = typeof d.id === 'string' ? d.id : '';
    const createdUtc = typeof d.created_utc === 'number' ? d.created_utc : 0;

    // Skip: deleted/removed comments, AutoModerator, low-score posts
    if (!body || body === '[deleted]' || body === '[removed]') continue;
    if (author === '[deleted]' || author === 'AutoModerator') continue;
    if (score < MIN_SCORE) continue;

    comments.push({ score, author, body, id, createdUtc });
  }

  // Sort by score descending, take top N
  return comments.sort((a, b) => b.score - a.score).slice(0, TOP_N);
}

function deriveSourceLabel(url: string): string {
  // Extract subreddit from URL: /r/dogs/comments/...  → r/dogs
  const match = url.match(/reddit\.com\/r\/([^/]+)\//);
  return match ? `r/${match[1]}` : 'Reddit';
}

function derivePermalink(threadUrl: string, commentId: string): string {
  // Reddit canonical comment URL: <thread-url>/<comment-id>/
  // Strip .json + any trailing slash, then re-add the slash + comment id + trailing slash.
  const base = threadUrl.replace(/\.json$/, '').replace(/\/+$/, '');
  return `${base}/${commentId}/`;
}

function escapeYamlString(s: string): string {
  // Use double-quoted YAML string, escape backslashes and double-quotes
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatYamlBlock(
  comments: RedditComment[],
  threadUrl: string,
  sourceLabel: string,
  keepAuthors: boolean,
): string {
  if (!comments.length) {
    return '# No qualifying comments found (score >= 5, not deleted, not AutoModerator)';
  }

  const lines: string[] = [
    `# ownerVoice quotes from ${sourceLabel}`,
    `# Source thread: ${threadUrl.replace(/\.json$/, '')}`,
    `# Fetched: ${new Date().toISOString().split('T')[0]}`,
    `# Review each entry before pasting into frontmatter.`,
    `# Remove the "# score:" annotation lines — they are for reference only.`,
    '',
    'ownerVoice:',
  ];

  for (const c of comments) {
    const author = keepAuthors ? `u/${c.author}` : 'community member';
    const permalink = derivePermalink(threadUrl, c.id);
    // Use actual comment post date from created_utc; fall back to fetch date only if missing
    const date =
      c.createdUtc > 0
        ? new Date(c.createdUtc * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
    const quoteEscaped = escapeYamlString(c.body.trim());

    lines.push(`  - quote: "${quoteEscaped}"`);
    lines.push(`    sourceLabel: "${sourceLabel}"`);
    lines.push(`    sourceUrl: "${permalink}"`);
    lines.push(`    author: "${author}"`);
    lines.push(`    date: "${date}"`);
    lines.push(`    # score: ${c.score}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const { threadUrl, keepAuthors } = parseArgs();

  console.error(`Fetching Reddit thread: ${threadUrl}`);
  console.error(`User-Agent: ${USER_AGENT}`);
  if (!keepAuthors) {
    console.error('Authors: anonymized (use --keep-authors to preserve usernames)');
  }
  console.error('');

  const jsonUrl = normalizeRedditUrl(threadUrl);
  const listings = await fetchThread(jsonUrl);

  const comments = extractTopLevelComments(listings);
  console.error(`Found ${comments.length} qualifying top-level comments (score >= ${MIN_SCORE}).`);
  console.error('');

  const sourceLabel = deriveSourceLabel(threadUrl);
  const output = formatYamlBlock(comments, jsonUrl, sourceLabel, keepAuthors);

  // stdout = YAML output (for paste into frontmatter)
  // stderr = status messages
  console.log(output);
}

main().catch((err: Error) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
