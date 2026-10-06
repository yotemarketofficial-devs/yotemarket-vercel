/* support.jsx — Staff Support console (customer-service desk). Lists help-desk
   tickets from the Help Center, filter by status, open a thread to reply and
   change status/assignment. Reads via staffListSupportTickets, acts via
   staffReplySupportTicket; falls back to demo data so the console always renders. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Icon, Stat, EmptyState, Modal } from './ui.jsx';
import { useStaffResource, fetchSupportTickets, replySupportTicket, deleteSupportTicket } from './service.js';
import { useDialogs } from './dialogs.jsx';
const { useState, useEffect } = React;

const CAT_LABEL = { order:'Order', payment:'Payment', delivery:'Delivery', account:'Account', selling:'Selling', feed:'YoteFeed', refund:'Refund', marketer:'Marketer', other:'Other' };
const STATUS_TONE = { open:'amber', pending:'blue', resolved:'ok', closed:'red' };
const STATUS_LABEL = { open:'Open', pending:'In progress', resolved:'Resolved', closed:'Closed' };
const FILTERS = ['open', 'pending', 'resolved', 'all'];

const fmt = (ms) => { try { return new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }); } catch { return ''; } };
// Compact "time ago" (e.g. 12m / 3h / 2d) for SLA/age badges.
const fmtAgo = (ms) => { if (!ms) return ''; const s = Math.max(0, (Date.now() - ms) / 1000); if (s < 3600) return Math.round(s/60) + 'm'; if (s < 86400) return Math.round(s/3600) + 'h'; return Math.round(s/86400) + 'd'; };
const slaTone = (ms) => { const h = (Date.now() - ms) / 3600e3; return h >= 8 ? 'red' : h >= 2 ? 'amber' : 'blue'; };
const PRIORITIES = [['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']];
const PRIORITY_TONE = { low:'ok', normal:'blue', high:'amber', urgent:'red' };
// Canned replies — one-tap templates to keep responses fast + consistent.
const CANNED = [
  { label:'Ask for order no.', text:'Thanks for reaching out! Could you share your order number (YM-XXXXXX) so I can look into this right away?' },
  { label:'Checking payment', text:'Thanks for your patience — I’m checking your payment against our records now and will update you shortly.' },
  { label:'Refund initiated', text:'I’ve initiated your refund to your YoteWallet — it should reflect shortly. Is there anything else I can help with?' },
  { label:'Escalated', text:'Thanks for flagging this. I’ve escalated it to the relevant team and will follow up here as soon as I have an update.' },
  { label:'Resolved?', text:'Glad that’s sorted! I’ll mark this as resolved, but reply anytime if you need more help.' },
];

const TICKETS_DEMO = [
  { id:'d1', ref:'YM-7F3K9Q', name:'Wanjiru K.', email:'wanjiru@example.com', category:'order', subject:'Haven’t received my pickup code', message:'I paid for order YM-1042 two hours ago but no pickup code came through. Can you check?', status:'open', priority:'normal', source:'app', createdAt:Date.now()-2*3600e3, updatedAt:Date.now()-2*3600e3, replies:[], lastActor:'customer' },
  { id:'d2', ref:'YM-2M8XQ4', name:'Otieno M.', email:'otieno@example.com', category:'refund', subject:'Item arrived damaged', message:'The blender I collected at CBD hub was cracked. I’d like a refund or replacement.', status:'pending', priority:'high', source:'web', createdAt:Date.now()-26*3600e3, updatedAt:Date.now()-3*3600e3, replies:[{ author:'staff', agentEmail:'support@yotemarket.com', text:'So sorry about that — could you share a photo? We’ll hold the release and sort a refund.', at:Date.now()-3*3600e3 }], lastActor:'staff' },
];

export function Support({ isAdmin }){ // eslint-disable-line no-unused-vars
  const { data, live, reload } = useStaffResource(fetchSupportTickets, { tickets: TICKETS_DEMO, counts:{} });
  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const all = data.tickets || [];

  const ql = q.trim().toLowerCase();
  const shown = all
    .filter((t) => filter === 'all' ? true : t.status === filter)
    .filter((t) => !ql || [t.subject, t.ref, t.name, t.email, t.message].some((x) => (x||'').toLowerCase().includes(ql)))
    // Awaiting-reply first, then urgent, then most-recently updated.
    .sort((a, b) => {
      const aw = (x) => (x.lastActor === 'customer' && !['resolved','closed'].includes(x.status)) ? 1 : 0;
      if (aw(b) !== aw(a)) return aw(b) - aw(a);
      const pr = { urgent:3, high:2, normal:1, low:0 };
      if ((pr[b.priority]||1) !== (pr[a.priority]||1)) return (pr[b.priority]||1) - (pr[a.priority]||1);
      return (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0);
    });
  const count = (s) => all.filter((t) => t.status === s).length;

  // Keep the open ticket in sync with fresh data after a reload.
  useEffect(() => { if (open) { const fresh = all.find((t) => t.id === open.id); if (fresh) setOpen(fresh); } /* eslint-disable-next-line */ }, [data]);

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="headset" title="Customer support" sub={live ? 'Help Center requests — reply, resolve and route' : 'Sample tickets — connect the backend for live requests'}
        action={<Seg value={filter} onChange={setFilter} options={FILTERS} fmt={(o) => o === 'all' ? 'All' : STATUS_LABEL[o]} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Open" value={count('open')} icon="envelope-open-text" tone="amber" />
        <Stat label="In progress" value={count('pending')} icon="spinner" tone="blue" />
        <Stat label="Resolved" value={count('resolved')} icon="circle-check" tone="green" />
        <Stat label="All requests" value={all.length} icon="headset" tone="pri" />
      </div>

      <div className="relative" style={{ maxWidth:420 }}>
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search subject, ref, name or email…" className="ym-input pl-9" style={{ width:'100%' }} />
      </div>

      <div className="space-y-3">
        {shown.length === 0
          ? <Card className="p-2"><EmptyState icon="circle-check" tone="green" title="Inbox zero." sub="No requests in this view." /></Card>
          : shown.map((t) => {
            const lastStaff = (t.replies || []).filter((r) => r.author === 'staff').slice(-1)[0];
            const waiting = t.lastActor === 'customer' && t.status !== 'resolved' && t.status !== 'closed';
            return (
              <Card key={t.id} className="p-4 cursor-pointer" onClick={() => setOpen(t)} style={waiting ? { borderLeft:'3px solid var(--amber)' } : null}>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="user"/></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold t1 flex items-center gap-2 flex-wrap">
                      {t.subject}
                      {t.source === 'staff' && <Pill tone="pri">Outreach</Pill>}
                      <Pill tone={STATUS_TONE[t.status] || 'blue'}>{STATUS_LABEL[t.status] || t.status}</Pill>
                      {t.priority && t.priority !== 'normal' && <Pill tone={PRIORITY_TONE[t.priority] || 'blue'}>{t.priority}</Pill>}
                      {waiting && <Pill tone={slaTone(t.updatedAt || t.createdAt)}>Waiting {fmtAgo(t.updatedAt || t.createdAt)}</Pill>}
                    </div>
                    <div className="text-sm t2 mt-0.5 truncate">{lastStaff ? <><span className="t3">You: </span>{lastStaff.text}</> : t.message}</div>
                    <div className="text-xs t3 mt-1 num">{t.ref} · {t.name || t.email} · {CAT_LABEL[t.category] || t.category} · {fmt(t.updatedAt || t.createdAt)}</div>
                  </div>
                  <Icon name="chevron-right" className="t3 self-center" />
                </div>
              </Card>
            );
          })}
      </div>

      {open && <TicketThread t={open} onClose={() => setOpen(null)} reload={reload} live={live} />}
    </div>
  );
}

/* How a reply actually reaches the person, as the server reports it.

   This drawer had an "Email" button that was a bare mailto: — it opened whatever mail
   app was on the agent's computer, from their own address, with a blank message and
   nothing recorded on the ticket. Meanwhile the Help Center tells everyone "we'll get
   back to you by email", and the server never emailed a reply: someone who wrote in
   without signing in had no way to see the answer at all.

   The reply composer is the one way to answer now. The server says whether it emailed
   (`emailed`); a server from before email delivery says nothing, and then the drawer
   says so instead of implying it was sent. Only in the one case where the reply would
   otherwise reach nobody — not signed in, not emailed — does it offer the agent's mail
   app, prefilled with the reference and the reply, which is already on the thread. */
function deliveryOf(t, r, text) {
  const emailed = r && typeof r.emailed === 'boolean' ? r.emailed : null;
  if (emailed) return { tone:'ok', text:`Emailed to ${t.email}${t.userId ? ' and posted in their requests' : ''}.` };
  if (t.userId) {
    return emailed === false
      ? { tone:'amber', text:`Posted in their requests with a notification. The email copy didn’t go${r.emailError ? ` (${r.emailError})` : ''}.` }
      : { tone:'info', text:'Posted in their requests with a notification. Not emailed — email delivery isn’t switched on yet.' };
  }
  const subject = `Re: ${t.subject} [${t.ref}]`;
  return {
    tone:'red',
    text:'They wrote in without signing in, so email is the only way this reaches them — and it wasn’t emailed.',
    mailto: t.email ? `mailto:${t.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null,
  };
}
const DELIVERY_TONE = { ok:'var(--green)', amber:'var(--amber)', red:'var(--red)', info:'var(--t3)' };

function TicketThread({ t, onClose, reload, live }){
  const { confirm } = useDialogs();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [delivery, setDelivery] = useState(null);

  const act = async (extra = {}) => {
    setBusy(true); setErr('');
    const text = reply.trim();
    try {
      const r = await replySupportTicket({ id: t.id, ...(text ? { message: text } : {}), ...extra });
      setReply('');
      if (text) setDelivery(deliveryOf(t, r, text));
      reload();
      // Closing on resolve would hide the one case that still needs the agent's hand.
      const stranded = text && !t.userId && !(r && r.emailed);
      if ((extra.status === 'resolved' || extra.status === 'closed') && !stranded) onClose();
    } catch (e) {
      setErr(live ? (e.message || 'Action failed.') : 'Connect the backend to reply to live tickets.');
    } finally { setBusy(false); }
  };

  // Erase — for spam, or when a customer asks us to delete what they sent.
  const erase = async () => {
    if (!await confirm({
      title:`Delete ticket ${t.ref}?`, tone:'danger', icon:'trash',
      body:"This erases the customer's message and every reply. It cannot be undone.",
      facts:[{ label:'From', value:t.name || t.email }, { label:'Subject', value:t.subject }],
      confirmPhrase:'DELETE', confirmLabel:'Delete permanently',
    })) return;
    setBusy(true); setErr('');
    try { await deleteSupportTicket(t.id); reload(); onClose(); }
    catch (e) { setErr(e.message || 'Could not delete the ticket.'); setBusy(false); }
  };

  // A staff-initiated thread (Comms → Message someone) opens with OUR message, not
  // the customer's, so the opening bubble has to be attributed by direction or it
  // reads as something the customer said.
  const outbound = t.direction === 'outbound' || t.source === 'staff';
  const thread = [
    { author: outbound ? 'staff' : 'customer', agentEmail: outbound ? (t.openedByEmail || t.assignedEmail) : undefined, text:t.message, at:t.createdAt },
    ...(t.replies || []),
  ];
  const waiting = t.lastActor === 'customer' && !['resolved','closed'].includes(t.status);
  const staffReplies = (t.replies || []).filter((r) => r.author === 'staff').length;

  return (
    <Modal title={t.subject} subtitle={`${t.ref} · ${CAT_LABEL[t.category] || t.category}`} icon="headset" onClose={onClose} maxWidth={680}
      footer={
        <div className="flex items-center gap-2 w-full flex-wrap">
          <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'paper-plane'} onClick={() => act({ assignToMe: true })} disabled={busy || !reply.trim()}>Send reply</Btn>
          <Btn kind="success" size="sm" icon="circle-check" onClick={() => act({ status:'resolved' })} disabled={busy}>Resolve</Btn>
          <Btn kind="ghost" size="sm" icon="user-check" onClick={() => act({ assignToMe: true })} disabled={busy} title="Assign this ticket to me">Assign to me</Btn>
          <Btn kind="danger" size="sm" icon="trash" onClick={erase} disabled={busy} className="ml-auto" title="Erase this ticket and its replies (spam, or a data-deletion request)">Delete</Btn>
        </div>
      }>
      {/* Requester + SLA panel */}
      <div className="rounded-xl p-3 mb-3" style={{ background:'var(--surface2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="user"/></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold t1 text-sm truncate">{t.name || 'Customer'}</div>
            <div className="text-xs t3 truncate">{t.email}</div>
          </div>
          <Pill tone={t.userId ? 'ok' : 'amber'}>{t.userId ? 'Has an account' : 'Not signed in'}</Pill>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
          <div><div className="t3">Opened</div><div className="t1 font-semibold">{fmtAgo(t.createdAt)} ago</div></div>
          <div><div className="t3">{waiting ? 'Awaiting reply' : 'Replies'}</div><div className="font-semibold" style={{ color: waiting ? `var(--${slaTone(t.updatedAt||t.createdAt)})` : 'var(--t1)' }}>{waiting ? fmtAgo(t.updatedAt || t.createdAt) : `${staffReplies} sent`}</div></div>
          <div><div className="t3">Source</div><div className="t1 font-semibold capitalize">{t.source || 'web'}</div></div>
          <div><div className="t3">Assigned</div><div className="t1 font-semibold truncate">{t.assignedEmail ? t.assignedEmail.split('@')[0] : 'Unassigned'}</div></div>
        </div>
        {(t.orderId || t.storeId) && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {t.orderId && <a href={`/storefront?order=${encodeURIComponent(t.orderId)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color:'var(--pri)' }}><Icon name="box"/> Order {t.orderId}</a>}
            {t.storeId && <a href={`/storefront?store=${encodeURIComponent(t.storeId)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color:'var(--pri)' }}><Icon name="store"/> Store</a>}
          </div>
        )}
      </div>

      {/* Status + priority controls */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs t3 font-semibold">Status</span>
        {Object.keys(STATUS_LABEL).map((s) => (
          <button key={s} onClick={() => t.status !== s && act({ status:s })} disabled={busy}
            className="px-2.5 py-1 rounded-md text-xs font-semibold" style={t.status===s ? { background:`var(--${STATUS_TONE[s]}-bg)`, color:`var(--${STATUS_TONE[s]})` } : { background:'var(--surface2)', color:'var(--t3)' }}>{STATUS_LABEL[s]}</button>
        ))}
        <span className="text-xs t3 font-semibold ml-2">Priority</span>
        {PRIORITIES.map(([k, l]) => (
          <button key={k} onClick={() => (t.priority||'normal') !== k && act({ priority:k })} disabled={busy}
            className="px-2.5 py-1 rounded-md text-xs font-semibold" style={(t.priority||'normal')===k ? { background:`var(--${PRIORITY_TONE[k]}-bg)`, color:`var(--${PRIORITY_TONE[k]})` } : { background:'var(--surface2)', color:'var(--t3)' }}>{l}</button>
        ))}
      </div>

      {/* Conversation */}
      <div className="space-y-2 mb-3">
        {thread.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 ${m.author === 'staff' ? 'ml-6' : 'mr-6'}`}
            style={{ background: m.author === 'staff' ? 'var(--pri-soft)' : 'var(--surface2)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: m.author === 'staff' ? 'var(--pri)' : 'var(--t2)' }}>{m.author === 'staff' ? (m.agentEmail || 'Support') : (t.name || 'Customer')}</span>
              <span className="text-[10px] t3">{m.at ? fmt(m.at) : ''}</span>
            </div>
            <div className="text-sm t1" style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
          </div>
        ))}
      </div>

      {/* Canned replies */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {CANNED.map((c) => (
          <button key={c.label} onClick={() => setReply((r) => (r ? r + '\n\n' : '') + c.text)}
            className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>+ {c.label}</button>
        ))}
      </div>

      {/* Reply box */}
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
        placeholder={t.userId ? 'Type your reply… (saved on the thread, and they’re notified)' : 'Type your reply… (saved on the thread — they can only get it by email)'}
        className="ym-input" style={{ resize:'vertical' }} />
      {delivery && (
        <div className="text-sm mt-2 flex items-start gap-2" style={{ color: DELIVERY_TONE[delivery.tone] }}>
          <Icon name={delivery.tone === 'ok' ? 'circle-check' : delivery.tone === 'red' ? 'triangle-exclamation' : 'circle-info'} className="mt-0.5" />
          <span className="flex-1">{delivery.text}
            {delivery.mailto && <> <a href={delivery.mailto} className="font-semibold underline" style={{ color:'var(--pri)' }}>Send it from your mail app</a> — the subject carries {t.ref}, so their answer can be matched.</>}
          </span>
        </div>
      )}
      {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation"/> {err}</div>}
    </Modal>
  );
}
