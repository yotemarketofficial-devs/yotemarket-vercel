/* accounts.jsx — Staff portal: the full account directory. Every user across the
   platform (shoppers, merchants, riders, staff/admins) with role, verification and
   provider. Search + role filter; merchants get a sandbox "credit test balance"
   action so withdrawals can be exercised. Admin-only. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Avatar, Icon, DataTable, EmptyState, exportCsv, Modal, kes } from './ui.jsx';
import { staffListUsers, staffCreditTestBalance } from '../../lib/firebase.js';
import { fetchUserDetail, setUserDisabled, addStaffNote, setStaffRole } from './service.js';
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
  const [consoleU, setConsoleU] = useState(null);   // user open in the console drawer

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

  const columns = [
    { key:'user', header:'User', sortValue:(u)=>(u.name||u.email||'').toLowerCase(), csvValue:(u)=> u.name || (u.email||'').split('@')[0] || u.uid,
      render:(u)=>(
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={u.name || u.email || '?'} size={34} />
          <div className="min-w-0">
            <div className="font-semibold t1 truncate flex items-center gap-2">{u.name || (u.email||'').split('@')[0] || 'User'}{u.disabled && <Pill tone="red">disabled</Pill>}{!u.verified && <span className="text-xs t3 font-normal">unverified</span>}</div>
            <div className="text-xs t3 truncate">{u.email || 'no email'}</div>
          </div>
        </div>) },
    { key:'roles', header:'Roles', csvValue:(u)=>(u.roles||[]).join(' '), render:(u)=>(<div className="flex gap-1 flex-wrap">{u.roles.map(r => <Pill key={r} tone={ROLE_TONE[r]||'ok'}>{r}</Pill>)}</div>) },
    { key:'provider', header:'Provider', sort:true, render:(u)=><span className="t2">{u.provider}</span> },
    { key:'created', header:'Joined', sortValue:(u)=>u.created||0, csvValue:(u)=>fmtDate(u.created), render:(u)=><span className="t3">{fmtDate(u.created)}</span> },
    { key:'actions', header:'', align:'right', csv:false, render:(u)=> u.roles.includes('merchant')
      ? <Btn kind="soft" size="sm" icon={creditFor===u.uid ? 'spinner' : 'flask'} onClick={(e)=>{ e.stopPropagation(); credit(u); }} disabled={creditFor===u.uid}>Credit test</Btn>
      : null },
  ];

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="address-book" title="Accounts" sub={`${users.length} user account${users.length!==1?'s':''} across the platform`}
        action={<div className="flex items-center gap-2">
          <Btn kind="ghost" size="md" icon="file-arrow-down" onClick={()=>exportCsv(`accounts-${new Date().toISOString().slice(0,10)}`, columns, rows)} disabled={!rows.length}>Export</Btn>
          <Btn kind="soft" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Btn>
        </div>} />
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
          : <DataTable columns={columns} rows={rows} keyField="uid" pageSize={40} minWidth={720}
              initialSort={{ key:'created', dir:'desc' }} onRowClick={setConsoleU}
              empty={<EmptyState icon="user" title="No accounts match." sub="Try a different search or role filter." />} />}
      </Card>
      {consoleU && <UserConsole row={consoleU} onClose={()=>setConsoleU(null)} onChanged={load} />}
    </div>
  );
}

const ROLE_TONE_U = { admin:'red', staff:'amber', merchant:'blue', rider:'ok', shopper:'ok' };
const OSTATUS_TONE = { delivered:'ok', paid:'ok', cancelled:'red', placed:'amber' };
const uFmt = (ms) => ms ? new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—';

function UTile({ label, value, sub, tone='pri' }){
  const c = { pri:'var(--pri)', green:'var(--green)', blue:'var(--blue)', amber:'var(--amber)', red:'var(--red)' }[tone];
  return <div className="rounded-xl p-3" style={{ background:'var(--surface2)' }}><div className="text-lg font-bold num" style={{ color:c }}>{value}</div><div className="text-xs t1 font-semibold">{label}</div>{sub && <div className="text-[11px] t3">{sub}</div>}</div>;
}

/* Per-user admin console — dossier + actions (disable/enable, role, note, credit). */
function UserConsole({ row, onClose, onChanged }){
  const uid = row.uid;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');
  const [key, setKey] = useState(0);
  useEffect(() => {
    let alive = true; setErr('');
    fetchUserDetail(uid).then((r)=>{ if (alive) setD(r); }).catch((e)=>{ if (alive) setErr(e.message || 'Could not load this account.'); });
    return () => { alive = false; };
  }, [uid, key]);
  const reload = () => setKey((k)=>k+1);

  const p = (d && d.profile) || {}; const auth = (d && d.auth) || {}; const st = (d && d.stats) || {};
  const roles = (d && d.roles) || row.roles || [];
  const disabled = auth && auth.disabled;

  const toggleDisable = async () => {
    const next = !disabled;
    if (!window.confirm(next ? `Disable ${p.email || uid}? They won't be able to sign in.` : `Re-enable ${p.email || uid}?`)) return;
    setBusy('disable');
    try { await setUserDisabled(uid, next); reload(); onChanged && onChanged(); }
    catch (e) { window.alert(e.message || 'Action failed.'); }
    finally { setBusy(null); }
  };
  const changeRole = async (role) => {
    if (!p.email) { window.alert('This account has no email on record — role changes are by email.'); return; }
    const label = role === 'none' ? 'revoke staff access from' : `make ${p.email} a${role==='admin'?'n admin':' moderator'}`;
    if (!window.confirm(`${role==='none'?'Revoke staff access from':'Grant'} ${p.email}${role!=='none'?` as ${role}`:''}?`)) return;
    setBusy('role');
    try { await setStaffRole(p.email, role); reload(); onChanged && onChanged(); }
    catch (e) { window.alert(e.message || 'Role change failed.'); }
    finally { setBusy(null); }
  };
  const addNote = async () => {
    const t = note.trim(); if (!t) return;
    setBusy('note');
    try { await addStaffNote('user', uid, t); setNote(''); reload(); }
    catch (e) { window.alert(e.message || 'Could not add note.'); }
    finally { setBusy(null); }
  };

  const isStaff = roles.includes('admin') || roles.includes('staff');
  return (
    <Modal title={p.name || row.name || (p.email||'').split('@')[0] || 'User'} subtitle={p.email || row.email || uid} icon="user" onClose={onClose} maxWidth={820}
      footer={
        <div className="flex items-center gap-2 flex-wrap w-full">
          {d && <>
            <Btn kind={disabled?'success':'danger'} size="sm" icon={disabled?'unlock':'ban'} onClick={toggleDisable} disabled={busy==='disable'}>{disabled?'Enable sign-in':'Disable'}</Btn>
            {!isStaff && <Btn kind="soft" size="sm" icon="user-shield" onClick={()=>changeRole('moderator')} disabled={busy==='role'}>Make staff</Btn>}
            {isStaff && !roles.includes('admin') && <Btn kind="soft" size="sm" icon="crown" onClick={()=>changeRole('admin')} disabled={busy==='role'}>Make admin</Btn>}
            {isStaff && <Btn kind="ghost" size="sm" icon="user-slash" onClick={()=>changeRole('none')} disabled={busy==='role'}>Revoke staff</Btn>}
            {p.email && <a href={`mailto:${p.email}`} className="ml-auto"><Btn kind="ghost" size="sm" icon="envelope">Email</Btn></a>}
          </>}
        </div>
      }>
      {!d && !err && <div className="py-10 text-center t3"><Icon name="spinner" className="mr-2"/>Loading account…</div>}
      {err && <EmptyState icon="triangle-exclamation" tone="red" title="Couldn't load this account" sub={err} />}
      {d && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {roles.map((r)=><Pill key={r} tone={ROLE_TONE_U[r]||'ok'}>{r}</Pill>)}
            {disabled && <Pill tone="red">disabled</Pill>}
            {auth.error && <span className="text-xs t3">· auth details unavailable</span>}
            {!auth.error && auth.provider && <span className="text-xs t3">· {auth.provider}{auth.verified?' · verified':' · unverified'}</span>}
            {p.createdAt && <span className="text-xs t3">· joined {uFmt(p.createdAt)}</span>}
            {auth.lastSignIn && <span className="text-xs t3">· last seen {new Date(auth.lastSignIn).toLocaleDateString('en-KE')}</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <UTile label="Orders" value={st.orders||0} sub={`${st.paidOrders||0} paid`} tone="blue" />
            <UTile label="Spend" value={kes(st.gmv||0)} tone="green" />
            <UTile label="Wallet" value={kes((d.wallet&&d.wallet.balance)||0)} tone="pri" />
            <UTile label="Points" value={p.points||0} tone="amber" />
          </div>

          {(d.store || d.subscription) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.store && <Card className="p-4"><div className="text-xs t3 font-semibold uppercase mb-1">Merchant</div><div className="font-bold t1 text-sm">{d.store.name||'Store'}</div><div className="text-xs t3 mt-1">Available {kes(d.store.balanceAvailable||0)}{d.store.status?` · ${d.store.status}`:''}</div></Card>}
              {d.subscription && <Card className="p-4"><div className="text-xs t3 font-semibold uppercase mb-1">Subscription</div><div className="font-bold t1 text-sm">{d.subscription.plan||'—'} {d.subscription.status==='active'?<Pill tone="ok">active</Pill>:<Pill tone="amber">{d.subscription.status}</Pill>}</div>{d.subscription.renewsAt&&<div className="text-xs t3 mt-1">renews {uFmt(d.subscription.renewsAt)}</div>}</Card>}
            </div>
          )}

          {d.recentOrders && d.recentOrders.length > 0 && (
            <div>
              <div className="font-bold t1 text-sm mb-2">Recent orders</div>
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--line)' }}>
                {d.recentOrders.map((o,i)=>(
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 text-sm" style={{ borderTop:i?'1px solid var(--line)':'none' }}>
                    <span className="num t3 text-xs" style={{ width:76 }}>{o.orderNo||('#'+String(o.id).slice(-6))}</span>
                    <Pill tone={OSTATUS_TONE[o.status]||'amber'}>{o.status}</Pill>
                    <span className="num font-semibold t1 flex-1" style={{ textAlign:'right' }}>{kes(o.total)}</span>
                    <span className="t3 text-xs hidden sm:block" style={{ width:66, textAlign:'right' }}>{o.at?uFmt(o.at):''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.tickets && d.tickets.length > 0 && (
            <div>
              <div className="font-bold t1 text-sm mb-2">Support tickets</div>
              <div className="space-y-1.5">
                {d.tickets.map((t)=>(
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="num t3 text-xs">{t.ref||''}</span>
                    <span className="flex-1 min-w-0 truncate t2">{t.subject}</span>
                    <Pill tone={t.status==='resolved'||t.status==='closed'?'ok':'amber'}>{t.status}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-bold t1 text-sm mb-2">Internal notes <span className="t3 font-normal">· staff only</span></div>
            <div className="flex items-center gap-2 mb-2">
              <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Add a note about this account…" className="ym-input flex-1" onKeyDown={(e)=>{ if(e.key==='Enter') addNote(); }} />
              <Btn kind="primary" size="sm" icon={busy==='note'?'spinner':'plus'} onClick={addNote} disabled={busy==='note' || !note.trim()}>Add</Btn>
            </div>
            {d.notes && d.notes.length ? (
              <div className="space-y-2">
                {d.notes.map((n)=>(
                  <div key={n.id} className="text-sm rounded-lg p-2.5" style={{ background:'var(--surface2)' }}>
                    <div className="t1">{n.text}</div><div className="text-[11px] t3 mt-1">{n.author} · {n.at?new Date(n.at).toLocaleString('en-KE'):''}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs t3">No notes yet.</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}
