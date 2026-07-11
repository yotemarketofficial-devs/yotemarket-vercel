/* support.jsx — Staff Support console (customer-service desk). Lists help-desk
   tickets from the Help Center, filter by status, open a thread to reply and
   change status/assignment. Reads via staffListSupportTickets, acts via
   staffReplySupportTicket; falls back to demo data so the console always renders. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Icon, Stat, EmptyState, Modal } from './ui.jsx';
import { useStaffResource, fetchSupportTickets, replySupportTicket } from './service.js';
const { useState, useEffect } = React;

const CAT_LABEL = { order:'Order', payment:'Payment', delivery:'Delivery', account:'Account', selling:'Selling', feed:'YoteFeed', refund:'Refund', other:'Other' };
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

function TicketThread({ t, onClose, reload, live }){
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const act = async (extra = {}) => {
    setBusy(true); setErr('');
    try {
      await replySupportTicket({ id: t.id, ...(reply.trim() ? { message: reply.trim() } : {}), ...extra });
      setReply('');
      reload();
      if (extra.status === 'resolved' || extra.status === 'closed') onClose();
    } catch (e) {
      setErr(live ? (e.message || 'Action failed.') : 'Connect the backend to reply to live tickets.');
    } finally { setBusy(false); }
  };

  const thread = [
    { author:'customer', text:t.message, at:t.createdAt },
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
        </div>
      }>
      {/* Requester + SLA panel */}
      <div className="rounded-xl p-3 mb-3" style={{ background:'var(--surface2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="user"/></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold t1 text-sm truncate">{t.name || 'Customer'}</div>
            <a href={`mailto:${t.email}`} className="text-xs t3 truncate hover:underline">{t.email}</a>
          </div>
          {t.email && <a href={`mailto:${t.email}`}><Btn kind="soft" size="sm" icon="envelope">Email</Btn></a>}
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
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type your reply… (goes to the customer + notifies them)" className="ym-input" style={{ resize:'vertical' }} />
      {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation"/> {err}</div>}
    </Modal>
  );
}
