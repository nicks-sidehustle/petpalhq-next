#!/usr/bin/env node

/**
 * gen-hero.mjs — Hero image generator for PetPalHQ guides
 *
 * Wraps generate-image.mjs. Reads the guide's frontmatter (title, excerpt,
 * category, picks) and constructs a prompt using:
 *   1. The "ANIMAL action first" rule (per project_petpal_image_audit_2026-05-07 memory)
 *   2. The universal PetPalHQ style suffix
 *   3. Rotating breed selection to maintain animal diversity
 *
 * Usage:
 *   node scripts/image-gen/gen-hero.mjs --slug best-summer-pet-bbq-yard-essentials-2026
 *   node scripts/image-gen/gen-hero.mjs --slug <slug> --breed labrador --quality medium
 *   node scripts/image-gen/gen-hero.mjs --slug <slug> --dry-run    # prints prompt, skips API
 *
 * Defaults: quality=high, size=1536x1024 (16:9 hero aspect), format=png.
 * Cost (gpt-image-1, high quality, 1536x1024): ~$0.25/image.
 *
 * Hard rule: each spoke MUST keep its own unique hero. Don't share heroes
 * across spokes (per memory).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

// ─── CLI args ────────────────────────────────────────────────────────────────

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

if (!args.slug) {
  console.error('Error: --slug is required');
  console.error('Usage: node scripts/image-gen/gen-hero.mjs --slug <slug>');
  process.exit(1);
}

const slug = args.slug;
const guidePath = path.join(projectRoot, 'src/content/guides', `${slug}.md`);
if (!fs.existsSync(guidePath)) {
  console.error(`Error: guide file not found at ${guidePath}`);
  process.exit(1);
}

const { data: frontmatter } = matter(fs.readFileSync(guidePath, 'utf-8'));

// ─── Breed rotation (from memory: project_petpal_image_audit_2026-05-07) ─────

const DOG_BREEDS = [
  'labrador retriever', 'mixed-breed rescue dog', 'beagle', 'doodle',
  'French bulldog', 'boxer', 'German shepherd', 'miniature poodle',
  'vizsla', 'husky', 'corgi', 'dachshund', 'bichon frise', 'pointer',
];

const CAT_BREEDS = [
  'orange tabby cat', 'ragdoll cat', 'black domestic shorthair cat',
  'calico cat', 'siamese mix cat', 'maine coon cat', 'grey tabby cat',
];

function pickBreed(species, slugForSeed) {
  if (args.breed) return args.breed;
  const list = species === 'cat' ? CAT_BREEDS : DOG_BREEDS;
  // Deterministic by slug — same slug always picks same breed; re-runs are reproducible
  let hash = 0;
  for (const c of slugForSeed) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return list[Math.abs(hash) % list.length];
}

// ─── Style suffix (per memory) ───────────────────────────────────────────────

const STYLE_SUFFIX = [
  'Photorealistic lifestyle editorial photography, NOT cartoon, NOT illustrated, NOT vector.',
  'Subject sharp, background softly blurred.',
  'Modern American home aesthetic — neutral palette (cream / oat / sage),',
  'wide-plank hardwood floors where indoor, indoor plants, natural window light,',
  'soft afternoon sun, shallow depth of field (f/2.8), warm cinematic color grade,',
  'professional product placement, magazine-quality composition, 16:9 landscape,',
  'no text, no logos, no watermark.',
].join(' ');

// ─── Scene template selection ────────────────────────────────────────────────
//
// Heuristic prompt-building. Reads guide category + slug keywords to pick a
// scene template. Override with --scene "..." if needed for a specific guide.

function inferScene(slugStr) {
  const slugLower = slugStr.toLowerCase();

  if (/bbq|yard|pool|swim|outdoor|hiking|camping|summer/.test(slugLower)) {
    return {
      setting: 'sunlit backyard patio scene at late afternoon golden hour, wide deck boards, woven outdoor rugs, terra cotta planters with rosemary and lavender, soft string lights at the periphery',
      mood: 'relaxed, warm, host-ready summer atmosphere',
    };
  }
  if (/mothers-day|fathers-day|thanksgiving|gifts/.test(slugLower)) {
    return {
      setting: 'a clean modern kitchen island with a wrapped gift box and seasonal flowers, late morning natural window light, marble countertop, neutral cabinetry',
      mood: 'warm, intimate, sentimental holiday feel',
    };
  }
  if (/anxiety|enrichment|behavior|training|separation|calming/.test(slugLower)) {
    return {
      setting: 'cozy living-room corner with a low-pile rug, woven basket of toys, sunlit window, neutral palette furniture',
      mood: 'calm, grounded, supportive at-home environment',
    };
  }
  if (/grooming|dental|brush|nail|shed|shampoo|ear-cleaner/.test(slugLower)) {
    return {
      setting: 'clean bathroom or grooming-corner scene with a folded towel, a wooden grooming brush, and soft daylight',
      mood: 'tidy, calm, post-bath atmosphere',
    };
  }
  if (/orthopedic|bed|ramp|stair|wheelchair|mobility|lift-harness|senior/.test(slugLower)) {
    return {
      setting: 'soft-lit bedroom corner with a memory-foam pet bed, indoor plants, and a sunlit window',
      mood: 'restful, gentle, senior-care comfort',
    };
  }
  if (/food|feeder|fountain|nutrition|probiotic|supplement|weight|sensitive-stomach|meal-topper|slow-feeder/.test(slugLower)) {
    return {
      setting: 'kitchen counter or dining-corner scene with a ceramic pet bowl and natural daylight on a hardwood floor',
      mood: 'clean, fresh, mealtime calm',
    };
  }
  if (/camera|smart|automatic|tech|gps/.test(slugLower)) {
    return {
      setting: 'modern living-room corner with a smart device on a wooden side table, neutral upholstery, and afternoon light',
      mood: 'tech-forward but warm, lived-in home',
    };
  }
  if (/reptile|pvc|bioactive|uvb|heat-panel|misting|fogging/.test(slugLower)) {
    return {
      setting: 'a PVC bioactive reptile enclosure on a clean shelf, soft front lighting, naturalistic substrate visible, in a modern home setting',
      mood: 'precise, naturalistic, hobbyist-quality',
    };
  }
  if (/aquarium|filter|water-test|chiller|led-lighting/.test(slugLower)) {
    return {
      setting: 'a well-maintained planted aquarium tank in a modern living room, soft tank lighting visible, neutral palette furniture nearby',
      mood: 'serene, professional aquarist atmosphere',
    };
  }
  if (/bird-feeder|parrot|bird/.test(slugLower)) {
    return {
      setting: 'a backyard bird-watching scene through a window, modern interior in foreground, garden in soft background',
      mood: 'observational, peaceful birdwatcher mood',
    };
  }
  return {
    setting: 'modern American living room with neutral palette, wide-plank hardwood floor, indoor plants, soft afternoon light',
    mood: 'warm, lived-in, magazine-quality',
  };
}

// ─── Species detection ───────────────────────────────────────────────────────

function detectSpecies(fm, slugStr) {
  const fmSpecies = Array.isArray(fm.species) ? fm.species : [];
  if (fmSpecies.includes('cat') && !fmSpecies.includes('dog')) return 'cat';
  if (fmSpecies.includes('dog') && !fmSpecies.includes('cat')) return 'dog';

  const slugLower = slugStr.toLowerCase();
  if (/(^|-)cat(-|$)|kitten|feline|litter-box|cat-pheromone|cat-water/.test(slugLower)) return 'cat';
  if (/reptile|gecko|snake|bearded-dragon|tortoise/.test(slugLower)) return 'reptile';
  if (/aquarium|fish/.test(slugLower)) return 'fish';
  if (/bird|parrot|cockatiel/.test(slugLower)) return 'bird';
  return 'dog';
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt() {
  const species = detectSpecies(frontmatter, slug);
  const breed = species === 'cat' ? pickBreed('cat', slug) :
                species === 'dog' ? pickBreed('dog', slug) : null;
  const scene = args.scene
    ? { setting: args.scene, mood: 'as-specified' }
    : inferScene(slug);

  let animalAction;
  if (species === 'reptile' || species === 'fish' || species === 'bird') {
    animalAction = `A photorealistic editorial scene of ${scene.setting}.`;
  } else {
    const action = species === 'cat'
      ? 'sitting alert in afternoon light'
      : 'resting comfortably in afternoon light';
    animalAction = `A relaxed ${breed} ${action}, in ${scene.setting}.`;
  }

  const picks = Array.isArray(frontmatter.picks) ? frontmatter.picks.slice(0, 3) : [];
  const pickVisuals = picks
    .map(p => p.label || p.name || '')
    .filter(Boolean)
    .map(s => s.toLowerCase().replace(/best |[^a-z\s]/g, '').trim())
    .filter(s => s.length > 3 && s.length < 60)
    .slice(0, 3);

  const pickContext = pickVisuals.length
    ? `Subtle product visuals in the scene: ${pickVisuals.join(', ')}.`
    : '';

  const moodLine = `${scene.mood.charAt(0).toUpperCase()}${scene.mood.slice(1)}.`;

  return [animalAction, pickContext, moodLine, STYLE_SUFFIX]
    .filter(Boolean)
    .join(' ');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const prompt = buildPrompt();
const outputPath = path.join('public/images/guides', `${slug}.png`);
const fullOutputPath = path.join(projectRoot, outputPath);

console.log('═══════════════════════════════════════════════════════════');
console.log(`Hero image generator for: ${slug}`);
console.log('═══════════════════════════════════════════════════════════');
console.log(`Output: ${outputPath}`);
console.log('');
console.log('Prompt:');
console.log(prompt);
console.log('');

if (args['dry-run']) {
  console.log('[dry-run] Skipping API call.');
  process.exit(0);
}

if (fs.existsSync(fullOutputPath) && !args.force) {
  console.error(`Error: ${outputPath} already exists. Use --force to overwrite.`);
  process.exit(1);
}

const quality = args.quality || 'high';
const size = args.size || '1536x1024';

const generateImageScript = path.join(__dirname, 'generate-image.mjs');
const childArgs = [
  generateImageScript,
  '--prompt', prompt,
  '--output', fullOutputPath,
  '--size', size,
  '--quality', quality,
  '--format', 'png',
];

console.log('Invoking generate-image.mjs...');
console.log('');

const result = spawnSync('node', childArgs, { stdio: 'inherit', cwd: projectRoot });

if (result.status !== 0) {
  console.error('Generation failed.');
  process.exit(result.status || 1);
}

console.log('');
console.log(`✓ Hero image saved: ${outputPath}`);
