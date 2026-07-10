/* BrandedLoader — the YoteMarket loading screen.
   One component for every "we're fetching/booting" moment so the whole system
   loads the same way: the animated bag mark (orbiting ring + pulsing halo),
   the wordmark, and an indeterminate shimmer bar. Styles live in styles/motion.css
   (global) so it renders identically on the marketing site and inside every kit.

   Props:
     variant  'full'  → fixed full-screen overlay (boot / route chunk) [default]
              'block' → fills its container (in-page sections)
     label    caption under the bar (default "Loading…"); pass null to hide
     showWord show the YoteMarket wordmark (default true) */
export default function BrandedLoader({ variant = 'full', label = 'Loading…', showWord = true }) {
  return (
    <div className={`ym-loader ym-loader--${variant === 'block' ? 'block' : 'full'}`} role="status" aria-live="polite" aria-busy="true">
      <div className="ym-loader-stack">
        <div className="ym-loader-mark">
          <span className="ym-loader-halo" aria-hidden="true" />
          <span className="ym-loader-ring" aria-hidden="true" />
          <img className="ym-loader-icon" src="/assets/app_icon.png" alt="" aria-hidden="true" />
        </div>
        {showWord && (
          <div className="ym-loader-word" aria-hidden="true">
            <span className="a">Yote</span><span className="b">Market</span>
          </div>
        )}
        <div className="ym-loader-bar" aria-hidden="true"><span /></div>
        {label && <div className="ym-loader-label">{label}</div>}
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {label || 'Loading'}
        </span>
      </div>
    </div>
  );
}
