// ThemeToggle — the light/dark switch as a little sky: a sun over clouds by day, and
// a moon over stars and purple night clouds by night. The knob slides and turns from
// sun to moon. It is a real switch (role="switch", aria-checked), so screen readers
// announce "Dark mode, on/off". Styles live in styles.css under `.tt`; motion is
// switched off for prefers-reduced-motion.
export default function ThemeToggle({ dark, onToggle, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`tt ${dark ? 'is-dark' : ''} ${className}`.trim()}
      onClick={onToggle}
    >
      <span className="tt-track" aria-hidden="true">
        <span className="tt-night" />
        {/* Day: clouds on the right, the side the sun isn't on. */}
        <svg className="tt-day-scene" viewBox="0 0 64 32" preserveAspectRatio="none" focusable="false">
          <g fill="#fff" opacity=".55">
            <circle cx="40" cy="30" r="7" />
            <circle cx="50" cy="27" r="8" />
            <circle cx="61" cy="28" r="7" />
          </g>
          <g fill="#fff">
            <circle cx="45" cy="33" r="6" />
            <circle cx="53" cy="30" r="6.5" />
            <circle cx="61" cy="32" r="6" />
          </g>
          <g fill="#fff" opacity=".92">
            <ellipse cx="47" cy="10.5" rx="5" ry="2.2" />
            <circle cx="45.5" cy="9" r="2.2" />
            <circle cx="48.6" cy="8.4" r="2.6" />
          </g>
        </svg>
        {/* Night: stars and purple clouds on the left, away from the moon. */}
        <svg className="tt-night-scene" viewBox="0 0 64 32" preserveAspectRatio="none" focusable="false">
          <g fill="#fff">
            <circle className="tt-star" cx="7" cy="8" r=".8" />
            <circle className="tt-star s2" cx="14" cy="5" r=".55" />
            <circle className="tt-star s3" cx="21" cy="10" r=".7" />
            <circle className="tt-star" cx="28" cy="6" r=".5" />
            <circle className="tt-star s2" cx="11" cy="14" r=".45" />
            <circle className="tt-star s3" cx="31" cy="13" r=".6" />
            <circle className="tt-star" cx="18" cy="16" r=".4" />
          </g>
          <g fill="#9B6BE0" opacity=".45">
            <circle cx="4" cy="31" r="7" />
            <circle cx="14" cy="29" r="7.5" />
            <circle cx="25" cy="32" r="7" />
          </g>
          <g fill="#B98CF2" opacity=".35">
            <circle cx="9" cy="34" r="6" />
            <circle cx="19" cy="33" r="6" />
          </g>
        </svg>
      </span>
      <span className="tt-knob" aria-hidden="true">
        <span className="tt-sun" />
        <span className="tt-moon">
          <svg viewBox="0 0 26 26" focusable="false">
            <circle cx="9" cy="9" r="3" />
            <circle cx="16.5" cy="7.5" r="1.6" />
            <circle cx="17" cy="15.5" r="3.3" />
            <circle cx="9.5" cy="18" r="1.8" />
            <circle cx="5.5" cy="13.5" r="1.1" />
          </svg>
        </span>
      </span>
    </button>
  );
}
