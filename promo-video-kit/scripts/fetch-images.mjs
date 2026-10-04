// Download remote product images listed in a promo data file into public/cache/.
// usage: node scripts/fetch-images.mjs data/pet.json
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/fetch-images.mjs <data.json>'); process.exit(1); }
const data = JSON.parse(readFileSync(file, 'utf8'));
const urls = [data.hook.image, ...data.items.map((i) => i.image)].filter((u) => /^https?:\/\//.test(u));
mkdirSync('public/cache', {recursive: true});
for (const url of urls) {
  const out = `public/cache/${decodeURIComponent(url.split('/').pop())}`;
  if (existsSync(out)) { console.log('cached', out); continue; }
  execFileSync('curl', ['-sSfL', url, '-o', out]);
  console.log('saved ', out);
}
