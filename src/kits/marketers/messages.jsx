/* messages.jsx — the scout's conversations with the YoteMarket team.

   Staff could already write to a marketer (Staff → Comms → Message someone) and the
   marketer could already reply — but not from here. The thread is a support ticket,
   readable only in the public Help Center, and the scout bell sent the tap to the
   Profile screen, which has no messages on it. So a scout saw a headline, tapped it,
   landed on their account details and had no way to read the rest or answer. And the
   only way to raise something themselves was a footer link out of the app.

   This screen is that conversation, inside the app scouts actually work in:
   • every thread, newest activity first, with whose turn it is;
   • the whole exchange, attributed by direction (staff can OPEN a thread, so the first
     message is not always the scout's — the same rule the Help Center renders by);
   • a reply box, and a way to start a new conversation with the team.

   The data is the same three callables the Help Center uses, so a thread answered here
   reads identically there and in the staff Support queue. Nothing new on the server. */
import React from 'react';
import { Card, Btn, Pill, Icon } from './ui.jsx';
import { ME } from './data.js';
import { createSupportTicket, listMySupportTickets, replyMySupportTicket } from '../../lib/firebase.js';
import { WHATSAPP_URL, WHATSAPP_NUMBER } from '../../lib/socials.js';
const { useState, useEffect, useCallback, useMemo } = React;

/* Drafts outlive the screen. The app shell remounts every screen when a background
   refresh brings new referral data (key={ver} in index.jsx) — without this, a scout
   halfway through a reply would lose it the moment one of their merchants activated. */
const DRAFTS = new Map();

const lastAt = (t) => {
  const r = t.replies || [];
  return (r.length && r[r.length - 1].at) || t.updatedAt || t.createdAt || 0;
};
const when = (ms) => (ms ? new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '');

/** Whose turn it is, in the scout's terms. */
function threadState(t) {
  if (t.status === 'closed') return { label:'Closed', tone:'reject' };
  if (t.status === 'resolved') return { label:'Resolved', tone:'ok' };
  if (t.lastActor === 'staff') {
    const opened = (t.direction === 'outbound' || t.source === 'staff') && !(t.replies || []).length;
    return { label: opened ? 'From the team' : 'The team replied', tone:'pending' };
  }
  return { label:'Waiting on the team', tone:'ok' };
}

/* The kit runs without Tailwind's preflight, so `width:100%` on a padded field adds the
   padding on top and the box overhangs its card. */
const FIELD = { width:'100%', boxSizing:'border-box' };

function threadOf(t) {
  const outbound = t.direction === 'outbound' || t.source === 'staff';
  return [{ author: outbound ? 'staff' : 'you', text: t.message, at: t.createdAt }, ...(t.replies || [])];
}

export function Messages({ params, user, notif }) {
  const [tickets, setTickets] = useState(null);   // null = loading
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState((params && params.thread) || null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await listMySupportTickets(); setTickets(r.tickets || []); setErr(''); }
    catch (e) { setErr(String(e?.message || '').includes('Backend not configured') ? 'Messages need a live connection.' : 'Your messages couldn’t be loaded just now.'); setTickets((x) => x || []); }
  }, []);

  /* Reload whenever a new support notification arrives — the bell is a live listener,
     so this keeps an open conversation current without polling. */
  const items = (notif && notif.items) || [];
  const supportSig = items.filter((n) => n.type === 'support').map((n) => n.id).join(',');
  useEffect(() => { load(); }, [load, supportSig]);

  // A tap on a notification for a thread lands here with that thread open.
  useEffect(() => { if (params && params.thread) { setOpenId(params.thread); setComposing(false); } }, [params]);

  /* Opening a thread clears its notifications, so the badge means "unread" rather than
     "you once got a message". */
  const unreadFor = useCallback((id) => items
    .filter((n) => n.type === 'support' && !n.read && n.data && n.data.ticketId === id)
    .map((n) => n.id), [items]);
  const markRead = notif && notif.markRead;
  useEffect(() => {
    if (!openId || !markRead) return;
    const ids = unreadFor(openId);
    if (ids.length) markRead(ids);
  }, [openId, unreadFor, markRead]);

  const sorted = useMemo(() => (tickets || []).slice().sort((a, b) => lastAt(b) - lastAt(a)), [tickets]);
  const open = sorted.find((t) => t.id === openId) || null;
  const missing = Boolean(openId && tickets && !err && !open);

  return (
    <div className="fadeup space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold t1" style={{ letterSpacing:'-.01em' }}>Messages</h1>
          <p className="t3 text-sm mt-1">You and the YoteMarket team. When staff write to you it lands here — and on your phone if notifications are on.</p>
        </div>
        {!composing && <Btn icon="pen-to-square" onClick={() => { setComposing(true); setOpenId(null); }}>Message the team</Btn>}
      </div>

      {err && (
        <Card className="p-4 text-sm flex items-center gap-3 flex-wrap" style={{ color:'var(--reject-fg)' }}>
          <Icon name="circle-exclamation" /> {err}
          <Btn kind="soft" size="sm" icon="rotate" onClick={load} className="ml-auto">Try again</Btn>
        </Card>
      )}

      {composing && <Compose user={user} onCancel={() => setComposing(false)}
        onSent={async (id) => { setComposing(false); await load(); setOpenId(id || null); }} />}

      {missing && (
        <Card className="p-4 text-sm t2"><Icon name="circle-info" className="mr-1.5" />
          That conversation isn’t on this account. If the team wrote to you at another address, sign in with that account to read it.</Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <Card className="p-0 overflow-hidden lg:col-span-2">
          {tickets === null ? <div className="p-6 t3 text-sm"><Icon name="spinner" className="fa-spin mr-2" />Loading…</div>
            : sorted.length === 0
              ? (<div className="p-6 text-center">
                  <Icon name="comments" style={{ fontSize:24, color:'var(--t3)' }} />
                  <div className="font-semibold t1 mt-2">No messages yet</div>
                  <p className="text-sm t3 mt-1">When the team writes to you it appears here. Questions about payouts, referrals or your territory? Message the team.</p>
                </div>)
              : sorted.map((t, i) => {
                const st = threadState(t);
                const msgs = threadOf(t);
                const last = msgs[msgs.length - 1];
                const unread = unreadFor(t.id).length > 0;
                const on = t.id === openId;
                return (
                  <button key={t.id} onClick={() => { setOpenId(t.id); setComposing(false); }}
                    className="w-full text-left px-4 py-3.5 block"
                    style={{ borderStyle:'solid', borderColor:'var(--line)', borderWidth: i ? '1px 0 0 0' : 0, background: on ? 'var(--purple-soft)' : 'transparent', cursor:'pointer', fontFamily:'inherit' }}>
                    <span className="flex items-center gap-2">
                      {unread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:'var(--gold)' }} aria-label="Unread" />}
                      <span className="t1 text-sm truncate flex-1" style={{ fontWeight: unread ? 700 : 600 }}>{t.subject}</span>
                      <span className="text-[11px] t3 flex-shrink-0">{when(lastAt(t))}</span>
                    </span>
                    <span className="block text-xs t3 mt-1 truncate">
                      {last && <b className="t2">{last.author === 'staff' ? 'Team: ' : 'You: '}</b>}{last && last.text}
                    </span>
                    <span className="flex items-center gap-2 mt-2"><Pill tone={st.tone}>{st.label}</Pill><span className="num text-[11px] t3">{t.ref}</span></span>
                  </button>
                );
              })}
        </Card>

        <div className="lg:col-span-3">
          {open ? <Thread key={open.id} t={open} onReplied={load} />
            : (!composing && sorted.length > 0 && (
              <Card className="p-6 text-sm t3 text-center"><Icon name="arrow-left" className="mr-1.5 hidden lg:inline" />Pick a conversation to read it.</Card>))}
        </div>
      </div>

      <p className="text-xs t3">
        Something urgent? WhatsApp the team on <a className="accent font-semibold" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{WHATSAPP_NUMBER}</a> — but put anything about money here, so there’s a record of it.
      </p>
    </div>
  );
}

function Thread({ t, onReplied }) {
  const [reply, setReplyS] = useState(() => DRAFTS.get(t.id) || '');
  const setReply = (v) => { setReplyS(v); if (v) DRAFTS.set(t.id, v); else DRAFTS.delete(t.id); };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const msgs = threadOf(t);
  const closed = t.status === 'closed';

  const send = async () => {
    setBusy(true); setErr('');
    try { await replyMySupportTicket({ id: t.id, message: reply.trim() }); setReply(''); await onReplied(); }
    catch (e) { setErr(e?.message || 'Could not send your reply.'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <h3 className="font-bold t1">{t.subject}</h3>
          <div className="num text-xs t3 mt-0.5">{t.ref} · started {when(t.createdAt)}</div>
        </div>
        <Pill tone={threadState(t).tone}>{threadState(t).label}</Pill>
      </div>

      <div className="flex flex-col gap-2.5">
        {msgs.map((m, i) => {
          const staff = m.author === 'staff';
          return (
            <div key={i} className="rounded-xl px-3.5 py-2.5 text-sm"
              style={staff ? { background:'var(--purple-soft)', marginRight:28 } : { background:'var(--surface2)', marginLeft:28 }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: staff ? 'var(--purple)' : 'var(--t3)' }}>
                {staff ? 'YoteMarket team' : 'You'}{m.at ? <span className="font-normal t3"> · {when(m.at)}</span> : null}
              </div>
              <div className="t1" style={{ whiteSpace:'pre-wrap', lineHeight:1.55 }}>{m.text}</div>
            </div>
          );
        })}
      </div>

      {closed
        ? <p className="text-sm t3 mt-4">This conversation is closed. Start a new one if you still need the team.</p>
        : (<div className="mt-4">
            <textarea className="ym-input" rows={3} maxLength={4000} value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder={t.lastActor === 'staff' ? 'Reply to the team…' : 'Add something…'} style={{ ...FIELD, resize:'vertical' }} />
            {(t.status === 'resolved') && <div className="text-xs t3 mt-1.5">Replying reopens this conversation.</div>}
            {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--reject-fg)' }}><Icon name="circle-exclamation" />{err}</div>}
            <div className="flex justify-end mt-2">
              <Btn size="sm" icon={busy ? 'spinner' : 'paper-plane'} onClick={send} disabled={busy || reply.trim().length < 2}>Send reply</Btn>
            </div>
          </div>)}
    </Card>
  );
}

/* A new conversation. It is a support ticket like any other, so it lands in the staff
   Support queue with the rest — tagged `marketer` so it can be told apart from a
   shopper's. Until the server knows that category it files it as `other`, which is
   exactly what a scout's message was filed as before. */
function Compose({ user, onCancel, onSent }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const email = (user && user.email) || ME.email || '';

  const STARTERS = ['A payout', 'A merchant I referred', 'My territory', 'The marketing kit'];

  const send = async () => {
    setErr('');
    if (!email) { setErr('Your account has no email address, which the team needs to reply. Ask staff to add one.'); return; }
    setBusy(true);
    try {
      const r = await createSupportTicket({ name: ME.name || '', email, category: 'marketer', subject: subject.trim(), message: message.trim() });
      onSent(r && r.id);
    } catch (e) {
      const m = String(e?.message || '');
      setErr(m.includes('Backend not configured') ? 'Messages need a live connection.' : (m || 'Could not send your message.'));
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold t1 mb-1">Message the team</h3>
      <p className="text-sm t3 mb-3">It goes to the people who run the Marketer Program. Replies come back here.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {STARTERS.map((s) => (
          <button key={s} onClick={() => setSubject(s)} className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)', cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      <input className="ym-input mb-2" maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={FIELD} />
      <textarea className="ym-input" rows={5} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="What do you need? Include the store name or M-Pesa code if it’s about one." style={{ ...FIELD, resize:'vertical' }} />
      {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--reject-fg)' }}><Icon name="circle-exclamation" />{err}</div>}
      <div className="flex items-center justify-end gap-2 mt-3">
        <Btn kind="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Btn>
        <Btn size="sm" icon={busy ? 'spinner' : 'paper-plane'} onClick={send} disabled={busy || !subject.trim() || message.trim().length < 5}>Send</Btn>
      </div>
    </Card>
  );
}

/** Unread messages from the team — the Messages nav badge. */
export const unreadSupport = (notif) => ((notif && notif.items) || []).filter((n) => n.type === 'support' && !n.read).length;
