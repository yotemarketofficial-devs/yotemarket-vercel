/* NotificationBell.jsx — the bell + dropdown panel, for the surfaces built on the
   shared `--m-*` tokens and `ym-*` classes (storefront and merchant dashboard).

   The scout app renders its own bell against its own tokens, but both read the same
   useNotifications hook, so the query, unread count and mark-read behaviour can't
   diverge between them.

   Behaviour worth knowing:
   • Opening the panel does NOT mark everything read — you mark a row read by acting on
     it, or explicitly via "Mark all read". Auto-clearing on open would hide things a
     user hasn't actually seen.
   • Rows are buttons with a real onOpen route, so a notification is a way to GET to the
     thing, not just an announcement. */
import React from 'react';
import { useNotifications, notifMeta, shortAge } from '../lib/notifications.js';
const { useState, useRef, useEffect } = React;

const FA = ({ i, style }) => <i className={`fas ${i}`} style={style} aria-hidden="true" />;

const TONE = {
  primary: 'var(--m-primary)',
  ok: 'var(--m-success, #10B981)',
  warn: 'var(--m-warning, #F59E0B)',
  muted: 'var(--m-fg3)',
};

export default function NotificationBell({ user, onOpenNotification, className = 'icon-btn', audience }) {
  const { items, unread, enabled, markRead, markAllRead, dismiss } = useNotifications(user, audience);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on Escape and on any click outside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (!enabled) return null;   // signed out / no backend — no dead bell

  const activate = (n) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    onOpenNotification && onOpenNotification(n);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} className={className}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open} aria-haspopup="true">
        <FA i="fa-bell" />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9999,
            background: 'var(--m-secondary, var(--m-primary))', color: '#fff', fontSize: 10.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
            border: '2px solid var(--m-bg)' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="ym-card" role="dialog" aria-label="Notifications"
          style={{ position: 'absolute', right: 0, top: 46, width: 'min(340px, calc(100vw - 24px))',
            zIndex: 200, padding: 0, overflow: 'hidden', boxShadow: 'var(--m-shadow-float)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--m-border)' }}>
            <span className="ym-h3" style={{ fontSize: 14 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--m-primary)', padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 'min(60vh, 420px)', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center' }}>
                <FA i="fa-bell-slash" style={{ fontSize: 22, color: 'var(--m-fg4, var(--m-fg3))' }} />
                <div className="ym-cap" style={{ marginTop: 8 }}>Nothing yet. Order updates, replies and offers land here.</div>
              </div>
            ) : items.map((n) => {
              const meta = notifMeta(n.type);
              return (
                <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px',
                  borderBottom: '1px solid var(--m-border)', background: n.read ? 'transparent' : 'var(--m-active-bg, var(--m-surface-2))' }}>
                  <button onClick={() => activate(n)} title="Open"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0,
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: 'var(--m-surface-3, var(--m-surface-2))',
                      color: TONE[meta.tone] || TONE.muted }}>
                      <FA i={meta.icon} style={{ fontSize: 13 }} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span className="ym-h3" style={{ fontSize: 13.5, fontWeight: n.read ? 600 : 700,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{n.title}</span>
                        <span className="ym-cap" style={{ flexShrink: 0, fontSize: 11 }}>{shortAge(n.at)}</span>
                      </span>
                      {n.body && <span className="ym-cap" style={{ display: 'block', marginTop: 2, lineHeight: 1.45 }}>{n.body}</span>}
                    </span>
                  </button>
                  <button onClick={() => dismiss(n.id)} aria-label="Dismiss" title="Dismiss"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg3)', padding: 2, flexShrink: 0 }}>
                    <FA i="fa-xmark" style={{ fontSize: 12 }} />
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
