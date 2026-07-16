/* Tour.jsx — Merchant dashboard guided tour (spotlight coach-marks).
   A self-contained overlay that dims the screen, highlights each real sidebar
   section one at a time (switching to that screen so its content shows), and
   walks through the dashboard. Role-aware (only steps the user can see),
   keyboard-navigable, and degrades to a centered card when the anchor isn't on
   screen (e.g. the sidebar is hidden on mobile). Auto-runs once per merchant;
   replayable from the top-bar “?” button. */
import React from 'react';
import { useMerchant } from './merchant.jsx';
import { navForRole } from './layout.jsx';
import { FA } from './primitives.jsx';
const { useState, useEffect, useRef, useCallback } = React;

// Bump when steps change materially — existing merchants have the old version
// marked done, so a bump is what re-runs the tour once to show what's new.
const TOUR_VERSION = 'v2';
const keyFor = (uid) => `ym_dash_tour_done_${TOUR_VERSION}_${uid || 'anon'}`;
export const isTourDone = (uid) => { try { return localStorage.getItem(keyFor(uid)) === '1'; } catch { return false; } };
export const markTourDone = (uid) => { try { localStorage.setItem(keyFor(uid), '1'); } catch { /* private mode */ } };

// Per-section copy. Only nav keys present here become tour steps.
const COPY = {
  overview:     { title: 'Your dashboard',        body: 'A live snapshot of orders, revenue and anything that needs attention. Start here each day.' },
  pos:          { title: 'Point of sale',         body: 'Sell in person and print receipts — your physical till, sharing the same products and stock.' },
  assistant:    { title: 'YoteAI',                body: 'Your AI assistant. It drafts product descriptions, answers buyers, and gives quick advice.' },
  insight:      { title: 'YoteMarket Insight',    body: 'AI briefs built from your real sales — spot what’s selling and what to stock next.' },
  sales:        { title: 'Sales',                 body: 'Every order in one place. Track fulfilment, hand-offs to riders, and customer details.' },
  products:     { title: 'My Products',           body: 'Add items with photos, prices and stock. Each gets an automatic SKU and a storefront listing.' },
  feed:         { title: 'YoteFeed',              body: 'Post short, shoppable clips to reach more buyers — your products, in motion.' },
  followers:    { title: 'Followers',             body: 'Broadcast shoppable posts and follower-only offers straight to everyone who follows your store.' },
  delivery:     { title: 'Delivery',              body: 'Set your delivery fee, free-delivery threshold and dispatch rules. These drive checkout.' },
  refunds:      { title: 'Refunds',               body: 'Buyers raise refund requests here. Review the order, reply, and our team helps settle it fairly.' },
  chat:         { title: 'Chats',                 body: 'Message buyers to answer questions and close sales. On Pro, AI Deal Assist shows what they have in their cart from your store and suggests a price to seal the deal.' },
  wallet:       { title: 'Wallet',                body: 'Track your earnings and withdraw to M-Pesa. Set your payout method here.' },
  subscription: { title: 'Subscription',          body: 'Your plan decides what you can use — anything showing a 🔒 in the sidebar comes with a higher tier. Manage it, upgrade, or add hub deliveries here.' },
  team:         { title: 'Team',                  body: 'Invite cashiers and managers with their own logins and the right permissions.' },
  settings:     { title: 'Settings',              body: 'Shop profile, social links, tax details, followers — and closing your store.' },
};

function buildSteps(role) {
  const intro = { center: true, title: 'Welcome to your dashboard 👋', body: 'Here’s a quick tour of everything you can do to run your store. It takes about a minute — you can skip anytime.' };
  const outro = { center: true, screen: 'overview', title: 'You’re all set! 🎉', body: 'That’s the tour. Follow the “Get started” checklist on your Dashboard to finish setting up — and tap the ? in the top bar to replay this anytime.' };
  const nav = navForRole(role)
    .filter((n) => COPY[n.key])
    .map((n) => ({ selector: `.dash-aside [data-tour="${n.key}"]`, screen: n.key, ...COPY[n.key] }));
  return [intro, ...nav, outro];
}

function measure(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* older browsers */ }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null; // hidden (e.g. sidebar on mobile)
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const CARD_W = 300;
function cardPosition(rect) {
  if (!rect || typeof window === 'undefined') return null; // centered
  const vw = window.innerWidth; const vh = window.innerHeight;
  let left = rect.left + rect.width + 16; // prefer to the right of the anchor
  let top = rect.top;
  if (left + CARD_W > vw - 12) { // no room right → drop below the anchor
    left = rect.left;
    top = rect.top + rect.height + 14;
  }
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top = Math.max(12, Math.min(top, vh - 230));
  return { left, top };
}

export function DashboardTour({ setActive, onClose }) {
  const { role } = useMerchant();
  const steps = useRef(buildSteps(role)).current; // fixed at open time
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i] || steps[0];
  const last = i === steps.length - 1;

  const finish = useCallback(() => { onClose && onClose(); }, [onClose]);
  const next = useCallback(() => { if (last) finish(); else setI((x) => Math.min(steps.length - 1, x + 1)); }, [last, finish, steps.length]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Switch to the step's screen so its content shows behind the spotlight.
  useEffect(() => { if (step.screen && setActive) setActive(step.screen); }, [i]); // eslint-disable-line

  // Measure the anchor after the screen switch settles, and keep it fresh on
  // resize/scroll.
  useEffect(() => {
    if (step.center) { setRect(null); return undefined; }
    let t1; let t2;
    const update = () => setRect(measure(step.selector));
    t1 = setTimeout(update, 70);
    t2 = setTimeout(update, 260); // second pass after any smooth-scroll/layout
    const onWin = () => setRect(measure(step.selector));
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onWin); window.removeEventListener('scroll', onWin, true); };
  }, [i]); // eslint-disable-line

  // Keyboard: Esc skips, ←/→ navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next, back]);

  const pos = cardPosition(rect);
  const cardStyle = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, width: CARD_W }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(92vw, 360px)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} role="dialog" aria-modal="true" aria-label="Dashboard tour">
      {/* Click-catcher: blocks the app underneath (no accidental navigation). */}
      <div style={{ position: 'absolute', inset: 0, background: rect ? 'transparent' : 'rgba(8,10,24,.66)', backdropFilter: rect ? 'none' : 'blur(2px)' }} />
      {/* Spotlight: a transparent hole around the anchor; its huge box-shadow dims
          everything else and a 3px ring frames the highlighted item. */}
      {rect && (
        <div style={{ position: 'fixed', top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 14, pointerEvents: 'none', boxShadow: '0 0 0 3px var(--m-primary), 0 0 0 9999px rgba(8,10,24,.66)', transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease' }} />
      )}

      <div className="ym-card" style={{ ...cardStyle, zIndex: 2, padding: 20, boxShadow: 'var(--m-shadow-float)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="ym-cap" style={{ fontWeight: 700, color: 'var(--m-primary)' }}>Tour · {i + 1}/{steps.length}</span>
          <button onClick={finish} aria-label="Skip tour" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg3)', fontSize: 13, fontFamily: 'inherit' }}>Skip</button>
        </div>
        <div className="ym-h2" style={{ fontSize: 17, marginBottom: 6 }}>{step.title}</div>
        <p className="ym-sub" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{step.body}</p>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: 5, margin: '16px 0 14px', flexWrap: 'wrap' }}>
          {steps.map((_, idx) => (
            <span key={idx} style={{ width: idx === i ? 18 : 7, height: 7, borderRadius: 9999, background: idx === i ? 'var(--m-primary)' : (idx < i ? 'var(--m-primary)' : 'var(--m-surface-3)'), opacity: idx < i ? 0.5 : 1, transition: 'width .2s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {i > 0 && <button onClick={back} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ flex: '0 0 auto' }}><FA i="fa-arrow-left" /> Back</button>}
          <button onClick={next} className="ym-btn ym-btn-primary" style={{ flex: 1 }}>{last ? 'Finish' : (i === 0 ? 'Start tour' : 'Next')} {!last && <FA i="fa-arrow-right" />}</button>
        </div>
      </div>
    </div>
  );
}
