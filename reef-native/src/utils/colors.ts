/**
 * Reef brand colors — based on 2025 "New Digital Reef" branding guide.
 *
 * Key brand principles: bold, vibrant, organic, accessible.
 * Primary accent is a vivid magenta-purple (#C137D2) from the brand identity.
 * Background uses the warm off-white (#F7F8F4) specified in the guide.
 */
export const Colors = {
  /** Deep navy — primary dark color for headers and emphasis */
  primary: '#0E225D',

  /** Warm off-white background from brand guide */
  primaryBg: '#F7F8F4',

  /** Deep purple for dark backgrounds / gradients */
  darkBg: '#1A0035',

  /** Vivid magenta — the hero brand color from the new identity */
  accent: '#C137D2',

  /** Slightly deeper magenta for pressed/active states */
  accentDark: '#A52CB5',

  /** Reef purple — primary interactive color (buttons, links, highlights) */
  purple: '#A93185',

  /** Lighter purple for gradients and secondary elements */
  purpleLight: '#C84FBA',

  /** Deep violet for gradient endpoints and depth */
  purpleDark: '#5531A9',

  /** Rich violet for secondary accents and gradient stops */
  violet: '#742CB2',

  /** Bright lime-yellow — used sparingly for highlights and badges */
  yellow: '#DFE94B',

  /** Reef teal-green — success states, positive values */
  green: '#26B686',

  /** Soft neutral border and divider color */
  grey: '#E2E4E0',

  /** Brand blue for informational elements */
  blue: '#0D6EFD',

  /** Primary text — dark charcoal */
  text: '#1A1D2E',

  /** Secondary text — muted */
  textLight: '#6B7294',

  /** Subtle text on dark backgrounds */
  textMuted: '#484848',

  /** Navigation bar background */
  nav: '#FFFFFF',

  /** Card background — clean white */
  cardBg: '#FFFFFF',

  /** Slightly warm surface for grouped sections */
  surfaceBg: '#F0EEF5',

  /** Splash / loading screen background */
  splashBg: '#F7F8F4',

  /** Error red */
  error: '#E53935',

  /** Primary button color — vivid purple */
  button: '#A93185',

  /** Pure white */
  white: '#FFFFFF',

  /** Overlay / scrim */
  overlay: 'rgba(26, 0, 53, 0.6)',
} as const;

/**
 * The gradient used on primary action buttons and hero areas.
 * Flows from vivid magenta to deep violet — organic, bold, and energetic.
 */
export const ButtonGradientColors = ['#C84FBA', '#5531A9'] as const;

/**
 * Hero gradient for account cards and prominent header areas.
 * Deep navy → rich purple → vivid magenta.
 */
export const HeroGradientColors = ['#1A0035', '#5531A9', '#C137D2'] as const;
