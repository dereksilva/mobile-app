/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        reef: {
          // Primary brand
          purple: '#a93185',
          'purple-light': '#ae27a5',
          'purple-dark': '#5531a9',
          'accent-dark': '#742cb2',
          'accent-primary': '#bf37a7',

          // Backgrounds
          bg: '#eeebf6',
          'bg-dark': '#300157',
          'bg-box': '#f8f7fc',
          'bg-splash': '#fef9f6',

          // Text
          text: '#313a52',
          'text-light': '#8890ab',

          // UI
          grey: '#e6e8e8',
          nav: '#e5e1f0',
          blue: '#0d6efd',
          green: '#26b686',
          yellow: '#dfe94b',
          error: '#cc0b0b',
          button: '#4c66ee',
        },
      },
    },
  },
  plugins: [],
};
