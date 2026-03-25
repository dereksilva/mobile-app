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
  primary: '#4e00cd',
  primaryBg: '#fff7fe',
  darkBg: '#431e63',
  accent: '#b70054',
  accentDark: '#8f0041',
  purple: '#4e00cd',
  purpleLight: '#681cff',
  purpleDark: '#5000d0',
  violet: '#6920ff',
  yellow: '#DFE94B',
  green: '#006777',
  grey: '#cbc3da',
  blue: '#0D6EFD',
  text: '#2c024d',
  textLight: '#494457',
  textMuted: '#7a7489',
  nav: '#fff7fe',
  cardBg: '#fcf0ff',
  surfaceBg: '#f8e9ff',
  splashBg: '#fff7fe',
  error: '#ba1a1a',
  button: '#4e00cd',
  white: '#FFFFFF',
  overlay: 'rgba(44, 2, 77, 0.6)',
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
