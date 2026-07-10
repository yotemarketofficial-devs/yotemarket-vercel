/* BrandedLoader — the YoteMarket loading screen.
   One component for every "we're fetching/booting" moment so the whole system
   loads the same way: the YoteMarket logo (its own brand font) with a single
   indeterminate shimmer bar underneath — no spinner, kept intentionally clean.
   Styles live in styles/motion.css (global) so it renders identically on the
   marketing site and inside every kit. The light/dark logo swaps via CSS on
   html.dark, so the component needs no theme awareness.

   Props:
     variant  'full'  → fixed full-screen overlay (boot / route chunk) [default]
              'block' → fills its container (in-page sections)
     label    optional caption under the bar (default none) */
export default function BrandedLoader({ variant = 'full', label = null }) {
  return (
    <div
      className={`ym-loader ym-loader--${variant === 'block' ? 'block' : 'full'}`}
      role="status"
      aria-label={label || 'Loading'}
      aria-busy="true"
    >
      <div className="ym-loader-stack">
        <img className="ym-loader-logo ym-loader-logo--light" src="/assets/logo.png" alt="YoteMarket" />
        <img className="ym-loader-logo ym-loader-logo--dark" src="/assets/logo-white.png" alt="" aria-hidden="true" />
        <div className="ym-loader-bar" aria-hidden="true"><span /></div>
        {label && <div className="ym-loader-label">{label}</div>}
      </div>
    </div>
  );
}
