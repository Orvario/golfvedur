/** Golfveður dark-glass weather theme — matches approved mock */

export const theme = {
  bg: '#0B0C1E',
  bgElevated: '#12132A',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardHover: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.18)',

  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  textDim: 'rgba(255,255,255,0.35)',

  blueTop: '#47BBE1',
  blueMid: '#2B8FE8',
  blueBot: '#0575E6',
  blueGlow: '#00D2FF',
  accent: '#4FACFE',

  heroGradient: 'linear-gradient(165deg, #47BBE1 0%, #2B8FE8 48%, #0575E6 100%)',
  heroGradientSoft: 'linear-gradient(165deg, rgba(71,187,225,0.85) 0%, rgba(5,117,230,0.9) 100%)',

  radiusXl: 36,
  radiusLg: 28,
  radiusMd: 18,
  radiusSm: 12,
  radiusPill: 999,

  shadowHero: '0 18px 48px rgba(5,117,230,0.35)',
  shadowCard: '0 8px 28px rgba(0,0,0,0.35)',
  shadowGlow: '0 0 0 1.5px rgba(0,210,255,0.55), 0 8px 24px rgba(5,117,230,0.45)',

  maxWidth: 430,
} as const;

export type Theme = typeof theme;
