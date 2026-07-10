/* ScreenCoach.jsx — per-screen contextual coach-marks. Unlike the full DashboardTour
   (one long walkthrough of every section), a ScreenCoach fires the FIRST time a
   merchant opens a specific screen (Products, Wallet, Delivery, POS) and teaches
   that area in-context by spotlighting its real controls. Shows once per screen per
   merchant, is dismissible, degrades to a centered card when an anchor isn't on
   screen, and stays out of the way until the main dashboard tour is done. */
import React from 'react';
import { useAuth } from '../../lib/useAuth.jsx';
import { isTourDone } from './Tour.jsx';
import { FA } from './primitives.jsx';
const { useState, useEffect, useRef, useCallback } = React;

const VERSION = 'v1';
const keyFor = (id, uid) => `ym_coach_${id}_${VERSION}_${uid || 'anon'}`;
const coachSeen = (id, uid) => { try { return localStorage.getItem(keyFor(id, uid)) === '1'; } catch { return false; } };
const markCoachSeen = (id, uid) => { try { localStorage.setItem(keyFor(id, uid), '1'); } catch { /* private mode */ } };

function measure(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch { /* older browsers */ }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null; // hidden (e.g. off-screen / not rendered)
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const CARD_W = 300;
function cardPosition(rect) {
  if (!rect || typeof window === 'undefined') return null; // centered
  const vw = window.innerWidth; const vh = window.innerHeight;
  let left = rect.left + rect.width + 16; // prefer to the right of the anchor
  let top = rect.top;
  if (left + CARD_W > vw - 12) { // no room right → below the anchor
    left = Math.max(rect.left, 12);
    top = rect.top + rect.height + 14;
  }
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top = Math.max(12, Math.min(top, vh - 240));
  return { left, top };
}

/**
 * <ScreenCoach id="products" steps={[{ selector, title, body }, …]} />
 * Renders nothing until: the main tour is done, this coach hasn't been seen, and the
 * first step's anchor is on screen. `gate` (optional) can further delay showing (e.g.
 * wait for live data). Set `enabled={false}` to suppress entirely.
 */
export function ScreenCoach({ id, steps, enabled = true, gate = true }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const startedRef = useRef(false);
  const list = Array.isArray(steps) ? steps.filter(Boolean) : [];
  const step = list[i] || list[0] || {};
  const last = i === list.length - 1;

  // Decide whether to run — once. Wait briefly for the screen's controls to render.
  useEffect(() => {
    if (!enabled || !gate || startedRef.current || list.length === 0) return undefined;
    // Stay out of the way until the big dashboard tour has been taken/skipped.
    if (!isTourDone(uid)) return undefined;
    if (coachSeen(id, uid)) return undefined;
    let tries = 0; let t;
    const attempt = () => {
      const s0 = list[0];
      if (!s0.selector || document.querySelector(s0.selector)) {
        startedRef.current = true; setOpen(true); return;
      }
      if (tries++ < 24) t = setTimeout(attempt, 150); // ~3.6s of grace for data to load
    };
    t = setTimeout(attempt, 300);
    return () => clearTimeout(t);
  }, [id, uid, enabled, gate, list.length]); // eslint-disable-line

  const finish = useCallback(() => { markCoachSeen(id, uid); setOpen(false); }, [id, uid]);
  const next = useCallback(() => { if (last) finish(); else setI((x) => Math.min(list.length - 1, x + 1)); }, [last, finish, list.length]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Re-measure the current anchor after layout settles + on resize/scroll.
  useEffect(() => {
    if (!open) return undefined;
    let t1; let t2;
    const update = () => setRect(measure(step.selector));
    t1 = setTimeout(update, 60);
    t2 = setTimeout(update, 240);
    const onWin = () => setRect(measure(step.selector));
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onWin); window.removeEventListener('scroll', onWin, true); };
  }, [open, i]); // eslint-disable-line

  // Keyboard: Esc dismisses, ←/→ navigate.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, next, back]);

  if (!open || list.length === 0) return null;

  const pos = cardPosition(rect);
  const cardStyle = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, width: CARD_W }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(92vw, 340px)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 260 }} role="dialog" aria-modal="true" aria-label={`${id} tips`}>
      <div style={{ position: 'absolute', inset: 0, background: rect ? 'transparent' : 'rgba(8,10,24,.6)', backdropFilter: rect ? 'none' : 'blur(2px)' }} />
      {rect && (
        <div style={{ position: 'fixed', top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 14, pointerEvents: 'none', boxShadow: '0 0 0 3px var(--m-primary), 0 0 0 9999px rgba(8,10,24,.6)', transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease' }} />
      )}

      <div className="ym-card" style={{ ...cardStyle, zIndex: 2, padding: 20, boxShadow: 'var(--m-shadow-float)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="ym-cap" style={{ fontWeight: 700, color: 'var(--m-primary)', display: 'flex', alignItems: 'center', gap: 6 }}><FA i="fa-lightbulb" style={{ fontSize: 12 }} /> Tip{list.length > 1 ? ` · ${i + 1}/${list.length}` : ''}</span>
          <button onClick={finish} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg3)', fontSize: 13, fontFamily: 'inherit' }}>Skip</button>
        </div>
        <div className="ym-h2" style={{ fontSize: 16.5, marginBottom: 6 }}>{step.title}</div>
        <p className="ym-sub" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{step.body}</p>

        {list.length > 1 && (
          <div style={{ display: 'flex', gap: 5, margin: '15px 0 13px' }}>
            {list.map((_, idx) => (
              <span key={idx} style={{ width: idx === i ? 18 : 7, height: 7, borderRadius: 9999, background: idx <= i ? 'var(--m-primary)' : 'var(--m-surface-3)', opacity: idx < i ? 0.5 : 1, transition: 'width .2s' }} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: list.length > 1 ? 0 : 16 }}>
          {i > 0 && <button onClick={back} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ flex: '0 0 auto' }}><FA i="fa-arrow-left" /> Back</button>}
          <button onClick={next} className="ym-btn ym-btn-primary" style={{ flex: 1 }}>{last ? 'Got it' : 'Next'} {!last && <FA i="fa-arrow-right" />}</button>
        </div>
      </div>
    </div>
  );
}
