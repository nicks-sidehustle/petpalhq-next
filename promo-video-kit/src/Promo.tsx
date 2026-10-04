import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Audio} from '@remotion/media';
import {THEMES, Theme, FONT_CSS, BrandId} from './brands';
import {buildTimeline, beatFrames} from './timeline';

export type Item = {rank: number; name: string; badge: string; score: number; line: string; meta?: string; price?: string; priceChecked?: string; image: string};
export type PromoProps = {
  brand: BrandId; bpm: number; today: string;
  hook: {kicker: string; line1: string; line2: string; sub: string; image: string};
  scoreLabel: string; scoreMax: number; scoreStyle?: 'bar' | 'stars';
  items: Item[]; predrop: string;
  end: {url: string; cta: string; method: string; disclosure: string};
  music?: string; priceMaxAgeDays?: number;
};

// Remote product photos are downloaded first by scripts/fetch-images.mjs into public/cache/ (gitignored).
const src = (path: string) => staticFile(/^https?:\/\//.test(path) ? `cache/${decodeURIComponent(path.split('/').pop()!)}` : path);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const Ctx = React.createContext<{t: Theme; B: number; p: PromoProps}>(null as never);
const useCtx = () => React.useContext(Ctx);

const daysBetween = (a: string, b: string) => Math.abs((Date.parse(b) - Date.parse(a)) / 86400000);
const shortDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});

// ---------- backgrounds and motifs ----------
const Grain: React.FC<{opacity: number}> = ({opacity}) => {
  const f = useCurrentFrame();
  return (
    <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay'}}>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 6} /></filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  );
};

const Snow: React.FC<{count?: number; color?: string}> = ({count = 70, color = '#fdf8f0'}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({length: count}, (_, i) => {
        const x0 = random(`sx${i}`) * 1080, y0 = random(`sy${i}`) * 1920, sp = 1.2 + random(`sv${i}`) * 2.8, r = 3 + random(`sr${i}`) * 7;
        const y = (y0 + f * sp) % 1980 - 30;
        const x = x0 + Math.sin(f / 30 + i) * 18;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: '50%', background: color, opacity: 0.35 + random(`so${i}`) * 0.5}} />;
      })}
    </AbsoluteFill>
  );
};

const Paw: React.FC<{color: string; size: number; style?: React.CSSProperties}> = ({color, size, style}) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={style}>
    <g fill={color}><ellipse cx="32" cy="42" rx="14" ry="12" /><ellipse cx="14" cy="26" rx="6" ry="8" /><ellipse cx="26" cy="16" rx="6" ry="8" /><ellipse cx="38" cy="16" rx="6" ry="8" /><ellipse cx="50" cy="26" rx="6" ry="8" /></g>
  </svg>
);

const Backdrop: React.FC = () => {
  const {t} = useCtx();
  const f = useCurrentFrame();
  if (t.id === 'desk') {
    const gx = 540 + Math.sin(f / 70) * 160;
    return (
      <AbsoluteFill style={{background: t.bg}}>
        <AbsoluteFill style={{background: `radial-gradient(900px 700px at ${gx}px 380px, rgba(245,158,11,0.28), rgba(26,18,9,0) 70%)`}} />
        <AbsoluteFill style={{background: `linear-gradient(115deg, rgba(0,0,0,0) ${30 + ((f * 0.6) % 120)}%, rgba(252,211,77,0.07) ${36 + ((f * 0.6) % 120)}%, rgba(0,0,0,0) ${42 + ((f * 0.6) % 120)}%)`}} />
        <Grain opacity={0.18} />
      </AbsoluteFill>
    );
  }
  if (t.id === 'xmas') {
    return (
      <AbsoluteFill style={{background: `radial-gradient(1200px 1400px at 50% 30%, ${t.bg} 0%, ${t.bg2} 100%)`}}>
        <AbsoluteFill style={{boxShadow: 'inset 0 0 220px rgba(201,162,39,0.25)'}} />
        <Snow />
      </AbsoluteFill>
    );
  }
  if (t.id === 'pet') {
    const off = (f * 1.2) % 240;
    return (
      <AbsoluteFill style={{background: t.bg}}>
        {Array.from({length: 7 * 10}, (_, i) => {
          const c = i % 7, r = Math.floor(i / 7);
          return <Paw key={i} color={t.ink} size={54} style={{position: 'absolute', left: c * 170 - 60 + (r % 2) * 85 + off * 0.5, top: r * 220 - 240 + off, opacity: 0.05, transform: `rotate(${(i % 3) * 14 - 14}deg)`}} />;
        })}
      </AbsoluteFill>
    );
  }
  const scan = (f * 9) % 2200 - 140;
  return (
    <AbsoluteFill style={{background: `radial-gradient(1100px 1300px at 50% 35%, ${t.bg2} 0%, ${t.bg} 75%)`}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(58,181,181,0.09) 2px, transparent 2px), linear-gradient(90deg, rgba(58,181,181,0.09) 2px, transparent 2px)', backgroundSize: '90px 90px', backgroundPosition: `0 ${(f * 0.8) % 90}px`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 140, background: 'linear-gradient(180deg, rgba(58,181,181,0) 0%, rgba(58,181,181,0.14) 85%, rgba(58,181,181,0.5) 100%)'}} />
    </AbsoluteFill>
  );
};

// Brand-specific burst for slams (frame-local).
const Burst: React.FC<{cx?: number; cy?: number; big?: boolean}> = ({cx = 540, cy = 860, big}) => {
  const {t} = useCtx();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 30, stiffness: 90}});
  const fade = interpolate(f, [0, 30], [1, 0], clamp);
  const n = big ? 22 : 14;
  if (t.id === 'home') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {[0, 6, 12].map((d) => {
          const q = interpolate(f - d, [0, 24], [0, 1], {...clamp, easing: ease});
          return <div key={d} style={{position: 'absolute', left: cx - 700 * q, top: cy - 700 * q, width: 1400 * q, height: 1400 * q, borderRadius: '50%', border: `${big ? 10 : 6}px solid ${t.accent}`, opacity: (1 - q) * 0.8}} />;
        })}
      </AbsoluteFill>
    );
  }
  if (t.id === 'desk') {
    return (
      <AbsoluteFill style={{opacity: fade * 0.9, pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: cx - 1400, top: cy - 1400, width: 2800, height: 2800, transform: `rotate(${f * 1.5}deg) scale(${0.6 + p * 0.5})`,
          background: `repeating-conic-gradient(rgba(245,158,11,0.32) 0deg 7deg, rgba(0,0,0,0) 7deg 20deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 60%)'}} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`ba${i}`) * 0.4;
        const d = p * (big ? 620 : 460) * (0.7 + random(`bd${i}`) * 0.5);
        const s = (big ? 46 : 34) * (0.6 + random(`bs${i}`) * 0.8);
        const style: React.CSSProperties = {position: 'absolute', left: cx + Math.cos(a) * d - s / 2, top: cy + Math.sin(a) * d - s / 2, opacity: fade, transform: `rotate(${i * 40 + f * 4}deg)`};
        if (t.id === 'pet') return <Paw key={i} color={i % 2 ? t.accent : t.accent2} size={s} style={style} />;
        return (
          <svg key={i} viewBox="0 0 24 24" width={s} height={s} style={style}>
            <path fill={i % 3 ? t.accent : '#fdf8f0'} d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

const Flash: React.FC<{frames?: number; color?: string; strength?: number}> = ({frames = 6, color = '#fff', strength = 0.8}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: color, opacity: interpolate(f, [0, frames], [strength, 0], clamp), pointerEvents: 'none'}} />;
};

// ---------- type helpers ----------
const Slam: React.FC<{children: React.ReactNode; style?: React.CSSProperties; delay?: number; from?: number}> = ({children, style, delay = 0, from = 2.2}) => {
  const f = useCurrentFrame() - delay;
  const {fps} = useVideoConfig();
  if (f < 0) return null;
  const s = spring({frame: f, fps, config: {damping: 12, stiffness: 240}});
  return <div style={{...style, transform: `${style?.transform ?? ''} scale(${interpolate(s, [0, 1], [from, 1])})`, opacity: Math.min(1, s * 3)}}>{children}</div>;
};

const TypeOn: React.FC<{text: string; frames: number; delay?: number; style?: React.CSSProperties}> = ({text, frames, delay = 0, style}) => {
  const f = useCurrentFrame() - delay;
  const n = Math.round(interpolate(f, [0, frames], [0, text.length], clamp));
  return <div style={style}>{text.slice(0, n)}<span style={{opacity: 0}}>{text.slice(n)}</span></div>;
};

const Rise: React.FC<{children: React.ReactNode; delay?: number; style?: React.CSSProperties}> = ({children, delay = 0, style}) => {
  const f = useCurrentFrame() - delay;
  const {fps} = useVideoConfig();
  if (f < 0) return null;
  const s = spring({frame: f, fps, config: {damping: 16, stiffness: 200}});
  return <div style={{...style, opacity: s, transform: `translateY(${(1 - s) * 50}px)`}}>{children}</div>;
};

// ---------- sections ----------
const Wordmark: React.FC<{size: number; onCard?: boolean}> = ({size, onCard}) => {
  const {t} = useCtx();
  const first = t.id === 'pet' ? t.ink : onCard ? t.cardInk : t.ink;
  const fam = t.id === 'xmas' ? 'Playfair' : t.id === 'pet' ? 'SourceSerif' : t.id === 'home' ? 'Geist' : 'Inter';
  const w = t.id === 'xmas' ? 800 : t.id === 'pet' ? 900 : 800;
  return <span style={{fontFamily: fam, fontWeight: w, fontSize: size, letterSpacing: t.id === 'desk' ? -1 : 0, color: first}}>{t.wordmark[0]}<span style={{color: t.id === 'pet' ? t.accent2 : t.accent}}>{t.wordmark[1]}</span></span>;
};

const fit = (text: string, max: number, k = 0.56) => Math.min(max, Math.floor(960 / (k * text.length)));

const Hook: React.FC = () => {
  const {t, B, p} = useCtx();
  const f = useCurrentFrame();
  const dark = t.id !== 'pet';
  const veil = dark ? `linear-gradient(180deg, ${t.bg}cc 0%, ${t.bg}55 35%, ${t.bg}ee 62%, ${t.bg} 100%)` : `linear-gradient(180deg, ${t.bg}dd 0%, ${t.bg}33 30%, ${t.bg}ee 60%, ${t.bg} 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img src={src(p.hook.image)} style={{position: 'absolute', width: '100%', height: '62%', top: 0, objectFit: 'cover', transform: `scale(${1.25 - f * 0.0025})`, transformOrigin: '50% 40%'}} />
        <AbsoluteFill style={{background: veil}} />
      </AbsoluteFill>
      <Rise style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center'}}><Wordmark size={46} /></Rise>
      <Slam delay={0} style={{position: 'absolute', left: 60, right: 60, top: 980, textAlign: 'center'}}>
        <span style={{display: 'inline-block', fontFamily: t.body, fontWeight: 800, fontSize: 36, letterSpacing: 6, color: dark ? t.bg : '#fff', background: t.accent, padding: '10px 26px', borderRadius: 8}}>{p.hook.kicker}</span>
      </Slam>
      <Slam delay={Math.round(B * 0.5)} style={{position: 'absolute', left: 50, right: 50, top: 1080, textAlign: 'center', fontFamily: t.display, fontWeight: t.displayWeight, fontSize: fit(p.hook.line1, 150), lineHeight: 1, color: t.ink, whiteSpace: 'nowrap'}}>{p.hook.line1}</Slam>
      <Slam delay={Math.round(B * 1.5)} style={{position: 'absolute', left: 50, right: 50, top: 1250, textAlign: 'center', fontFamily: t.display, fontWeight: t.displayWeight, fontStyle: t.id === 'xmas' ? 'italic' : 'normal', fontSize: fit(p.hook.line2, 104), lineHeight: 1.05, color: t.accent, whiteSpace: 'nowrap'}}>{p.hook.line2}</Slam>
      <TypeOn text={p.hook.sub} frames={Math.round(B)} delay={Math.round(B * 2.5)} style={{position: 'absolute', left: 80, right: 80, top: 1520, textAlign: 'center', fontFamily: t.body, fontWeight: 700, fontSize: 44, color: t.muted}} />
      <Flash frames={5} color={t.accent} strength={0.5} />
    </AbsoluteFill>
  );
};

const RankSlam: React.FC<{rank: number; top?: boolean}> = ({rank, top}) => {
  const {t} = useCtx();
  const f = useCurrentFrame();
  const shake = interpolate(f, [0, 10], [top ? 30 : 18, 0], clamp);
  return (
    <AbsoluteFill style={{transform: `translate(${Math.sin(f * 2.3) * shake}px, ${Math.cos(f * 1.9) * shake}px)`}}>
      <Burst big={top} cy={900} />
      <Slam from={top ? 4 : 3} style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: t.display, fontWeight: t.displayWeight, fontSize: top ? 640 : 520, lineHeight: 1, color: t.accent,
        textShadow: t.id === 'pet' ? `0 14px 0 ${t.ink}` : `0 16px 0 rgba(0,0,0,0.35)`}}>#{rank}</Slam>
      <Flash frames={top ? 8 : 5} strength={top ? 0.9 : 0.6} />
    </AbsoluteFill>
  );
};

const Stars: React.FC<{value: number; progress: number; color: string; empty: string}> = ({value, progress, color, empty}) => (
  <div style={{display: 'flex', gap: 10}}>
    {Array.from({length: 5}, (_, i) => {
      const fill = Math.max(0, Math.min(1, value * progress - i));
      return (
        <svg key={i} viewBox="0 0 24 24" width={70} height={70}>
          <defs><linearGradient id={`st${i}`}><stop offset={fill} stopColor={color} /><stop offset={fill} stopColor={empty} /></linearGradient></defs>
          <path fill={`url(#st${i})`} d="M12 1.5l3.1 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.3 5.6 20.9l1.5-7.1L1.7 8.9l7.2-.8z" />
        </svg>
      );
    })}
  </div>
);

const Card: React.FC<{item: Item; isTop?: boolean}> = ({item, isTop}) => {
  const {t, B, p} = useCtx();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: f, fps, config: {damping: 15, stiffness: 210}});
  const pulse = 1 + 0.012 * Math.max(0, Math.cos(((f % B) / B) * Math.PI * 2)) * (f > B ? 1 : 0);
  const stamp = spring({frame: f - Math.round(B), fps, config: {damping: 9, stiffness: 260}});
  const scoreP = interpolate(f, [B * 2, B * 2 + B * 0.85], [0, 1], {...clamp, easing: ease});
  const showPrice = !!item.price && !!item.priceChecked && daysBetween(item.priceChecked, p.today) <= (p.priceMaxAgeDays ?? 14);
  const nameSize = item.name.length > 26 ? 68 : item.name.length > 18 ? 80 : 92;
  const imgPush = 1.06 + f * 0.0015;

  const frameStyle: React.CSSProperties = {position: 'absolute', left: 70, right: 70, top: 300, height: 700, background: t.card, borderRadius: t.radius, overflow: 'hidden',
    transform: `translateY(${(1 - enter) * 900}px) rotate(${(1 - enter) * (isTop ? -8 : 6)}deg) scale(${pulse})`};
  if (t.id === 'desk') Object.assign(frameStyle, {borderBottom: `14px solid ${t.accent2}`, boxShadow: '0 40px 80px rgba(0,0,0,0.5)'});
  if (t.id === 'xmas') Object.assign(frameStyle, {border: `6px solid ${t.accent2}`, boxShadow: `inset 0 0 0 10px ${t.card}, inset 0 0 0 13px ${t.accent2}, 0 40px 80px rgba(0,0,0,0.45)`});
  if (t.id === 'pet') Object.assign(frameStyle, {border: `5px solid ${t.ink}`, boxShadow: `0 16px 0 ${t.ink}`});
  if (t.id === 'home') Object.assign(frameStyle, {boxShadow: `0 0 0 3px ${t.accent}, 0 0 60px rgba(58,181,181,0.45)`});

  const scan = t.id === 'home' ? interpolate(f, [0, B * 1.2], [-10, 110], clamp) : -100;
  const scoreText = p.scoreMax === 5 ? (item.score * scoreP).toFixed(1) : (item.score * scoreP).toFixed(1);

  return (
    <AbsoluteFill>
      {/* rank chip */}
      <Rise style={{position: 'absolute', left: 70, top: 200, display: 'flex', alignItems: 'center', gap: 18}}>
        <span style={{fontFamily: t.display, fontWeight: t.displayWeight, fontSize: 76, lineHeight: 1, color: t.accent}}>#{item.rank}</span>
        {isTop && <span style={{fontFamily: t.body, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: t.id === 'pet' ? '#fff' : t.bg, background: t.accent, padding: '6px 16px', borderRadius: 6}}>TOP PICK</span>}
      </Rise>
      {/* product card */}
      <div style={frameStyle}>
        <Img src={src(item.image)} style={{position: 'absolute', inset: 40, width: 'calc(100% - 80px)', height: 'calc(100% - 80px)', objectFit: 'contain', transform: `scale(${imgPush})`}} />
        {t.id === 'home' && <div style={{position: 'absolute', left: 0, right: 0, top: `${scan}%`, height: 8, background: t.accent, boxShadow: `0 0 30px ${t.accent}`}} />}
      </div>
      {t.id === 'home' && [[50, 280], [1030, 280], [50, 1020], [1030, 1020]].map(([x, y], i) => (
        <div key={i} style={{position: 'absolute', left: x - (i % 2 ? 50 : 0), top: y - (i > 1 ? 50 : 0), width: 50, height: 50, opacity: enter,
          borderColor: t.accent, borderStyle: 'solid', borderWidth: `${i < 2 ? 6 : 0}px ${i % 2 ? 6 : 0}px ${i > 1 ? 6 : 0}px ${i % 2 ? 0 : 6}px`}} />
      ))}
      {/* badge stamp */}
      {f >= B && (
        <div style={{position: 'absolute', right: 60, top: 250, transform: `rotate(${t.id === 'home' ? 0 : -6}deg) scale(${interpolate(stamp, [0, 1], [2.6, 1])})`, opacity: Math.min(1, stamp * 3),
          background: t.badgeBg, color: t.badgeInk, fontFamily: t.body, fontWeight: 800, fontSize: 38, letterSpacing: 1.5, textTransform: 'uppercase', padding: '14px 26px', borderRadius: t.id === 'pet' ? 8 : 10,
          border: t.id === 'xmas' ? `4px solid ${t.accent}` : t.id === 'pet' ? `4px solid ${t.accent}` : 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.35)', maxWidth: 640, textAlign: 'center'}}>{item.badge}</div>
      )}
      {/* name */}
      <TypeOn text={item.name} frames={Math.round(B * 0.8)} delay={4} style={{position: 'absolute', left: 70, right: 70, top: 1040, fontFamily: t.display, fontWeight: t.displayWeight, fontSize: nameSize, lineHeight: 1.04, color: t.ink}} />
      {/* score */}
      {f >= B * 2 && (
        <div style={{position: 'absolute', left: 70, right: 70, top: 1250, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{fontFamily: t.display, fontWeight: t.displayWeight, fontSize: 132, lineHeight: 1, color: t.accent, fontVariantNumeric: 'tabular-nums', minWidth: 230,
            transform: `scale(${1 + 0.18 * interpolate(f, [B * 2 + B * 0.85, B * 2 + B * 0.85 + 4, B * 2 + B * 0.85 + 10], [0, 1, 0], clamp)})`}}>{scoreText}</div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontFamily: t.body, fontWeight: 700, fontSize: 32, letterSpacing: 2, textTransform: 'uppercase', color: t.muted, marginBottom: 12}}>{p.scoreLabel}{p.scoreStyle === 'stars' ? '' : ` / ${p.scoreMax}`}</div>
            {p.scoreStyle === 'stars'
              ? <Stars value={item.score} progress={scoreP} color={t.accent} empty={'rgba(253,248,240,0.2)'} />
              : <div style={{height: 34, borderRadius: 17, background: t.id === 'pet' ? '#e8dfcc' : 'rgba(255,255,255,0.14)', overflow: 'hidden'}}>
                  <div style={{width: `${(item.score / p.scoreMax) * 100 * scoreP}%`, height: '100%', borderRadius: 17, background: `linear-gradient(90deg, ${t.accent2}, ${t.accent})`, boxShadow: isTop ? `0 0 24px ${t.accent}` : undefined}} />
                </div>}
          </div>
        </div>
      )}
      {/* line + meta */}
      <Rise delay={Math.round(B * 3)} style={{position: 'absolute', left: 70, right: 70, top: 1440, fontFamily: t.body, fontWeight: 700, fontSize: 44, lineHeight: 1.25, color: t.ink}}>{item.line}</Rise>
      <Rise delay={Math.round(B * 3.4)} style={{position: 'absolute', left: 70, right: 70, top: 1580, display: 'flex', flexWrap: 'wrap', gap: 14}}>
        {item.meta && <span style={{fontFamily: t.body, fontWeight: 700, fontSize: 32, color: t.muted, border: `3px solid ${t.id === 'pet' ? '#d9cdb5' : 'rgba(255,255,255,0.25)'}`, padding: '8px 18px', borderRadius: 40}}>{item.meta}</span>}
        {showPrice && <span style={{fontFamily: t.body, fontWeight: 800, fontSize: 32, color: t.id === 'pet' ? '#fff' : t.bg, background: t.accent, padding: '8px 18px', borderRadius: 40}}>{item.price} · checked {shortDate(item.priceChecked!)}</span>}
      </Rise>
      {isTop && <Burst big cy={650} />}
    </AbsoluteFill>
  );
};

const PreDrop: React.FC = () => {
  const {t, B, p} = useCtx();
  const f = useCurrentFrame();
  const words = p.predrop.split(' ');
  const per = (B * 1.5) / words.length;
  const black = f >= B * 1.75;
  return (
    <AbsoluteFill style={{background: black ? '#000' : t.id === 'pet' ? t.ink : '#000000cc', alignItems: 'center', justifyContent: 'center'}}>
      {!black && (
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 30px', padding: '0 80px', fontFamily: t.display, fontWeight: t.displayWeight, fontSize: 104, lineHeight: 1.1, color: t.id === 'pet' ? '#fdfaf3' : t.ink, textAlign: 'center'}}>
          {words.map((w, i) => <span key={i} style={{opacity: f >= i * per ? 1 : 0, transform: `scale(${f >= i * per ? interpolate(f - i * per, [0, 5], [1.15, 1], clamp) : 1})`}}>{w}</span>)}
          <span style={{opacity: f >= words.length * per ? 1 : 0, color: t.accent}}>…</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const End: React.FC = () => {
  const {t, B, p} = useCtx();
  return (
    <AbsoluteFill>
      <Burst cy={620} />
      <Slam style={{position: 'absolute', left: 40, right: 40, top: t.logo ? 380 : 520, textAlign: 'center'}}>
        {t.logo
          ? <Img src={staticFile(t.logo)} style={{width: t.id === 'pet' ? 760 : 900, borderRadius: t.id === 'pet' ? 28 : 0, boxShadow: t.id === 'pet' ? `0 16px 0 ${t.accent}` : undefined}} />
          : <Wordmark size={t.id === 'xmas' ? 100 : 140} />}
      </Slam>
      <Rise delay={Math.round(B)} style={{position: 'absolute', left: 60, right: 60, top: 930, textAlign: 'center', fontFamily: t.body, fontWeight: 700, fontSize: 48, color: t.muted}}>{p.end.cta}</Rise>
      <Slam delay={Math.round(B * 1.5)} from={1.6} style={{position: 'absolute', left: 0, right: 0, top: 1030, textAlign: 'center'}}>
        <span style={{display: 'inline-block', fontFamily: t.body, fontWeight: 800, fontSize: 64, color: t.id === 'pet' ? '#fff' : t.bg, background: t.accent, padding: '20px 44px', borderRadius: 999}}>{p.end.url}</span>
      </Slam>
      <Rise delay={Math.round(B * 2.5)} style={{position: 'absolute', left: 90, right: 90, top: 1240, textAlign: 'center', fontFamily: t.body, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: t.ink}}>{p.end.method}</Rise>
      <Rise delay={Math.round(B * 3)} style={{position: 'absolute', left: 90, right: 90, top: 1420, textAlign: 'center', fontFamily: t.body, fontWeight: 500, fontSize: 28, color: t.muted}}>{p.end.disclosure}</Rise>
      <Flash frames={6} color={t.accent} strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- composition ----------
export const Promo: React.FC<PromoProps> = (p) => {
  const t = THEMES[p.brand];
  const B = beatFrames(p.bpm);
  const tl = buildTimeline(p.items.length);
  const items = [...p.items].sort((a, b) => b.rank - a.rank); // countdown order
  const fr = (beat: number) => Math.round(beat * B);
  return (
    <Ctx.Provider value={{t, B, p}}>
      <AbsoluteFill style={{background: t.bg}}>
        <style>{FONT_CSS(staticFile)}</style>
        <Backdrop />
        <Audio src={staticFile(p.music ?? `music/${p.brand}.wav`)} />
        {tl.map((s, i) => {
          const from = fr(s.startBeat), dur = fr(s.startBeat + s.beats) - from;
          if (s.kind === 'hook') return <Sequence key={i} from={from} durationInFrames={dur}><Hook /></Sequence>;
          if (s.kind === 'predrop') return <Sequence key={i} from={from} durationInFrames={dur}><PreDrop /></Sequence>;
          if (s.kind === 'end') return <Sequence key={i} from={from} durationInFrames={dur + 6}><End /></Sequence>;
          const it = items[s.index!];
          const top = s.kind === 'top';
          const slamLen = fr(s.startBeat + 1) - from;
          return (
            <React.Fragment key={i}>
              <Sequence from={from} durationInFrames={slamLen}><RankSlam rank={it.rank} top={top} /></Sequence>
              <Sequence from={from + slamLen} durationInFrames={dur - slamLen}><Card item={it} isTop={top} /></Sequence>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
