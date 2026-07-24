/* Bell.jsx — the scout app's notification bell.

   The topbar previously had a DECORATIVE bell: no click handler, and a gold dot that
   was always lit regardless of whether anything had happened. It looked like an unread
   badge and never meant anything. This replaces it with the real thing.

   Presentation is local because the scout kit has its own tokens (--purple/--gold, .card,
   .t1/.t2/.t3) rather than the --m-* system the storefront and dashboard share — but the
   DATA comes from the same useNotifications hook, so counts and mark-read behaviour stay
   identical across all three apps. */
import React from 'react';
import { Icon } from './ui.jsx';
import { useNotifications, notifMeta, shortAge } from '../../lib/notifications.js';
const { useState, useRef, useEffect } = React;

const TONE = { primary: 'var(--purple)', ok: 'var(--green)', warn: 'var(--gold)', muted: 'var(--t3)' };

export function ScoutBell({ user, go }) {
  const { items, unread, enabled, markRead, markAllRead, dismiss } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (!enabled) return null;

  const activate = (n) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    // Scout-relevant destinations; anything else just marks read where it sits.
    if (!go) return;
    if (n.type === 'payout') { go('payouts'); return; }
    if (n.type === 'chat' || n.type === 'support') { go('profile'); return; }
    if (n.type === 'order') { go('referrals'); return; }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center t2 relative"
        style={{ background: 'var(--surface2)', border: '1px solid var(--line)' }}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open} aria-haspopup="true">
        <Icon name="bell" />
        {unread > 0 && (
          <span className="num absolute -top-1 -right-1 text-[10px] font-bold rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center"
            style={{ background: 'var(--gold)', color: 'var(--on-accent)', border: '2px solid var(--surface)' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-50 overflow-hidden" role="dialog" aria-label="Notifications"
          style={{ top: 46, width: 'min(330px, calc(100vw - 24px))', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="font-bold t1 text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--purple)' }}>Mark all read</button>
            )}
          </div>

          <div style={{ maxHeight: 'min(60vh, 400px)', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Icon name="bell-slash" style={{ fontSize: 20, color: 'var(--t3)' }} />
                <div className="text-xs t3 mt-2">Nothing yet. Payout and referral updates land here.</div>
              </div>
            ) : items.map((n) => {
              const meta = notifMeta(n.type);
              return (
                <div key={n.id} className="flex items-start gap-2.5 px-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--line)', background: n.read ? 'transparent' : 'var(--surface2)' }}>
                  <button onClick={() => activate(n)} title="Open"
                    className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--surface2)', color: TONE[meta.tone] || TONE.muted }}>
                      <Icon name={meta.icon.replace(/^fa-/, '')} style={{ fontSize: 12 }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="t1 truncate flex-1" style={{ fontSize: 13, fontWeight: n.read ? 600 : 700 }}>{n.title}</span>
                        <span className="text-[11px] t3 flex-shrink-0">{shortAge(n.at)}</span>
                      </span>
                      {n.body && <span className="block text-xs t3 mt-0.5" style={{ lineHeight: 1.45 }}>{n.body}</span>}
                    </span>
                  </button>
                  <button onClick={() => dismiss(n.id)} aria-label="Dismiss" title="Dismiss"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2, flexShrink: 0 }}>
                    <Icon name="xmark" style={{ fontSize: 12 }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoutBell;
