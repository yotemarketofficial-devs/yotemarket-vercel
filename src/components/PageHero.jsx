// The hero the inner marketing pages share (About, Careers, Pricing, Mobile, APK, Rider),
// laid out to the 2026-10-09 page boards in the homepage hero's language: a lilac pill, a
// two-line title whose second line carries the brand gradient (.g, as "Delivered" does on
// the homepage — the owner calls it iconic, so every page keeps it), a lead, two buttons,
// and the art on the right, running to the window's edge and fading into the page on its
// free sides. The handwritten note over the art is live text, never baked into a photo.
import { Icon } from './LineIcon.jsx';
import '../styles/page-hero.css';

/**
 * pill    { icon, text }       — icon is a LineIcon name
 * title   node                 — wrap the gradient part in <span className="g">
 * lead    node
 * actions node                 — buttons (.ph-btn / .ph-btn.is-ghost), badges
 * art     { src, src2x, width, height, alt, sizes? } for a photo — shown whole, never cropped or zoomed,
 *         or { node } for composed art that must be shown whole (phones on a band)
 * note    string, lines split on "\n" — Caveat, over the art
 * noteMark true → the real logo above the note (purple, for a light wall in the photo)
 * tone    'page' (default) | 'band' (the deep purple APK band)
 * className, id
 */
export default function PageHero({ pill, title, lead, actions, art, note, noteTone, noteMark, tone = 'page', className = '', id, children }) {
  const photo = art && art.src;
  return (
    <header id={id} className={`ph ${tone === 'band' ? 'is-band' : ''} ${photo ? 'has-photo' : 'has-art'} ${className}`}>
      <div className="ph-in">
        <div className="ph-copy">
          {pill && (
            <span className="ph-pill">
              {pill.icon && <Icon name={pill.icon} />}
              {pill.text}
            </span>
          )}
          <h1 className="ph-title">{title}</h1>
          {lead && <p className="ph-lead">{lead}</p>}
          {actions && <div className="ph-cta">{actions}</div>}
          {children}
        </div>
        {art && (
          <div className="ph-art">
            {photo ? (
              <img
                src={art.src}
                srcSet={art.src2x ? `${art.src} ${art.width}w, ${art.src2x} ${art.width * 2}w` : undefined}
                sizes={art.sizes || '(max-width: 1100px) 100vw, 56vw'}
                width={art.width}
                height={art.height}
                alt={art.alt}
                fetchPriority="high"
                decoding="async"
              />
            ) : art.node}
            {note && (
              <p className={`ph-note ${noteTone === 'light' ? 'is-light' : ''}`} aria-hidden="true">
                {noteMark && <img className="ph-note-mark" src={noteTone === 'light' ? '/assets/logo-white.png' : '/assets/logo.png'} alt="" width="953" height="370" />}
                {note.split('\n').map((l, i) => <span key={i}>{l}</span>)}
                <svg viewBox="0 0 160 14" preserveAspectRatio="none" focusable="false">
                  <path d="M3 10.5C42 4.5 96 2.8 157 3.6" />
                </svg>
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
