/* disputes.jsx — Staff Returns & refunds console. Buyer-opened return/refund
   requests: review the order + reason, then refund to the buyer's YoteWallet
   (full or partial), arrange a replacement, or decline. Reads via
   staffListDisputes, acts via staffResolveDispute (which moves the money +
   reverses the merchant's escrow). Falls back to demo data so it always renders. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Icon, Stat, EmptyState, Modal, kes } from './ui.jsx';
import { useStaffResource, fetchDisputes, resolveDispute } from './service.js';
const { useState, useEffect } = React;

const REASON_LABEL = { not_received:'Not received', damaged:'Arrived damaged', not_as_described:'Not as described', wrong_item:'Wrong item', other:'Other issue' };
const STATUS_TONE = { open:'amber', under_review:'blue', resolved:'ok', rejected:'red' };
const STATUS_LABEL = { open:'Open', under_review:'In review', resolved:'Resolved', rejected:'Declined' };
const RESOLUTION_LABEL = { refund:'Full refund', partial:'Partial refund', replace:'Replacement', decline:'Declined' };
const FILTERS = ['open', 'resolved', 'rejected', 'all'];
const fmt = (ms) => { try { return new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }); } catch { return ''; } };

const DEMO = [
  { id:'d1', orderNo:'YM-1042', buyerName:'Wanjiru K.', storeName:'Kipenzi Fashion', reason:'damaged', detail:'The blender I collected at CBD hub was cracked on one side. I’d like a refund or a replacement.', amount:3200, status:'open', photos:[], timeline:[{ by:'buyer', action:'opened', note:'The blender was cracked.', at:Date.now()-3*3600e3 }], createdAt:Date.now()-3*3600e3, updatedAt:Date.now()-3*3600e3 },
  { id:'d2', orderNo:'YM-1031', buyerName:'Otieno M.', storeName:'Wanjiku Electronics', reason:'not_received', detail:'It’s been 4 days and the order never arrived at my hub.', amount:5400, status:'open', photos:[], timeline:[{ by:'buyer', action:'opened', note:'Never arrived.', at:Date.now()-26*3600e3 }], merchantNote:'We handed it to the rider on time — following up.', createdAt:Date.now()-26*3600e3, updatedAt:Date.now()-5*3600e3 },
];

export function Disputes(){
  const { data, live, reload } = useStaffResource(fetchDisputes, { disputes: DEMO, counts:{} });
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState(null);
  const all = data.disputes || [];
  const shown = all.filter((d) => filter === 'all' ? true : d.status === filter)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const count = (s) => all.filter((d) => d.status === s).length;
  const pendingValue = all.filter((d) => d.status === 'open' || d.status === 'under_review').reduce((n, d) => n + (d.amount || 0), 0);

  useEffect(() => { if (open) { const fresh = all.find((d) => d.id === open.id); if (fresh) setOpen(fresh); } /* eslint-disable-next-line */ }, [data]);

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="rotate-left" title="Returns & refunds" sub={live ? 'Buyer refund requests — review and resolve to the YoteWallet' : 'Sample requests — connect the backend for live disputes'}
        action={<Seg value={filter} onChange={setFilter} options={FILTERS} fmt={(o) => o === 'all' ? 'All' : STATUS_LABEL[o]} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Open" value={count('open')} icon="folder-open" tone="amber" />
        <Stat label="Value at risk" value={kes(pendingValue)} sub="in open requests" icon="scale-unbalanced" tone="red" />
        <Stat label="Refunded" value={count('resolved')} icon="circle-check" tone="green" />
        <Stat label="All requests" value={all.length} icon="rotate-left" tone="pri" />
      </div>

      <div className="space-y-3">
        {shown.length === 0
          ? <Card className="p-2"><EmptyState icon="circle-check" tone="green" title="Nothing to review." sub="No refund requests in this view." /></Card>
          : shown.map((d) => (
            <Card key={d.id} className="p-4 cursor-pointer" onClick={() => setOpen(d)} style={d.status === 'open' ? { borderLeft:'3px solid var(--amber)' } : null}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:'var(--red-bg)', color:'var(--red)' }}><Icon name="rotate-left"/></div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold t1 flex items-center gap-2 flex-wrap">
                    {REASON_LABEL[d.reason] || 'Issue'}
                    <Pill tone={STATUS_TONE[d.status] || 'blue'}>{STATUS_LABEL[d.status] || d.status}</Pill>
                    {d.resolution && <span className="text-xs t3">{RESOLUTION_LABEL[d.resolution]}{d.refundAmount ? ` · ${kes(d.refundAmount)}` : ''}</span>}
                  </div>
                  <div className="text-sm t2 mt-0.5 truncate">{d.detail}</div>
                  <div className="text-xs t3 mt-1 num">{d.orderNo || d.orderId} · {d.buyerName || 'Customer'} · {d.storeName || '—'} · {kes(d.amount)} · {fmt(d.updatedAt || d.createdAt)}</div>
                </div>
                <Icon name="chevron-right" className="t3 self-center" />
              </div>
            </Card>
          ))}
      </div>

      {open && <DisputeCase d={open} onClose={() => setOpen(null)} reload={reload} live={live} />}
    </div>
  );
}

function DisputeCase({ d, onClose, reload, live }){
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [partial, setPartial] = useState('');
  const [err, setErr] = useState('');
  const closed = d.status === 'resolved' || d.status === 'rejected';

  const act = async (resolution, extra = {}) => {
    setBusy(resolution); setErr('');
    try {
      await resolveDispute({ id: d.id, resolution, ...(note.trim() ? { note: note.trim() } : {}), ...extra });
      reload(); onClose();
    } catch (e) { setErr(live ? (e.message || 'Action failed.') : 'Connect the backend to resolve live requests.'); setBusy(''); }
  };
  const partialAmt = Math.max(0, Math.round(Number(partial) || 0));

  return (
    <Modal title={REASON_LABEL[d.reason] || 'Refund request'} subtitle={`${d.orderNo || d.orderId} · ${d.storeName || ''}`} icon="rotate-left" onClose={onClose} maxWidth={600}
      footer={<span className="text-[11px] t3 mr-auto flex items-center gap-1.5"><Icon name="user"/> {d.buyerName || 'Customer'} · order total {kes(d.amount)}</span>}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Pill tone={STATUS_TONE[d.status] || 'blue'}>{STATUS_LABEL[d.status] || d.status}</Pill>
        {d.resolution && <span className="text-xs t3">{RESOLUTION_LABEL[d.resolution]}{d.refundAmount ? ` · ${kes(d.refundAmount)} to wallet` : ''}{d.resolvedBy ? ` · by ${d.resolvedBy}` : ''}</span>}
      </div>

      {/* customer's report */}
      <div className="rounded-xl p-3 mb-3" style={{ background:'var(--surface2)' }}>
        <div className="text-xs font-semibold t2 mb-1">{d.buyerName || 'Customer'} wrote</div>
        <div className="text-sm t1" style={{ whiteSpace:'pre-wrap' }}>{d.detail}</div>
      </div>
      {Array.isArray(d.photos) && d.photos.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">{d.photos.map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="rounded-lg" style={{ width:72, height:72, objectFit:'cover', border:'1px solid var(--line)' }} /></a>)}</div>
      )}
      {d.merchantNote && (
        <div className="rounded-xl p-3 mb-3" style={{ background:'var(--pri-soft)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color:'var(--pri)' }}>Store responded</div>
          <div className="text-sm t1">{d.merchantNote}</div>
        </div>
      )}

      {/* timeline */}
      {Array.isArray(d.timeline) && d.timeline.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold t3 uppercase tracking-wide mb-2">History</div>
          <div className="space-y-1.5">
            {d.timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Icon name={t.by === 'staff' ? 'headset' : t.by === 'merchant' ? 'store' : 'user'} className="mt-0.5" style={{ color:'var(--t3)' }} />
                <span className="t2"><b className="t1">{t.by === 'staff' ? 'Staff' : t.by === 'merchant' ? 'Store' : 'Customer'}</b> {t.action}{t.amount ? ` · ${kes(t.amount)}` : ''}{t.note ? ` — ${t.note}` : ''} <span className="t3">· {fmt(t.at)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {closed ? (
        <div className="rounded-xl p-3 text-sm t2 flex items-center gap-2" style={{ background:'var(--surface2)' }}>
          <Icon name="lock" style={{ color:'var(--t3)' }} /> This request is closed.
        </div>
      ) : (
        <>
          <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Note to the customer (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add context the customer will see…" className="ym-input" style={{ resize:'vertical' }} />
          {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation"/> {err}</div>}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Btn kind="success" size="sm" icon={busy === 'refund' ? 'spinner' : 'rotate-left'} onClick={() => act('refund')} disabled={!!busy}>Refund {kes(d.amount)}</Btn>
            <Btn kind="soft" size="sm" icon="box" onClick={() => act('replace')} disabled={!!busy}>Arrange replacement</Btn>
            <Btn kind="danger" size="sm" icon="xmark" onClick={() => act('decline')} disabled={!!busy}>Decline</Btn>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop:'1px solid var(--line)' }}>
            <span className="text-xs t3">Partial:</span>
            <input value={partial} onChange={(e) => setPartial(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Amount (KSh)" className="ym-input" style={{ width:150 }} />
            <Btn kind="outline" size="sm" icon={busy === 'partial' ? 'spinner' : 'coins'} onClick={() => act('partial', { refundAmount: partialAmt })} disabled={!!busy || partialAmt <= 0 || partialAmt > d.amount}>Refund partial</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
