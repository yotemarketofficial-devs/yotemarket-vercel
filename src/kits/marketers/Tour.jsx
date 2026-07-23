/* Tour.jsx — Scout app guided tour (spotlight coach-marks).

   Mirrors the mechanics of the merchant dashboard tour (dashboard/Tour.jsx): dim the
   screen, spotlight each real sidebar item, switch to that screen so its content shows
   behind the hole, keyboard-navigable, and fall back to a centred card when the anchor
   isn't on screen (the sidebar is hidden on mobile). Auto-runs once per scout and is
   replayable from the "?" in the top bar.

   It is a separate component rather than an import of the merchant one because the two
   kits are different design systems: that file is bound to useMerchant, navForRole and
   the dashboard's own class/token names, none of which exist inside .kit-marketers.
   Only the mechanics are shared — this uses the marketers Card/Btn/Icon and tokens.

   Copy follows the brand voice rules in the Marketing kit: no emoji, plain sentences,
   "you/your" to the reader. */
import React from 'react';
import { Card, Btn, Icon } from './ui.jsx';
const { useState, useEffect, useRef, useCallback } = React;

// Bump when the steps change materially — existing scouts have the old version marked
// done, so a bump is what re-runs the tour once to show what's new.
const TOUR_VERSION = 'v1';
const keyFor = (uid) => `ym_mk_tour_done_${TOUR_VERSION}_${uid || 'anon'}`;
export const isTourDone = (uid) => { try { return localStorage.getItem(keyFor(uid)) === '1'; } catch { return false; } };
export const markTourDone = (uid) => { try { localStorage.setItem(keyFor(uid), '1'); } catch { /* private mode */ } };

/* Per-section copy. Only nav keys present here become steps, so a new nav item simply
   doesn't appear in the tour until it's given an entry. Emoji in the TOUR titles are
   friendly onboarding — they match the merchant dashboard tour. This is distinct from
   the Marketing kit's "no emoji" rule, which governs the messages a scout SENDS to
   merchants; those templates stay emoji-free. */
const COPY = {
  dashboard:   { title: 'Your dashboard 📊', body: 'Everything you have earned across all cycles, how far you are from the next checkpoint, and your referral link ready to share.' },
  kit:         { title: 'Marketing kit 📣', body: 'The important one. Your invite link, messages you can send as they are, campaign posters, and a flyer printed with your own code.' },
  referrals:   { title: 'My referrals 🏪', body: 'Every shop you have signed up. A merchant only counts once they make their first paid sale — their free month does not count.' },
  leaderboard: { title: 'Leaderboard 🏆', body: 'How you rank against other scouts across Kenya this month. Top scouts get invited to interview for full-time roles.' },
  payouts:     { title: 'Payouts 💸', body: 'Cash out to M-Pesa once your balance reaches the minimum, and track every withdrawal you have made.' },
  simulator:   { title: 'Simulator 🧮', body: 'Try the numbers before you chase them — see exactly what a given number of activated merchants pays.' },
  profile:     { title: 'Your profile 👤', body: 'Your details, county and M-Pesa number. Keep the payout number correct, it is where your money goes.' },
};

function buildSteps(nav) {
  const intro = {
    center: true,
    title: 'Welcome to your scout dashboard 👋',
    body: 'A quick tour of how you sign up shops and get paid for it. Under a minute, and you can skip anytime.',
  };
  const outro = {
    center: true, screen: 'kit',
    title: 'Start with your Marketing kit 🚀',
    body: 'Copy your invite link and send it to one shop today. Any merchant who signs up with your code gets their first month free, and you get credited when they activate. Tap the ? in the top bar to replay this tour.',
  };
  const steps = nav
    .filter((n) => COPY[n.key])
    .map((n) => ({ anchor: n.key, screen: n.key, ...COPY[n.key] }));
  return [intro, ...steps, outro];
}

/* Both the desktop sidebar and the mobile pill strip carry data-tour="<key>", and only
   one is visible at a time. Pick the VISIBLE one so the spotlight lands on the pills on
   a phone instead of always falling back to the centred card. */
function measure(anchor) {
  if (!anchor) return null;
  const els = document.querySelectorAll(`.kit-marketers [data-tour="${anchor}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // hidden (display:none)
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* older browsers */ }
    const r2 = el.getBoundingClientRect();
    return { top: r2.top, left: r2.left, width: r2.width, height: r2.height };
  }
  return null;
}

const CARD_W = 306;
function cardPosition(rect) {
  if (!rect || typeof window === 'undefined') return null; // centred
  const vw = window.innerWidth; const vh = window.innerHeight;
  let left = rect.left + rect.width + 16;   // prefer to the right of the anchor
  let top = rect.top;
  if (left + CARD_W > vw - 12) {            // no room right → drop below
    left = rect.left;
    top = rect.top + rect.height + 14;
  }
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top = Math.max(12, Math.min(top, vh - 250));
  return { left, top };
}

export function MarketerTour({ nav, setActive, onClose }) {
  const steps = useRef(buildSteps(nav || [])).current;   // fixed at open time
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i] || steps[0];
  const last = i === steps.length - 1;

  const finish = useCallback(() => { onClose && onClose(); }, [onClose]);
  const next = useCallback(() => { if (last) finish(); else setI((x) => Math.min(steps.length - 1, x + 1)); }, [last, finish, steps.length]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Switch to the step's screen so its content shows behind the spotlight.
  useEffect(() => { if (step.screen && setActive) setActive(step.screen); }, [i]); // eslint-disable-line

  // Measure the anchor after the screen switch settles; keep it fresh on resize/scroll.
  useEffect(() => {
    if (step.center) { setRect(null); return undefined; }
    const update = () => setRect(measure(step.anchor));
    const t1 = setTimeout(update, 70);
    const t2 = setTimeout(update, 260);      // second pass after layout/smooth-scroll
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [i]); // eslint-disable-line

  // Keyboard: Esc skips, arrows navigate.
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
    ? { position: 'fixed', top: pos.top, left: pos.left, width: CARD_W, zIndex: 2 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(92vw, 366px)', zIndex: 2 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} role="dialog" aria-modal="true" aria-label="Scout dashboard tour">
      {/* click-catcher — blocks the app underneath so nothing is triggered by accident */}
      <div style={{ position: 'absolute', inset: 0, background: rect ? 'transparent' : 'rgba(20,8,37,.66)', backdropFilter: rect ? 'none' : 'blur(2px)' }} />
      {/* spotlight: a transparent hole whose huge box-shadow dims everything else */}
      {rect && (
        <div style={{
          position: 'fixed', top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12, borderRadius: 14, pointerEvents: 'none',
          boxShadow: '0 0 0 3px var(--purple), 0 0 0 9999px rgba(20,8,37,.66)',
          transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
        }} />
      )}

      <Card style={cardStyle} className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: 'var(--purple)' }}>Tour · {i + 1}/{steps.length}</span>
          <button onClick={finish} aria-label="Skip tour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--t3)' }}>Skip</button>
        </div>
        <div className="font-bold t1" style={{ fontSize: 17, marginBottom: 6 }}>{step.title}</div>
        <p className="t2" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{step.body}</p>

        <div className="flex flex-wrap gap-1.5" style={{ margin: '16px 0 14px' }}>
          {steps.map((_, idx) => (
            <span key={idx} style={{
              width: idx === i ? 18 : 7, height: 7, borderRadius: 9999, transition: 'width .2s',
              background: idx <= i ? 'var(--purple)' : 'var(--surface2)', opacity: idx < i ? 0.5 : 1,
            }} />
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {i > 0 && <Btn kind="ghost" size="sm" icon="arrow-left" onClick={back}>Back</Btn>}
          <Btn kind="primary" onClick={next} className="flex-1" iconRight={last ? undefined : 'arrow-right'}>
            {last ? 'Finish' : (i === 0 ? 'Start tour' : 'Next')}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

export default MarketerTour;
