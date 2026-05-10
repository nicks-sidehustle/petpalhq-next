#!/usr/bin/env node

/**
 * generate-image.mjs — OpenAI gpt-image-1 image generator
 *
 * Usage:
 *   node scripts/image-gen/generate-image.mjs \
 *     --prompt "A labrador on a backyard patio at golden hour" \
 *     --output public/images/guides/best-summer-pet-bbq-yard-essentials-2026.png \
 *     [--model gpt-image-1] \
 *     [--size 1536x1024] \
 *     [--quality high] \
 *     [--format png] \
 *     [--background opaque]
 *
 * Environment: OPENAI_API_KEY (reads from .env.local if present)
 *
 * Note: low-level generator. For hero images on PetPalHQ guides, use the
 * higher-level wrapper `gen-hero.mjs` which auto-builds the prompt from
 * guide frontmatter + applies the universal PetPalHQ style suffix.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/image-gen/<file> -> 2 levels up = project root
const projectRoot = path.resolve(__dirname, '../../');

// Load .env.local
function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

// Parse CLI args
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

const DEFAULTS = {
  model: 'gpt-image-2',
  size: '1024x1024',
  quality: 'medium',
  format: 'png',
  background: 'opaque',
  n: '1',
};

const config = {
  prompt: args.prompt,
  model: args.model || DEFAULTS.model,
  size: args.size || DEFAULTS.size,
  quality: args.quality || DEFAULTS.quality,
  outputFormat: args.format || DEFAULTS.format,
  background: args.background || DEFAULTS.background,
  n: parseInt(args.n || DEFAULTS.n, 10),
  output: args.output,
};

if (!config.prompt) {
  console.error('Error: --prompt is required');
  console.error('Usage: node generate-image.mjs --prompt "..." --output path/to/file.png');
  process.exit(1);
}

if (!config.output) {
  console.error('Error: --output is required');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY not set (checked process.env and .env.local)');
  process.exit(1);
}

// Pricing lookup (USD per image) — gpt-image-2 assumed at same tier as
// gpt-image-1 until OpenAI publishes a separate gpt-image-2 price card.
const PRICING_TIER = {
  'low-1024x1024': 0.011, 'low-1024x1536': 0.016, 'low-1536x1024': 0.016,
  'medium-1024x1024': 0.042, 'medium-1024x1536': 0.063, 'medium-1536x1024': 0.063,
  'high-1024x1024': 0.167, 'high-1024x1536': 0.250, 'high-1536x1024': 0.250,
};
const PRICING = {
  'gpt-image-1': PRICING_TIER,
  'gpt-image-1.5': PRICING_TIER,
  'gpt-image-2': PRICING_TIER,
};

function estimateCost() {
  const table = PRICING[config.model] || PRICING_TIER;
  const key = `${config.quality}-${config.size}`;
  return (table[key] || 0.042) * config.n;
}

async function generate() {
  const startTime = Date.now();
  const cost = estimateCost();
  console.log(`Model:   ${config.model}`);
  console.log(`Size:    ${config.size}`);
  console.log(`Quality: ${config.quality}`);
  console.log(`Format:  ${config.outputFormat}`);
  console.log(`Cost:    ~$${cost.toFixed(3)}`);
  console.log(`Prompt:  ${config.prompt.slice(0, 120)}${config.prompt.length > 120 ? '...' : ''}`);
  console.log('');

  const body = {
    model: config.model,
    prompt: config.prompt,
    n: config.n,
    size: config.size,
    quality: config.quality,
    output_format: config.outputFormat,
    background: config.background,
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`API error (${res.status}):`, err);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (data.usage) {
    console.log(`Tokens:  ${data.usage.input_tokens} in / ${data.usage.output_tokens} out`);
  }

  // Save each image
  const images = data.data || [];
  for (let i = 0; i < images.length; i++) {
    const b64 = images[i].b64_json;
    if (!b64) {
      console.error(`Image ${i}: no b64_json in response`);
      continue;
    }

    const buf = Buffer.from(b64, 'base64');
    let outPath = config.output;

    // If generating multiple, append index
    if (images.length > 1) {
      const ext = path.extname(outPath);
      const base = outPath.slice(0, -ext.length);
      outPath = `${base}-${i + 1}${ext}`;
    }

    // Ensure directory exists
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outPath, buf);
    const sizeKB = (buf.length / 1024).toFixed(0);
    console.log(`Saved:   ${outPath} (${sizeKB} KB)`);
  }

  console.log(`Time:    ${elapsed}s`);
  console.log(`Cost:    $${cost.toFixed(3)}`);
}

generate().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
