// Beat-based structure shared with music/make_music.py (keep the two in sync).
export const FPS = 30;
export const BEATS = {hook: 4, item: 5, predrop: 2, top: 6, end: 5};

export type Section = {kind: 'hook' | 'item' | 'predrop' | 'top' | 'end'; startBeat: number; beats: number; index?: number};

export const buildTimeline = (itemCount: number): Section[] => {
  const out: Section[] = [];
  let b = 0;
  const push = (kind: Section['kind'], beats: number, index?: number) => { out.push({kind, startBeat: b, beats, index}); b += beats; };
  push('hook', BEATS.hook);
  for (let i = 0; i < itemCount - 1; i++) push('item', BEATS.item, i);
  push('predrop', BEATS.predrop);
  push('top', BEATS.top, itemCount - 1);
  push('end', BEATS.end);
  return out;
};

export const totalBeats = (itemCount: number) => buildTimeline(itemCount).reduce((a, s) => a + s.beats, 0);
export const beatFrames = (bpm: number) => (60 / bpm) * FPS;
export const totalFrames = (itemCount: number, bpm: number) => Math.ceil(totalBeats(itemCount) * beatFrames(bpm)) + 6;
