#!/usr/bin/env node
/**
 * gen-hero-stability.mjs — PROVISIONAL hero generator via Stability AI.
 *
 * The standing provisional hero path (batch-22 precedent) while the OpenAI
 * gpt-image API is billing-blocked. Generates a HUMAN-FREE, text-free, on-slug
 * 16:9 hero via Stability v2beta stable-image/generate/core and writes it to
 * public/images/guides/{slug}.png. The ChatGPT-UI quality swap rides the Monday
 * ~80-hero batch; this flips hero_status PENDING -> provisional and satisfies
 * the check:metrics non-zero-PNG hard gate.
 *
 * Usage:
 *   source ~/.env   # provides STABILITY_API_KEY
 *   node scripts/image-gen/gen-hero-stability.mjs --slug <slug> --prompt "<scene>"
 *   node scripts/image-gen/gen-hero-stability.mjs --slug <slug> --prompt "<scene>" --force
 *
 * Every generated image MUST be Read-verified by the caller (reject pseudo-text,
 * anatomy artifacts, any human/hand/face/silhouette -> regenerate).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.slug || !args.prompt) {
  console.error('Error: --slug and --prompt are required');
  process.exit(1);
}

const apiKey = process.env.STABILITY_API_KEY;
if (!apiKey) {
  console.error('Error: STABILITY_API_KEY not set (run: source ~/.env)');
  process.exit(1);
}

// Universal human-free / editorial style clause appended to every prompt.
const STYLE = 'Photorealistic lifestyle editorial photography, modern American home aesthetic, neutral palette, natural window light, shallow depth of field, magazine-quality composition, 16:9 landscape. No text, no words, no letters, no labels, no logos, no watermark. Absolutely no people, no humans, no human hands, no fingers, no arms, no faces, no silhouettes anywhere in the frame.';

const NEGATIVE = 'people, human, person, man, woman, child, hand, hands, fingers, arm, arms, face, silhouette, text, words, letters, typography, label, caption, logo, watermark, signature, brand name, deformed, extra limbs, blurry text, gibberish text';

const prompt = `${args.prompt} ${STYLE}`;
const outputPath = path.join(projectRoot, 'public/images/guides', `${args.slug}.png`);

if (fs.existsSync(outputPath) && !args.force) {
  console.error(`Error: ${outputPath} exists. Use --force to overwrite.`);
  process.exit(1);
}

const form = new FormData();
form.append('prompt', prompt);
form.append('negative_prompt', NEGATIVE);
form.append('aspect_ratio', '16:9');
form.append('output_format', 'png');

const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'image/*' },
  body: form,
});

if (!res.ok) {
  console.error(`Stability API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(outputPath, buf);
console.log(`OK ${outputPath} (${buf.length} bytes)`);
