/* accounts.jsx — Staff portal: the full account directory. Every user across the
   platform (shoppers, merchants, riders, staff/admins) with role, verification and
   provider. Search + role filter; merchants get a sandbox "credit test balance"
   action so withdrawals can be exercised. Admin-only. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Avatar, Icon } from './ui.jsx';
import { staffListUsers, staffCreditTestBalance } from '../../lib/firebase.js';
const { useState, useEffect, useCallback } = React;

const ROLE_TONE = { admin:'red', staff:'amber', merchant:'blue', rider:'ok', shopper:'ok' };
const FILTERS = [['all','All'],['merchant','Merchants'],['shopper','Shoppers'],['rider','Riders'],['staff','Staff']];
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—';

export function Accounts(){
  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('auth');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [creditFor, setCreditFor] = useState(null); // uid being credited

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await staffListUsers(); setUsers(r.users || []); setSource(r.source || 'auth'); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load accounts.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const credit = async (u) => {
    const amount = window.prompt(`Credit test balance (sandbox) to ${u.email || u.uid}. Amount KSh:`, '500');
    if (amount === null) return;
    setCreditFor(u.uid); setMsg(null);
    try { const r = await staffCreditTestBalance({ uid: u.uid, amount: Number(amount) }); setMsg({ ok:true, text:`Credited KSh ${r.amount} to ${u.email || u.uid}.` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Credit failed.' }); }
    finally { setCreditFor(null); }
  };

  const ql = q.trim().toLowerCase();
  const rows = users.filter(u =>
    (filter === 'all' || u.roles.includes(filter)) &&
    (!ql || (u.email||'').toLowerCase().includes(ql) || (u.name||'').toLowerCase().includes(ql) || (u.uid||'').toLowerCase().includes(ql)));
  const count = (role) => role === 'all' ? users.length : users.filter(u => u.roles.includes(role)).length;

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="address-book" title="Accounts" sub={`${users.length} user account${users.length!==1?'s':''} across the platform`}
        action={<Btn kind="soft" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Btn>} />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}
      {!loading && source === 'firestore' && <div className="text-xs t3 flex items-center gap-2" style={{ background:'var(--amber-bg)', color:'var(--amber)', padding:'8px 12px', borderRadius:10 }}><Icon name="triangle-exclamation" />Limited directory — the functions service account can't list Auth users, so this is built from Firestore (merchants, riders, staff, profiles). Grant it the "Firebase Authentication Admin" role for the full list + email lookups.</div>}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth:220, maxWidth:420 }}>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by email, name or uid…" className="ym-input pl-9" style={{ width:'100%' }} />
        </div>
        <div className="inline-flex rounded-lg p-1 flex-wrap gap-1" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>
          {FILTERS.map(([k,l]) => (
            <button key={k} onClick={()=>setFilter(k)} className="px-3 py-1.5 rounded-md text-sm font-semibold transition"
              style={filter===k?{ background:'var(--surface)', color:'var(--pri)', boxShadow:'var(--shadow)' }:{ color:'var(--t3)' }}>{l} <span className="num t3">{count(k)}</span></button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="text-sm t3 py-10 text-center"><Icon name="spinner" className="mr-2" />Loading accounts…</div>
          : rows.length === 0 ? <div className="text-sm t3 py-10 text-center">No accounts match.</div>
            : (
              <div className="divide-y" style={{ borderColor:'var(--line)' }}>
                {rows.slice(0, 400).map(u => (
                  <div key={u.uid} className="flex items-center gap-3 p-3.5" style={{ borderTop:'1px solid var(--line)' }}>
                    <Avatar name={u.name || u.email || '?'} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold t1 text-sm truncate">{u.name || u.email.split('@')[0] || 'User'}</span>
                        {u.roles.map(r => <Pill key={r} tone={ROLE_TONE[r]||'ok'}>{r}</Pill>)}
                        {!u.verified && <span className="text-xs t3">· unverified</span>}
                        {u.disabled && <Pill tone="red">disabled</Pill>}
                      </div>
                      <div className="text-xs t3 mt-0.5 truncate">{u.email || 'no email'} · {u.provider} · joined {fmtDate(u.created)}</div>
                    </div>
                    {u.roles.includes('merchant') && (
                      <Btn kind="soft" size="sm" icon={creditFor===u.uid ? 'spinner' : 'flask'} onClick={()=>credit(u)} disabled={creditFor===u.uid}>Credit test</Btn>
                    )}
                  </div>
                ))}
                {rows.length > 400 && <div className="text-xs t3 p-3 text-center">Showing first 400 of {rows.length} — refine your search.</div>}
              </div>
            )}
      </Card>
    </div>
  );
}
