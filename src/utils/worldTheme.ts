export interface WorldColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const DEFAULT_WORLD_COLOR = '#10B981';

export const WORLD_COLOR_PRESETS: WorldColorPreset[] = [
  { id: 'emerald', name: 'Esmeralda Místico', hex: '#10B981' },
  { id: 'sapphire', name: 'Zafiro Astral', hex: '#3B82F6' },
  { id: 'amethyst', name: 'Amatista Arcano', hex: '#8B5CF6' },
  { id: 'crimson', name: 'Carmesí Sangre', hex: '#EF4444' },
  { id: 'amber', name: 'Ámbar Imperial', hex: '#F59E0B' },
  { id: 'cyan', name: 'Cian Glacial', hex: '#06B6D4' },
  { id: 'rose', name: 'Rosa Dinástico', hex: '#EC4899' },
  { id: 'copper', name: 'Cobre Ancestral', hex: '#F97316' },
];

export function normalizeHex(hex?: string): string {
  if (!hex || typeof hex !== 'string') return DEFAULT_WORLD_COLOR;
  const clean = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return DEFAULT_WORLD_COLOR;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const valid = normalizeHex(hex).slice(1);
  const num = parseInt(valid, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getWorldThemeVariables(
  rawHex: string | undefined,
  mode: 'dark' | 'light'
): Record<string, string> {
  const hex = normalizeHex(rawHex);
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  if (mode === 'dark') {
    const primaryHex = l < 42 ? hslToHex(h, Math.max(s, 65), 54) : hex;
    const { r: pr, g: pg, b: pb } = hexToRgb(primaryHex);
    const hoverHex = hslToHex(h, Math.max(s, 60), Math.max(28, l - 10));
    const bgSat = Math.min(38, Math.max(14, Math.round(s * 0.42)));

    return {
      '--primary': primaryHex,
      '--primary-hover': hoverHex,
      '--primary-soft': `rgba(${pr}, ${pg}, ${pb}, 0.15)`,
      '--primary-border': `rgba(${pr}, ${pg}, ${pb}, 0.42)`,
      '--primary-glow': `rgba(${pr}, ${pg}, ${pb}, 0.32)`,
      '--bg-color': hslToHex(h, bgSat, 5),
      '--bg-main': hslToHex(h, bgSat, 5),
      '--bg-panel': `hsla(${h}, ${bgSat}%, 8%, 0.86)`,
      '--surface': `hsla(${h}, ${bgSat}%, 12%, 0.64)`,
      '--surface-hover': `hsla(${h}, ${bgSat}%, 16%, 0.84)`,
      '--surface-elevated': hslToHex(h, bgSat, 11),
      '--input-bg': `hsla(${h}, ${bgSat}%, 6%, 0.78)`,
      '--text-main': hslToHex(h, 32, 97),
      '--text-secondary': hslToHex(h, 26, 83),
      '--text-muted': hslToHex(h, 16, 60),
      '--border': `rgba(${pr}, ${pg}, ${pb}, 0.13)`,
      '--border-strong': `rgba(${pr}, ${pg}, ${pb}, 0.26)`,
      '--canvas-bg': hslToHex(h, bgSat, 5),
      '--header-bg': `hsla(${h}, ${bgSat}%, 8%, 0.82)`,
      '--header-border': `rgba(${pr}, ${pg}, ${pb}, 0.13)`,
      '--shadow-hover': `0 18px 40px -8px rgba(${pr}, ${pg}, ${pb}, 0.28)`,
      '--blob-1-color': `rgba(${pr}, ${pg}, ${pb}, 0.26)`,
    };
  }

  // Light Mode (Parchment / Ivory tinted with world hue)
  const lightL = Math.min(l, 42);
  const primaryHex = hslToHex(h, Math.max(s, 65), lightL);
  const hoverHex = hslToHex(h, Math.max(s, 70), Math.max(24, lightL - 8));
  const { r: lr, g: lg, b: lb } = hexToRgb(primaryHex);

  return {
    '--primary': primaryHex,
    '--primary-hover': hoverHex,
    '--primary-soft': `rgba(${lr}, ${lg}, ${lb}, 0.12)`,
    '--primary-border': `rgba(${lr}, ${lg}, ${lb}, 0.36)`,
    '--primary-glow': `rgba(${lr}, ${lg}, ${lb}, 0.25)`,
    '--bg-color': hslToHex(h, 24, 97),
    '--bg-main': hslToHex(h, 22, 93),
    '--bg-panel': `hsla(${h}, 26%, 99%, 0.92)`,
    '--surface': `hsla(${h}, 20%, 100%, 0.88)`,
    '--surface-hover': '#FFFFFF',
    '--surface-elevated': '#FFFFFF',
    '--input-bg': hslToHex(h, 20, 94),
    '--text-main': hslToHex(h, 35, 12),
    '--text-secondary': hslToHex(h, 25, 25),
    '--text-muted': hslToHex(h, 16, 44),
    '--border': `rgba(${lr}, ${lg}, ${lb}, 0.14)`,
    '--border-strong': `rgba(${lr}, ${lg}, ${lb}, 0.26)`,
    '--canvas-bg': hslToHex(h, 22, 93),
    '--header-bg': `hsla(${h}, 26%, 99%, 0.9)`,
    '--header-border': `rgba(${lr}, ${lg}, ${lb}, 0.14)`,
    '--shadow-hover': `0 18px 36px -8px rgba(${lr}, ${lg}, ${lb}, 0.22)`,
    '--blob-1-color': `rgba(${lr}, ${lg}, ${lb}, 0.14)`,
  };
}

const MANAGED_CSS_VARS = [
  '--primary',
  '--primary-hover',
  '--primary-soft',
  '--primary-border',
  '--primary-glow',
  '--bg-color',
  '--bg-main',
  '--bg-panel',
  '--surface',
  '--surface-hover',
  '--surface-elevated',
  '--input-bg',
  '--text-main',
  '--text-secondary',
  '--text-muted',
  '--border',
  '--border-strong',
  '--canvas-bg',
  '--header-bg',
  '--header-border',
  '--shadow-hover',
  '--blob-1-color',
];

export function applyWorldThemeToDocument(
  themeColor: string | undefined,
  mode: 'dark' | 'light'
): void {
  const vars = getWorldThemeVariables(themeColor, mode);
  const target = document.body;
  for (const [key, val] of Object.entries(vars)) {
    target.style.setProperty(key, val);
  }
}

export function clearWorldThemeFromDocument(): void {
  const target = document.body;
  for (const key of MANAGED_CSS_VARS) {
    target.style.removeProperty(key);
  }
}
