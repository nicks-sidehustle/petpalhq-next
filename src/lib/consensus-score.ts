import type { Verdict } from './content/consensus-data';

/**
 * Maps a PetPal Score (0–10) to its verdict label.
 * Thresholds match the methodology page and CLAUDE.md.
 */
export function getVerdict(score: number): Verdict {
  if (score >= 9.0) return 'Must Buy';
  if (score >= 8.0) return 'Recommended';
  if (score >= 7.5) return 'Good Value';
  if (score >= 6.0) return 'Mixed';
  return 'Skip';
}

/**
 * Returns Tailwind classes for a verdict badge.
 */
export function getVerdictColor(verdict: Verdict): string {
  switch (verdict) {
    case 'Must Buy':
      return 'bg-green-100 text-green-800';
    case 'Recommended':
      return 'bg-blue-100 text-blue-800';
    case 'Good Value':
      return 'bg-amber-100 text-amber-800';
    case 'Mixed':
      return 'bg-orange-100 text-orange-800';
    case 'Skip':
      return 'bg-gray-100 text-gray-700';
  }
}
