/* Tour.jsx — Shopper welcome tour (spotlight coach-marks).

   Runs once, right after someone signs up, and walks the header: search, YoteFeed,
   YoteAI, messages, cart and the account menu. Geometry comes from lib/tourEngine.js,
   shared with the merchant and scout tours and unit-tested there, so the card is
   always fully on screen — phones included.

   Unlike the other two apps, the storefront has no sidebar: its nav IS the header, and
   two of those buttons (feed, following) collapse into the account menu on phones. A
   step whose anchor isn't visible simply renders as a centred card, so the shopper
   still learns the feature and is told where to find it. */
import React from 'react';
import { FA } from './ui.jsx';
import { measureAnchor, cardPosition, cardWidth, TOUR_M } from '../../lib/tourEngine.js';
const { useState, useEffect, useLayoutEffect, useRef, useCallback } = React;

// Bump when the steps change materially — shoppers who saw the old one get it once more.
const TOUR_VERSION = 'v1';
const keyFor = (uid) => `ym_shop_tour_done_${TOUR_VERSION}_${uid || 'anon'}`;
export const isTourDone = (uid) => { try { return localStorage.getItem(keyFor(uid)) === '1'; } catch { return false; } };
export const markTourDone = (uid) => { try { localStorage.setItem(keyFor(uid), '1'); } catch { /* private mode */ } };

const CARD_W = 300;

/* Header anchors, in the order a new shopper meets them. `mobileNote` is appended when
   the anchor is hidden (feed + following collapse into the account menu on phones), so
   the copy stays true to what's actually on their screen. */
const STEPS = [
  { anchor: 'search', title: 'Find anything 🔎',
    body: 'Search hundreds of local stores by product, brand or shop name — or browse by category from the home page.' },
  { anchor: 'feed', title: 'YoteFeed 🎬',
    body: 'Short, shoppable clips from real shops. Watch, tap a product, and buy it on the spot.',
    mobileNote: 'Find it in your account menu, top right.' },
  { anchor: 'ai', title: 'Ask YoteAI ✨',
    body: 'Your shopping assistant. Describe what you need and it finds it across the mall, compares options and answers questions.' },
  { anchor: 'messages', title: 'Chat with sellers 💬',
    body: 'Message any shop before you buy. Ask about sizes or condition, and negotiate a price — sellers can send you an offer you accept in one tap.' },
  { anchor: 'cart', title: 'Cart & checkout 🛒',
    body: 'Pay with M-Pesa, then collect at your nearest pickup hub or have it delivered. Your order is tracked end to end.' },
  { anchor: 'account', title: 'Your account 👤',
    body: 'Orders, saved addresses, followed shops and your YoteWallet all live here.' },
];

function buildSteps() {
  const intro = { center: true, title: 'Karibu YoteMarket 👋',
    body: 'You are in. Here is a 30-second tour of how to find things, talk to sellers and pay safely. You can skip anytime.' };
  const outro = { center: true, title: 'Happy shopping 🎉',
    body: 'That is everything. Anything you buy is paid by M-Pesa and tracked to collection — and you can always message a seller before you commit.' };
  return [intro, ...STEPS, outro];
}

export function ShopperTour({ onClose }) {
  const steps = useRef(buildSteps()).current;
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i] || steps[0];
  const last = i === steps.length - 1;

  const finish = useCallback(() => { onClose && onClose(); }, [onClose]);
  const next = useCallback(() => { if (last) finish(); else setI((x) => Math.min(steps.length - 1, x + 1)); }, [last, finish, steps.length]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Measure the anchor; keep it fresh on resize/scroll (the header is sticky).
  useEffect(() => {
    if (step.center) { setRect(null); return undefined; }
    const update = () => setRect(measureAnchor(step.anchor, '.kit-storefront'));
    const t1 = setTimeout(update, 60);
    const t2 = setTimeout(update, 240);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [i]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next, back]);

  // Measure the card as rendered so placement uses the real size (1px threshold stops
  // the state write looping; useLayoutEffect lands it before paint).
  const cardRef = useRef(null);
  const [size, setSize] = useState({ w: CARD_W, h: 240 });
  useLayoutEffect(() => {
    const el = cardRef.current; if (!el) return;
    const w = el.offsetWidth; const h = el.offsetHeight;
    if (Math.abs(w - size.w) > 1 || Math.abs(h - size.h) > 1) setSize({ w, h });
  });

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const cardW = cardWidth(CARD_W, vw);
  const pos = cardPosition(rect, cardW, size.h, vw, vh);
  const cardStyle = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, width: cardW, zIndex: 2, maxHeight: vh - TOUR_M * 2, overflowY: 'auto' }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(92vw, 360px)', zIndex: 2, maxHeight: vh - TOUR_M * 2, overflowY: 'auto' };

  // The anchor is hidden (collapsed into the account menu) — tell them where it lives.
  const body = (!rect && step.mobileNote) ? `${step.body} ${step.mobileNote}` : step.body;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div style={{ position: 'absolute', inset: 0, background: rect ? 'transparent' : 'rgba(10,6,30,.62)', backdropFilter: rect ? 'none' : 'blur(2px)' }} />
      {rect && (
        <div style={{
          position: 'fixed', top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12, borderRadius: 14, pointerEvents: 'none',
          boxShadow: '0 0 0 3px var(--m-primary), 0 0 0 9999px rgba(10,6,30,.62)',
          transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
        }} />
      )}

      <div ref={cardRef} className="ym-card" style={{ ...cardStyle, padding: 20, boxShadow: 'var(--m-shadow-float)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="ym-cap" style={{ fontWeight: 700, color: 'var(--m-primary)' }}>{i + 1}/{steps.length}</span>
          <button onClick={finish} aria-label="Skip tour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg3)', fontSize: 13, fontFamily: 'inherit' }}>Skip</button>
        </div>
        <div className="ym-h2" style={{ fontSize: 17, marginBottom: 6 }}>{step.title}</div>
        <p className="ym-sub" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{body}</p>

        <div style={{ display: 'flex', gap: 5, margin: '16px 0 14px', flexWrap: 'wrap' }}>
          {steps.map((_, idx) => (
            <span key={idx} style={{
              width: idx === i ? 18 : 7, height: 7, borderRadius: 9999, transition: 'width .2s',
              background: idx <= i ? 'var(--m-primary)' : 'var(--m-surface-3)', opacity: idx < i ? 0.5 : 1,
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {i > 0 && <button onClick={back} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ flex: '0 0 auto' }}><FA i="fa-arrow-left" /> Back</button>}
          <button onClick={next} className="ym-btn ym-btn-primary" style={{ flex: 1 }}>
            {last ? 'Start shopping' : (i === 0 ? 'Show me around' : 'Next')} {!last && <FA i="fa-arrow-right" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShopperTour;
