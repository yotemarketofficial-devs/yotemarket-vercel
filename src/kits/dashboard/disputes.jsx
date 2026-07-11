/* disputes.jsx (merchant) — Refund requests raised against this store. The
   merchant reviews each buyer request and can respond with a note; YoteMarket
   staff make the final call (refund to the buyer's wallet, replace, or decline).
   Reads via listStoreDisputes, responds via respondDispute. */
import React from 'react';
import { FA, Card, Btn } from './primitives.jsx';
import { listStoreDisputes, respondDispute } from '../../lib/firebase.js';
import { ksh } from './data.js';
const { useState, useEffect, useCallback } = React;

const REASON_LABEL = { not_received:'Not received', damaged:'Arrived damaged', not_as_described:'Not as described', wrong_item:'Wrong item', other:'Other issue' };
const STATUS = { open:['Awaiting review', 'var(--m-warning,#d97706)'], under_review:['In review', 'var(--m-primary)'], resolved:['Refunded', 'var(--m-success)'], rejected:['Declined', 'var(--m-danger)'] };
const fmt = (ms) => { try { return new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short' }); } catch { return ''; } };

export function Disputes({ toast }){
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { const r = await listStoreDisputes(); setRows(r.disputes || []); } catch { setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const list = rows || [];
  const openCount = list.filter((d) => d.status === 'open' || d.status === 'under_review').length;

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:6 }}>Refund requests</h1>
      <p className="ym-sub" style={{ marginBottom:20 }}>When a buyer reports a problem with an order, it shows here. Add your side of the story — our team reviews every case before any refund.</p>

      {rows === null ? (
        <Card style={{ padding:'40px 24px', textAlign:'center' }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)', fontSize:22 }} /></Card>
      ) : list.length === 0 ? (
        <Card style={{ padding:'46px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:15, background:'var(--m-success-bg,rgba(16,185,129,.14))', color:'var(--m-success)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}><FA i="fa-face-smile" /></div>
          <div className="ym-h3">No refund requests</div>
          <div className="ym-sub" style={{ marginTop:4 }}>Happy customers. Keep it up!</div>
        </Card>
      ) : (
        <>
          {openCount > 0 && <div className="ym-cap" style={{ marginBottom:12, color:'var(--m-warning,#d97706)' }}><FA i="fa-clock" /> {openCount} awaiting review</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {list.map((d) => {
              const [label, color] = STATUS[d.status] || ['—', 'var(--m-fg3)'];
              return (
                <Card key={d.id} onClick={() => setOpen(d)} style={{ padding:14, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--m-surface-2)', color }}><FA i="fa-rotate-left" /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="ym-h3" style={{ fontSize:14, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>{REASON_LABEL[d.reason] || 'Issue'}
                      <span style={{ fontSize:11, fontWeight:700, color, background:'color-mix(in srgb,'+color+' 14%, transparent)', padding:'2px 8px', borderRadius:999 }}>{label}</span>
                    </div>
                    <div className="ym-cap" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>{d.detail}</div>
                    <div className="ym-cap" style={{ marginTop:2, fontFamily:'ui-monospace,Menlo,monospace' }}>{d.orderNo || d.orderId} · {ksh(d.amount)} · {fmt(d.createdAt)}</div>
                  </div>
                  <FA i="fa-chevron-right" style={{ color:'var(--m-fg3)' }} />
                </Card>
              );
            })}
          </div>
        </>
      )}

      {open && <DisputeDetail d={open} toast={toast} onClose={() => setOpen(null)} onDone={load} />}
    </div>
  );
}

function DisputeDetail({ d, toast, onClose, onDone }){
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, color] = STATUS[d.status] || ['—', 'var(--m-fg3)'];
  const closed = d.status === 'resolved' || d.status === 'rejected';
  const send = async () => {
    if (note.trim().length < 3) { toast && toast('Add a short note', 'fa-triangle-exclamation'); return; }
    setBusy(true);
    try { await respondDispute({ id: d.id, note: note.trim() }); toast && toast('Response sent', 'fa-circle-check'); onClose(); onDone && onDone(); }
    catch (e) { toast && toast(e.message || 'Could not send', 'fa-triangle-exclamation'); setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e) => e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:500, maxHeight:'88vh', overflowY:'auto', padding:22 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div className="ym-h2" style={{ fontSize:18 }}>{REASON_LABEL[d.reason] || 'Refund request'}</div>
            <div className="ym-cap" style={{ fontFamily:'ui-monospace,Menlo,monospace' }}>{d.orderNo || d.orderId} · {ksh(d.amount)}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color, background:'color-mix(in srgb,'+color+' 14%, transparent)', padding:'3px 10px', borderRadius:999 }}>{label}</span>
        </div>

        <div className="ym-card" style={{ padding:12, marginBottom:12, background:'var(--m-surface-2)' }}>
          <div className="ym-cap" style={{ fontWeight:700, marginBottom:4 }}>{d.buyerName || 'Customer'} reported</div>
          <div className="ym-sub" style={{ color:'var(--m-fg1)', whiteSpace:'pre-wrap' }}>{d.detail}</div>
        </div>

        {d.merchantNote && (
          <div className="ym-card" style={{ padding:12, marginBottom:12, border:'1px solid var(--m-primary)' }}>
            <div className="ym-cap" style={{ fontWeight:700, color:'var(--m-primary)', marginBottom:4 }}>Your response</div>
            <div className="ym-sub" style={{ color:'var(--m-fg1)' }}>{d.merchantNote}</div>
          </div>
        )}

        {d.status === 'resolved' && <div className="ym-card" style={{ padding:12, marginBottom:12, display:'flex', gap:9, alignItems:'center', color:'var(--m-success)' }}><FA i="fa-circle-check" /> Refunded to the buyer’s wallet{d.refundAmount ? ` · ${ksh(d.refundAmount)}` : ''}.</div>}
        {d.status === 'rejected' && <div className="ym-card" style={{ padding:12, marginBottom:12, display:'flex', gap:9, alignItems:'center', color:'var(--m-fg2)' }}><FA i="fa-xmark" /> Request declined by staff.</div>}

        {!closed && (
          <>
            <label className="ym-cap" style={{ fontWeight:600 }}>{d.merchantNote ? 'Add another note' : 'Your response'}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Explain what happened or offer a resolution — staff and the buyer will see this."
                style={{ width:'100%', marginTop:6, padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
            </label>
            <Btn kind="primary" style={{ width:'100%', marginTop:14, justifyContent:'center' }} disabled={busy} onClick={send}>
              {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Sending…</> : <><FA i="fa-paper-plane" /> Send response</>}
            </Btn>
          </>
        )}
        <button onClick={onClose} className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:10 }}>Close</button>
      </div>
    </div>
  );
}
