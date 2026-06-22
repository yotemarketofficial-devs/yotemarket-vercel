// PostCSS pipeline. Tailwind only emits rules into files that contain @tailwind
// directives (the marketers kit); all other CSS passes through untouched.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
