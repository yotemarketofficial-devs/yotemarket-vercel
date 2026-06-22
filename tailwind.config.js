/** @type {import('tailwindcss').Config} */
// Tailwind is used by the Marketers, Staff and Admin kits (the other kits use inline
// styles + scoped CSS). Preflight is disabled so Tailwind's global reset can't disturb
// the marketing site; utilities are emitted only for classes those kits use.
// The `primary` palette (indigo) is consumed by the admin console's `primary-*` classes;
// marketers/staff theme via CSS vars, so they're unaffected by it.
export default {
  content: [
    './src/kits/marketers/**/*.{js,jsx}',
    './src/kits/staff/**/*.{js,jsx}',
    './src/kits/admin/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: { DEFAULT:'#4338CA', dark:'#3730A3', 50:'#EEF2FF', 100:'#E0E7FF', 200:'#C7D2FE', 500:'#4F46E5', 600:'#4338CA', 700:'#3730A3', 900:'#1E1B4B' },
        secondary: { 50:'#F6E9FE', 100:'#E3BCFB', 500:'#B34DF3', 600:'#A020F0', 700:'#7016A8', 900:'#300A48' },
        gold: { 400:'#FACC45', 500:'#F4B530', 600:'#E89B0C' },
        success: { 500:'#10B981', 600:'#059669' },
        warning: { 400:'#FBBF24', 500:'#F59E0B' },
        danger: { DEFAULT:'#EF4444', 500:'#EF4444', 600:'#DC2626' },
        mpesa: '#009B3A',
        whatsapp: '#25D366',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0/.05)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0/.10), 0 2px 4px -2px rgb(0 0 0/.10)',
        md: '0 10px 25px -5px rgb(0 0 0/.10)',
        lg: '0 20px 25px -5px rgb(0 0 0/.10), 0 8px 10px -6px rgb(0 0 0/.10)',
      },
    },
  },
  plugins: [],
};
