/** Reef brand colors — mirrors lib/utils/styles.dart */
export const Colors = {
  primary: '#0E225D',
  primaryBg: '#eeebf6',
  darkBg: '#300157',
  accentPrimary: '#bf37a7',
  accentPrimaryDark: '#ba24c7',
  purple: '#a93185',
  purpleLight: '#ae27a5',
  purpleDark: '#5531a9',
  accentSecondaryDark: '#742cb2',
  yellow: '#dfe94b',
  green: '#26b686',
  grey: '#e6e8e8',
  blue: '#0d6efd',
  text: '#313a52',
  textLight: '#8890ab',
  nav: '#e5e1f0',
  boxBg: '#f8f7fc',
  splashBg: '#fef9f6',
  error: '#cc0b0b',
  button: '#4c66ee',
  white: '#ffffff',
} as const;

/** The gradient used on primary buttons (purple-light → accent-secondary-dark) */
export const ButtonGradientColors = [Colors.purpleLight, Colors.accentSecondaryDark] as const;
