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

const TICKETS_DEMO = [
  { id:'d1', ref:'YM-7F3K9Q', name:'Wanjiru K.', email:'wanjiru@example.com', category:'order', subject:'Haven’t received my pickup code', message:'I paid for order YM-1042 two hours ago but no pickup code came through. Can you check?', status:'open', priority:'normal', source:'app', createdAt:Date.now()-2*3600e3, updatedAt:Date.now()-2*3600e3, replies:[], lastActor:'customer' },
  { id:'d2', ref:'YM-2M8XQ4', name:'Otieno M.', email:'otieno@example.com', category:'refund', subject:'Item arrived damaged', message:'The blender I collected at CBD hub was cracked. I’d like a refund or replacement.', status:'pending', priority:'high', source:'web', createdAt:Date.now()-26*3600e3, updatedAt:Date.now()-3*3600e3, replies:[{ author:'staff', agentEmail:'support@yotemarket.com', text:'So sorry about that — could you share a photo? We’ll hold the release and sort a refund.', at:Date.now()-3*3600e3 }], lastActor:'staff' },
];

export function Support({ isAdmin }){ // eslint-disable-line no-unused-vars
  const { data, live, reload } = useStaffResource(fetchSupportTickets, { tickets: TICKETS_DEMO, counts:{} });
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState(null);
  const all = data.tickets || [];

  const shown = all.filter((t) => filter === 'all' ? t.status !== 'closed' || filter === 'all' : t.status === filter);
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
                      {t.priority === 'high' && <Pill tone="red">High</Pill>}
                      {waiting && <Pill tone="amber">Awaiting reply</Pill>}
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

  return (
    <Modal title={t.subject} subtitle={`${t.ref} · ${t.name || t.email} · ${CAT_LABEL[t.category] || t.category}`} icon="headset" onClose={onClose} maxWidth={600}
      footer={<span className="text-[11px] t3 mr-auto flex items-center gap-1.5"><Icon name="envelope"/> {t.email}{t.orderId ? ` · order ${t.orderId}` : ''}</span>}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Pill tone={STATUS_TONE[t.status] || 'blue'}>{STATUS_LABEL[t.status] || t.status}</Pill>
        {t.assignedEmail && <span className="text-xs t3">Assigned to {t.assignedEmail}</span>}
      </div>

      {/* Conversation */}
      <div className="space-y-2 mb-4">
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

      {/* Reply box */}
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type your reply…" className="ym-input" style={{ resize:'vertical' }} />
      {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation"/> {err}</div>}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'paper-plane'} onClick={() => act({ assignToMe: true })} disabled={busy || !reply.trim()}>Send reply</Btn>
        <Btn kind="success" size="sm" icon="circle-check" onClick={() => act({ status:'resolved' })} disabled={busy}>Resolve</Btn>
        {t.status !== 'closed' && <Btn kind="soft" size="sm" icon="xmark" onClick={() => act({ status:'closed' })} disabled={busy}>Close</Btn>}
        <Btn kind="ghost" size="sm" icon="user-check" onClick={() => act({ assignToMe: true })} disabled={busy} title="Assign this ticket to me">Assign to me</Btn>
      </div>
    </Modal>
  );
}
