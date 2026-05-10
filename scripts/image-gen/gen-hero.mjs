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

  if (/bbq|yard|summer-pet-bbq/.test(slugLower)) {
    return {
      setting: 'a sunlit modern American backyard patio at late afternoon golden hour. Stone or wood-plank patio surface with: a low elevated mesh pet cot under a small patio umbrella, an outdoor pet water station with a stainless steel bowl on a wooden stand, a wicker basket of pet toys (orange rope toy, soft squeaker, knotted ball), and an outdoor wicker sofa with cushioned pillows. Background: a stainless steel BBQ grill at right edge, garden with flowering perennials, a wrought-iron pet safety gate separating patio from lawn, white picket fence, mature trees with sun setting through them',
      mood: 'relaxed, host-ready summer atmosphere with multi-pet life',
      multiPet: true,
    };
  }
  if (/pool|swim/.test(slugLower)) {
    return {
      setting: 'a sunlit backyard with an above-ground or low-edge pool, a non-slip exit ramp at the pool edge, a cooling mat and folded beach towel poolside, an outdoor shade tent or umbrella nearby, garden plants framing the scene, golden hour light reflecting on water',
      mood: 'energetic, water-day summer atmosphere',
      multiPet: false,
    };
  }
  if (/hiking|camping|outdoor-adventure/.test(slugLower)) {
    return {
      setting: 'a trailhead clearing or forest campsite at golden hour, with a pet hiking pack, a mesh camping cot, and a small pet sleep bag visible, pine trees and dappled light around',
      mood: 'wild, adventure-ready outdoor mood',
      multiPet: false,
    };
  }
  if (/mothers-day|fathers-day|thanksgiving|gifts/.test(slugLower)) {
    return {
      setting: 'a clean modern kitchen island at late morning with a wrapped gift box and seasonal flowers (peonies or chrysanthemums), marble countertop, neutral cabinetry, a wooden tray with two ceramic pet bowls and a folded gift card, natural window light',
      mood: 'warm, intimate, sentimental holiday feel',
      multiPet: true,
    };
  }
  if (/4th-of-july|fireworks|patriotic/.test(slugLower)) {
    return {
      setting: 'a cozy indoor calm-zone scene during early evening — a soft-cushioned sofa with a folded red-white-blue throw blanket, a small American flag on a side table, a Bluetooth pet calming speaker on a low shelf with a soft amber LED, a closed window with sheer curtains drawn (muting the fading dusk light outside), a wooden table holding a GPS smart-collar charging cable, a comfortable pet bed in the corner. The dog is wearing a reflective no-pull harness with a visible GPS collar tag. Warm interior lamp light, hint of fireworks visible as soft distant glow through the curtained window',
      mood: 'protective, calm-zone sanctuary, pre-fireworks readiness',
      multiPet: false,
    };
  }
  if (/anxiety|enrichment|behavior|training|separation|calming/.test(slugLower)) {
    return {
      setting: 'a cozy living-room corner with a low-pile rug, a woven basket of pet enrichment toys (puzzle feeder, lick mat, soft chew), an open pet camera on a wooden side table, a calming pheromone diffuser plugged into the wall, a sunlit window with soft curtains, neutral palette furniture',
      mood: 'calm, grounded, supportive at-home environment',
      multiPet: false,
    };
  }
  if (/grooming|dental|brush|nail|shed|shampoo|ear-cleaner/.test(slugLower)) {
    return {
      setting: 'a clean grooming corner with a folded white towel, a wooden grooming brush, a small ceramic dish, and pet-safe shampoo bottle on a tile counter, a low grooming mat on the floor, soft daylight from a side window',
      mood: 'tidy, calm, post-bath atmosphere',
      multiPet: false,
    };
  }
  if (/orthopedic|bed|ramp|stair|wheelchair|mobility|lift-harness|senior/.test(slugLower)) {
    return {
      setting: 'a soft-lit bedroom corner with a thick memory-foam orthopedic pet bed, a portable pet ramp leaning against the bed frame, indoor plants on a wooden side table, a sunlit window with sheer curtains',
      mood: 'restful, gentle, senior-care comfort',
      multiPet: false,
    };
  }
  if (/food|feeder|fountain|nutrition|probiotic|supplement|weight|sensitive-stomach|meal-topper|slow-feeder/.test(slugLower)) {
    return {
      setting: 'a kitchen counter or dining-corner scene with a ceramic pet feeding station (slow-feeder bowl + water fountain), a small bag of premium kibble on the counter, natural daylight on wide-plank hardwood floors, neutral palette cabinetry',
      mood: 'clean, fresh, mealtime calm',
      multiPet: true,
    };
  }
  if (/camera|smart|automatic|tech|gps/.test(slugLower)) {
    return {
      setting: 'a modern living-room corner with a smart pet camera on a wooden side table, a tablet showing the camera feed on the coffee table, a treat-toss compatible food bowl on the floor, neutral upholstery, afternoon light from a tall window',
      mood: 'tech-forward but warm, lived-in home',
      multiPet: false,
    };
  }
  if (/reptile|pvc|bioactive|uvb|heat-panel|misting|fogging/.test(slugLower)) {
    return {
      setting: 'a PVC bioactive reptile enclosure on a clean modern shelf, soft front-mounted lighting visible, naturalistic substrate and live plants inside, a thermostat display on the front, a misting nozzle visible at top, hobbyist tools (tongs, thermometer) on a side shelf',
      mood: 'precise, naturalistic, hobbyist-quality',
      multiPet: false,
    };
  }
  if (/aquarium|filter|water-test|chiller|led-lighting/.test(slugLower)) {
    return {
      setting: 'a well-maintained planted freshwater aquarium tank in a modern living room, programmable LED lighting glowing soft blue-white, a canister filter intake visible in the corner, neutral palette furniture (oak console) framing the tank, evening ambient light',
      mood: 'serene, professional aquarist atmosphere',
      multiPet: false,
    };
  }
  if (/bird-feeder|parrot|bird/.test(slugLower)) {
    return {
      setting: 'a backyard bird-watching scene through a wide window, a smart bird feeder mounted outside, modern interior in foreground with a wooden side table and a pair of binoculars, garden in soft golden-hour background',
      mood: 'observational, peaceful birdwatcher mood',
      multiPet: false,
    };
  }
  if (/litter|odor-remover/.test(slugLower)) {
    return {
      setting: 'a discreet utility-room or laundry corner with an automatic self-cleaning litter box on tile flooring, a small storage bin of litter, an odor-control air purifier nearby, neutral palette walls, soft overhead light',
      mood: 'clean, low-fuss, modern cat household',
      multiPet: false,
    };
  }
  return {
    setting: 'a modern American living room with neutral palette walls (cream / oat), wide-plank hardwood floor, indoor plants on a wooden side table, a soft-cushioned sofa, soft afternoon light from a tall window',
    mood: 'warm, lived-in, magazine-quality',
    multiPet: false,
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
  } else if (scene.multiPet && species === 'dog') {
    // Multi-pet scene: dog as the primary subject + a cat as background secondary
    const catBreed = pickBreed('cat', slug + '-second');
    animalAction = `A relaxed ${breed} lying comfortably in the foreground with a soft happy expression, tongue slightly out, ears relaxed. A ${catBreed} sitting alertly about eight feet behind, watching calmly. The scene: ${scene.setting}.`;
  } else if (scene.multiPet && species === 'cat') {
    // Multi-pet scene led by cat
    const dogBreed = pickBreed('dog', slug + '-second');
    animalAction = `A relaxed ${breed} sitting alertly in the foreground in soft light. A ${dogBreed} resting in the background. The scene: ${scene.setting}.`;
  } else {
    const action = species === 'cat'
      ? 'sitting alert in afternoon light'
      : 'resting comfortably with a soft happy expression, tongue slightly out, ears relaxed';
    animalAction = `A relaxed ${breed} ${action}. The scene: ${scene.setting}.`;
  }

  const moodLine = `${scene.mood.charAt(0).toUpperCase()}${scene.mood.slice(1)}.`;

  // Note: we no longer derive pickContext from pick labels — the scene
  // template now carries the rich visual elements directly. Pick labels are
  // too abstract ("BEST OVERALL", "BEST SHADE") to translate to visuals.

  return [animalAction, moodLine, STYLE_SUFFIX]
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

const quality = args.quality || 'medium';
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
