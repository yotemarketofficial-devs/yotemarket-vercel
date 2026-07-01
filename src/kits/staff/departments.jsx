/* departments.jsx — Staff portal: People (HR directory + onboarding/offboarding),
   Finance (ledger + totals), and Legal (contracts/policies/cases/compliance).
   Structure is real (server-only collections via staff/admin callables); live
   platform figures are wired in a follow-up. Uses the shared staff primitives. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Avatar, Stat, kes } from './ui.jsx';
import {
  listStaff, onboardEmployee, offboardEmployee,
  listFinanceEntries, addFinanceEntry, deleteFinanceEntry,
  listLegalRecords, saveLegalRecord, deleteLegalRecord,
} from '../../lib/firebase.js';
const { useState, useEffect, useCallback } = React;

const DEPARTMENTS = [
  { key:'operations', label:'Operations' }, { key:'finance', label:'Finance' },
  { key:'legal', label:'Legal' }, { key:'hr', label:'People / HR' },
  { key:'logistics', label:'Logistics' }, { key:'support', label:'Support' },
];
const deptLabel = k => (DEPARTMENTS.find(d => d.key === k) || {}).label || k;
const fmtDate = ms => ms ? new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—';

function Banner({ msg }){
  if (!msg) return null;
  return <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}>
    <Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>;
}

/* ══════════════════════════ People / HR ══════════════════════════ */
export function People({ isAdmin }){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email:'', name:'', title:'', department:'operations', role:'moderator' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listStaff(); setRows(r.employees || []); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load the team.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onboard = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await onboardEmployee(form);
      setMsg({ ok:true, text:`${form.name || form.email} onboarded to ${deptLabel(r.department)} as ${r.role}.` });
      setForm({ email:'', name:'', title:'', department:'operations', role:'moderator' }); setOpen(false); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Onboarding failed.' }); }
    finally { setBusy(false); }
  };
  const offboard = async (emp) => {
    if (!window.confirm(`Offboard ${emp.name || emp.email}? This revokes their portal access immediately.`)) return;
    setMsg(null);
    try { await offboardEmployee({ uid: emp.uid }); setMsg({ ok:true, text:`${emp.name || emp.email} offboarded.` }); load(); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Offboarding failed.' }); }
  };

  const active = rows.filter(r => r.status === 'active');
  const byDept = DEPARTMENTS.map(d => ({ ...d, n: active.filter(r => r.department === d.key).length })).filter(d => d.n > 0);

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="users" title="People & HR" sub="Employee directory, onboarding and offboarding"
        action={isAdmin && <Btn kind="primary" icon={open ? 'xmark' : 'user-plus'} onClick={() => setOpen(o => !o)}>{open ? 'Cancel' : 'Onboard employee'}</Btn>} />
      <Banner msg={msg} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Active employees" value={active.length} icon="users" tone="pri" />
        <Stat label="Departments" value={byDept.length} icon="sitemap" tone="blue" />
        <Stat label="Admins" value={active.filter(r => r.role === 'admin').length} icon="user-shield" tone="amber" />
        <Stat label="Offboarded" value={rows.length - active.length} icon="user-slash" tone="red" />
      </div>

      {open && isAdmin && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold t1">Onboard an employee</h3>
          <p className="text-sm t3">They must have signed in to the app at least once so their account exists. Onboarding grants portal access and files their HR record.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Work email *" className="ym-input" type="email" />
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" className="ym-input" />
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Job title (e.g. Finance Lead)" className="ym-input" />
            <select value={form.department} onChange={e => set('department', e.target.value)} className="ym-input">
              {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="ym-input">
              <option value="moderator">Staff (moderator access)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <Btn kind="primary" icon={busy ? 'spinner' : 'user-plus'} onClick={onboard} disabled={busy || !form.email}>{busy ? 'Onboarding…' : 'Onboard'}</Btn>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-bold t1 mb-3">Directory</h3>
        {loading ? <div className="text-sm t3 py-6 text-center"><Icon name="spinner" className="mr-2" />Loading…</div>
          : rows.length === 0 ? <div className="text-sm t3 py-6 text-center">No employees on record yet.</div>
            : (
              <div className="space-y-2">
                {rows.map(emp => (
                  <div key={emp.uid} className="flex items-center gap-3 p-3 rounded-lg" style={{ border:'1px solid var(--line)', opacity: emp.status === 'active' ? 1 : 0.6 }}>
                    <Avatar name={emp.name || emp.email} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold t1 text-sm">{emp.name || emp.email.split('@')[0]}</span>
                        <Pill tone={emp.role === 'admin' ? 'amber' : 'blue'}>{emp.role === 'admin' ? 'Admin' : 'Staff'}</Pill>
                        {emp.status !== 'active' && <Pill tone="red">Offboarded</Pill>}
                      </div>
                      <div className="text-xs t3 mt-0.5 truncate">{emp.title ? emp.title + ' · ' : ''}{deptLabel(emp.department)} · {emp.email}</div>
                    </div>
                    <div className="text-xs t3 hidden sm:block text-right">Since<br/>{fmtDate(emp.startedAt)}</div>
                    {isAdmin && emp.status === 'active' && (
                      <button onClick={() => offboard(emp)} className="text-xs font-semibold" style={{ color:'var(--red)' }}>Offboard</button>
                    )}
                  </div>
                ))}
              </div>
            )}
      </Card>
    </div>
  );
}

/* ══════════════════════════ Finance ══════════════════════════ */
export function Finance({ isAdmin }){
  const [data, setData] = useState({ entries:[], revenue:0, expenses:0, net:0 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type:'expense', category:'', amount:'', note:'', date:'' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listFinanceEntries(); setData(r); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load finance.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy(true); setMsg(null);
    try {
      await addFinanceEntry({ type: form.type, category: form.category || undefined, amount: Number(form.amount), note: form.note || undefined, date: form.date || undefined });
      setForm({ type:'expense', category:'', amount:'', note:'', date:'' }); setMsg({ ok:true, text:'Entry recorded.' }); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Could not record entry.' }); }
    finally { setBusy(false); }
  };
  const remove = async (e) => { if (!window.confirm('Delete this entry?')) return; try { await deleteFinanceEntry({ id: e.id }); load(); } catch (err) { setMsg({ ok:false, text:err.message || 'Failed.' }); } };

  const live = data.live || {};
  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="chart-line" title="Finance" sub="Live platform revenue and the internal ledger" />
      <Banner msg={msg} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Platform revenue (live)" value={kes(live.subscriptionRevenue || 0)} sub={`${live.paidSubscriptions || 0} paid subscriptions`} icon="sack-dollar" tone="green" />
        <Stat label="This month" value={kes(live.subscriptionRevenueMonth || 0)} sub="Subscription income" icon="calendar-day" tone="pri" />
        <Stat label="Active subscribers" value={live.activeSubscriptions || 0} sub="Merchants on a live plan" icon="id-card" tone="blue" />
      </div>
      <p className="text-xs t3 -mt-2 flex items-center gap-1.5"><Icon name="circle-info" />Platform revenue is subscription-based — merchants keep order value via escrow &amp; release. Figures are live from settled M-Pesa payments.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Recorded revenue" value={kes(data.revenue)} icon="arrow-trend-up" tone="green" />
        <Stat label="Recorded expenses" value={kes(data.expenses)} icon="arrow-trend-down" tone="red" />
        <Stat label="Recorded net" value={kes(data.net)} icon="scale-balanced" tone={data.net >= 0 ? 'pri' : 'amber'} />
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-bold t1">Record an entry</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select value={form.type} onChange={e => set('type', e.target.value)} className="ym-input">
            <option value="expense">Expense</option>
            <option value="revenue">Revenue</option>
          </select>
          <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Category (e.g. Payroll, Marketing)" className="ym-input" />
          <input value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} inputMode="numeric" placeholder="Amount (KSh)" className="ym-input" />
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note (optional)" className="ym-input sm:col-span-2" />
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="ym-input" />
        </div>
        <Btn kind="primary" icon={busy ? 'spinner' : 'plus'} onClick={add} disabled={busy || !form.amount}>{busy ? 'Saving…' : 'Record entry'}</Btn>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold t1 mb-3">Ledger</h3>
        {loading ? <div className="text-sm t3 py-6 text-center"><Icon name="spinner" className="mr-2" />Loading…</div>
          : data.entries.length === 0 ? <div className="text-sm t3 py-6 text-center">No entries yet.</div>
            : (
              <div className="space-y-2">
                {data.entries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ border:'1px solid var(--line)' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: e.type === 'revenue' ? 'var(--green-bg)' : 'var(--red-bg)', color: e.type === 'revenue' ? 'var(--green)' : 'var(--red)' }}>
                      <Icon name={e.type === 'revenue' ? 'arrow-down' : 'arrow-up'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold t1 text-sm">{e.category || 'General'}</div>
                      <div className="text-xs t3 truncate">{e.note || '—'}{e.date ? ` · ${e.date}` : ''}</div>
                    </div>
                    <div className="num font-bold text-sm" style={{ color: e.type === 'revenue' ? 'var(--green)' : 'var(--red)' }}>
                      {e.type === 'revenue' ? '+' : '−'}{kes(e.amount)}
                    </div>
                    {isAdmin && <button onClick={() => remove(e)} className="text-xs font-semibold" style={{ color:'var(--red)' }}>Delete</button>}
                  </div>
                ))}
              </div>
            )}
      </Card>
    </div>
  );
}

/* ══════════════════════════ Legal ══════════════════════════ */
const LEGAL_TYPES = [
  { key:'contract', label:'Contract', icon:'file-signature' },
  { key:'policy', label:'Policy', icon:'file-shield' },
  { key:'case', label:'Case', icon:'gavel' },
  { key:'compliance', label:'Compliance', icon:'clipboard-check' },
];
const legalMeta = k => LEGAL_TYPES.find(t => t.key === k) || LEGAL_TYPES[0];

export function Legal({ isAdmin }){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title:'', type:'contract', status:'active', counterparty:'', note:'', date:'' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listLegalRecords(); setRows(r.records || []); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load legal records.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await saveLegalRecord({ title: form.title, type: form.type, status: form.status, counterparty: form.counterparty || undefined, note: form.note || undefined, date: form.date || undefined });
      setForm({ title:'', type:'contract', status:'active', counterparty:'', note:'', date:'' }); setMsg({ ok:true, text:'Record saved.' }); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Could not save record.' }); }
    finally { setBusy(false); }
  };
  const remove = async (r) => { if (!window.confirm(`Delete "${r.title}"?`)) return; try { await deleteLegalRecord({ id: r.id }); load(); } catch (e) { setMsg({ ok:false, text:e.message || 'Failed.' }); } };

  const counts = LEGAL_TYPES.map(t => ({ ...t, n: rows.filter(r => r.type === t.key).length }));

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="scale-balanced" title="Legal" sub="Contracts, policies, cases and compliance records" />
      <Banner msg={msg} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {counts.map(t => <Stat key={t.key} label={t.label + 's'} value={t.n} icon={t.icon} tone="pri" />)}
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-bold t1">Add a record</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title *" className="ym-input" />
          <select value={form.type} onChange={e => set('type', e.target.value)} className="ym-input">
            {LEGAL_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input value={form.status} onChange={e => set('status', e.target.value)} placeholder="Status (e.g. active, signed, pending)" className="ym-input" />
          <input value={form.counterparty} onChange={e => set('counterparty', e.target.value)} placeholder="Counterparty (optional)" className="ym-input" />
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="ym-input" />
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note (optional)" className="ym-input sm:col-span-2 lg:col-span-1" />
        </div>
        <Btn kind="primary" icon={busy ? 'spinner' : 'plus'} onClick={save} disabled={busy || !form.title}>{busy ? 'Saving…' : 'Add record'}</Btn>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold t1 mb-3">Records</h3>
        {loading ? <div className="text-sm t3 py-6 text-center"><Icon name="spinner" className="mr-2" />Loading…</div>
          : rows.length === 0 ? <div className="text-sm t3 py-6 text-center">No records yet.</div>
            : (
              <div className="space-y-2">
                {rows.map(r => {
                  const m = legalMeta(r.type);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ border:'1px solid var(--line)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name={m.icon} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold t1 text-sm">{r.title}</span>
                          <Pill tone="blue">{m.label}</Pill>
                          {r.status && <span className="text-xs t3">{r.status}</span>}
                        </div>
                        <div className="text-xs t3 mt-0.5 truncate">{r.counterparty ? r.counterparty + ' · ' : ''}{r.note || ''}{r.date ? ` · ${r.date}` : ''}</div>
                      </div>
                      {isAdmin && <button onClick={() => remove(r)} className="text-xs font-semibold" style={{ color:'var(--red)' }}>Delete</button>}
                    </div>
                  );
                })}
              </div>
            )}
      </Card>
    </div>
  );
}
