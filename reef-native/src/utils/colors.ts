/**
 * Reef brand colors — based on 2025 "New Digital Reef" branding guide.
 *
 * Supports dark (default) and light themes. The `Colors` export is a Proxy
 * that reads the current theme from useThemeStore and returns the appropriate
 * palette. Existing code using `Colors.primaryBg` etc. works unchanged.
 */

import {useThemeStore} from '../stores/useThemeStore';

// ─── Light Palette ───────────────────────────────────────────────────────────

const LightColors = {
  primary: '#0E225D',
  primaryBg: '#F7F8F4',
  darkBg: '#1A0035',
  accent: '#C137D2',
  accentDark: '#A52CB5',
  purple: '#A93185',
  purpleLight: '#C84FBA',
  purpleDark: '#5531A9',
  violet: '#742CB2',
  yellow: '#DFE94B',
  green: '#26B686',
  grey: '#E2E4E0',
  blue: '#0D6EFD',
  text: '#1A1D2E',
  textLight: '#6B7294',
  textMuted: '#484848',
  nav: '#FFFFFF',
  cardBg: '#FFFFFF',
  surfaceBg: '#F0EEF5',
  splashBg: '#F7F8F4',
  error: '#E53935',
  button: '#A93185',
  white: '#FFFFFF',
  overlay: 'rgba(26, 0, 53, 0.6)',
} as const;

// ─── Dark Palette ────────────────────────────────────────────────────────────

const DarkColors = {
  primary: '#C84FBA',
  primaryBg: '#0D0D14',
  darkBg: '#08080E',
  accent: '#C137D2',
  accentDark: '#A52CB5',
  purple: '#C84FBA',
  purpleLight: '#D97FD0',
  purpleDark: '#5531A9',
  violet: '#9B6BD4',
  yellow: '#DFE94B',
  green: '#2ED89E',
  grey: '#2A2A3C',
  blue: '#4D9AFF',
  text: '#EAEAF0',
  textLight: '#B0B2C3',
  textMuted: '#8A8A9E',
  nav: '#16161F',
  cardBg: '#1C1C28',
  surfaceBg: '#141420',
  splashBg: '#0D0D14',
  error: '#FF5252',
  button: '#C84FBA',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

// ─── Type ────────────────────────────────────────────────────────────────────

export type ColorPalette = typeof LightColors;

// ─── Reactive Colors Proxy ───────────────────────────────────────────────────
// Every access to Colors.someKey reads the current theme and returns the right
// value. This is safe because React re-renders on store changes, so any
// component subscribing to useThemeStore (or a parent that does) will pick up
// the new palette on re-render.

export const Colors: ColorPalette = new Proxy({} as any, {
  get(_target, prop: string) {
    const theme = useThemeStore.getState().theme;
    const palette = theme === 'dark' ? DarkColors : LightColors;
    return (palette as any)[prop];
  },
});

// ─── Direct palette access (for non-reactive contexts) ─────────────────────

export {LightColors, DarkColors};

// ─── Hook for components that need to re-render on theme change ─────────────

export function useColors(): ColorPalette {
  const theme = useThemeStore(s => s.theme);
  return theme === 'dark' ? DarkColors : LightColors;
}

// ─── Gradients ───────────────────────────────────────────────────────────────

export const ButtonGradientColors = ['#C84FBA', '#5531A9'] as const;

export const HeroGradientColors = ['#1A0035', '#5531A9', '#C137D2'] as const;
