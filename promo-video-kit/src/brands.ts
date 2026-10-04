// Per-site look. Colors and type come from each site's globals.css / layout.tsx.
export type BrandId = 'desk' | 'xmas' | 'pet' | 'home';

export type Theme = {
  id: BrandId;
  bg: string;          // stage background
  bg2: string;         // secondary stage tone (gradients)
  ink: string;         // main text on stage
  muted: string;       // secondary text on stage
  accent: string;      // rank numbers, meters, highlights
  accent2: string;     // second accent (badges, wordmark half)
  card: string;        // product card surface
  cardInk: string;     // text on card
  cardMuted: string;
  badgeBg: string;
  badgeInk: string;
  display: string;     // headline face
  body: string;        // UI face
  displayWeight: number;
  displayCase: 'none' | 'uppercase';
  radius: number;
  wordmark: [string, string]; // two-tone text wordmark
  logo?: string;       // optional image logo for the end card
};

export const THEMES: Record<BrandId, Theme> = {
  // DeskGearHQ: warm charcoal + amber, "well-worn leather notebook". DM Serif Display + Inter.
  desk: {
    id: 'desk', bg: '#1a1209', bg2: '#2b1d0e', ink: '#f9f5ef', muted: '#cdbfae', accent: '#f59e0b', accent2: '#d97706',
    card: '#f9f5ef', cardInk: '#1c1208', cardMuted: '#78716c', badgeBg: '#16a34a', badgeInk: '#ffffff',
    display: 'DMSerif', body: 'Inter', displayWeight: 400, displayCase: 'none', radius: 18,
    wordmark: ['DeskGear', 'HQ'],
  },
  // ChristmasGearHQ: deep evergreen, cream, gold, cranberry. Playfair Display + Nunito.
  xmas: {
    id: 'xmas', bg: '#13471f', bg2: '#0e3318', ink: '#fdf8f0', muted: '#e8d9c8', accent: '#e8c547', accent2: '#c9a227',
    card: '#fdf8f0', cardInk: '#1a1008', cardMuted: '#7a6040', badgeBg: '#b91c1c', badgeInk: '#fdf8f0',
    display: 'Playfair', body: 'Nunito', displayWeight: 800, displayCase: 'none', radius: 10,
    wordmark: ['Christmas', 'GearHQ'],
  },
  // PetPalHQ: navy, teal, coral on cream, "field guide on a quiet bookshelf". Source Serif 4 + Inter.
  pet: {
    id: 'pet', bg: '#fdfaf3', bg2: '#f7eedd', ink: '#1e3a6e', muted: '#4a5570', accent: '#f29c3a', accent2: '#2db8c5',
    card: '#ffffff', cardInk: '#1a2440', cardMuted: '#4a5570', badgeBg: '#1e3a6e', badgeInk: '#fdfaf3',
    display: 'SourceSerif', body: 'Inter', displayWeight: 900, displayCase: 'none', radius: 14,
    wordmark: ['PetPal', 'HQ'], logo: 'pet/logo-on-dark.png',
  },
  // SmartHomeExplorer: teal + burnt orange, dark UI. DM Serif Display + Geist.
  home: {
    id: 'home', bg: '#0b1416', bg2: '#10262b', ink: '#f1f7f7', muted: '#9fb8bb', accent: '#3ab5b5', accent2: '#fb923c',
    card: '#ffffff', cardInk: '#1e293b', cardMuted: '#64748b', badgeBg: '#c2410c', badgeInk: '#ffffff',
    display: 'DMSerif', body: 'Geist', displayWeight: 400, displayCase: 'none', radius: 16,
    wordmark: ['SmartHome', 'Explorer'], logo: 'home/logo-white.png',
  },
};

export const FONT_CSS = (url: (p: string) => string) => `
@font-face { font-family: DMSerif; src: url(${url('fonts/dmserif.woff2')}) format('woff2'); font-weight: 400; }
@font-face { font-family: Inter; src: url(${url('fonts/inter-500.woff2')}) format('woff2'); font-weight: 500; }
@font-face { font-family: Inter; src: url(${url('fonts/inter-700.woff2')}) format('woff2'); font-weight: 700; }
@font-face { font-family: Inter; src: url(${url('fonts/inter-800.woff2')}) format('woff2'); font-weight: 800; }
@font-face { font-family: Playfair; src: url(${url('fonts/playfair-800.woff2')}) format('woff2'); font-weight: 800; }
@font-face { font-family: Playfair; src: url(${url('fonts/playfair-700i.woff2')}) format('woff2'); font-weight: 700; font-style: italic; }
@font-face { font-family: Nunito; src: url(${url('fonts/nunito-700.woff2')}) format('woff2'); font-weight: 700; }
@font-face { font-family: Nunito; src: url(${url('fonts/nunito-800.woff2')}) format('woff2'); font-weight: 800; }
@font-face { font-family: SourceSerif; src: url(${url('fonts/sserif-700.woff2')}) format('woff2'); font-weight: 700; }
@font-face { font-family: SourceSerif; src: url(${url('fonts/sserif-900.woff2')}) format('woff2'); font-weight: 900; }
@font-face { font-family: Geist; src: url(${url('fonts/geist-500.woff2')}) format('woff2'); font-weight: 500; }
@font-face { font-family: Geist; src: url(${url('fonts/geist-700.woff2')}) format('woff2'); font-weight: 700; }
`;
