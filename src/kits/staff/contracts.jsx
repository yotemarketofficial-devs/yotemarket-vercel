/* contracts.jsx — Individual employment contracts.

   Staff records carried a job title and a department but no TERMS: nothing said
   what someone was employed as, from when, for how long, or on what pay. That's
   the record you need in exactly the moment it's missing — a dispute, an exit, a
   statutory request.

   Shape of it:
   • Issuing a contract SUPERSEDES the person's current one rather than editing
     it, so what somebody was employed under at any past date stays recoverable.
   • Terminating writes a reason and keeps the record. An employment record you
     can delete isn't one.
   • Pay lives here, so the whole screen is People-department only — but everyone
     can read their OWN contract (MyContract, below), because being unable to see
     your own terms is indefensible.
   • Signing is the employee's own act: People can issue, only the person can
     sign. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Icon, kes, DataTable, Modal, EmptyState, BackendError, exportCsv } from './ui.jsx';
import {
  useStaffResource, useStaffClaims,
  fetchContracts, fetchStaff, saveContract, terminateContract,
  fetchMyContract, signContract,
  CONTRACT_TYPE_LABEL, PAY_PERIOD_LABEL, DEPT_LABEL,
} from './service.js';
import { useDialogs } from './dialogs.jsx';
const { useState, useEffect } = React;

const STATUS_TONE = { active:'ok', draft:'blue', expired:'amber', terminated:'red', superseded:'blue' };
const STATUS_LABEL = { active:'Active', draft:'Draft', expired:'Expired', terminated:'Terminated', superseded:'Superseded' };
const FILTERS = ['active', 'draft', 'expired', 'all'];
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—');
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
/** Days until an end date — the number that decides whether a renewal is urgent. */
const daysLeft = (d) => (d ? Math.ceil((new Date(`${d}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 86400000) : null);

export function Contracts() {
  const { data, live, error, demo, reload } = useStaffResource(fetchContracts, { contracts:[], counts:{} }, [], { pollMs:60000 });
  const { data: staff } = useStaffResource(fetchStaff, [], [], { pollMs:0 });
  const { confirm, prompt, toast } = useDialogs();
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);   // contract or { uid } for new
  const [viewing, setViewing] = useState(null);

  const all = data.contracts || [];
  const ql = q.trim().toLowerCase();
  const shown = all
    .filter((c) => (filter === 'all' ? true : c.status === filter))
    .filter((c) => !ql || [c.name, c.email, c.title].some((x) => (x || '').toLowerCase().includes(ql)));

  // People on staff with no active contract — the gap this screen exists to close.
  const covered = new Set(all.filter((c) => c.status === 'active').map((c) => c.uid));
  const uncovered = (Array.isArray(staff) ? staff : []).filter((s) => s.status === 'active' && !covered.has(s.uid));
  const expiring = all.filter((c) => c.status === 'active' && c.endDate && daysLeft(c.endDate) != null && daysLeft(c.endDate) <= 30);

  const end = async (c) => {
    const reason = await prompt({
      title:`End ${c.name}'s contract?`, tone:'danger', icon:'file-circle-xmark', multiline:true,
      body:'The record is kept with the reason — contracts are never deleted.',
      placeholder:'Reason (resignation, end of term, dismissal…)',
      confirmLabel:'Terminate', confirmIcon:'file-circle-xmark',
    });
    if (reason === null) return;
    try { await terminateContract(c.id, reason); toast({ tone:'ok', title:'Contract terminated.' }); reload(); }
    catch (e) { toast({ tone:'error', title:'Could not terminate', body:e.message }); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="file-signature" title="Contracts"
      sub={demo ? 'No backend configured' : (live ? 'Individual employment terms — type, dates, hours and pay' : 'Loading contracts…')}
      action={<div className="flex items-center gap-2">
        <Seg value={filter} onChange={setFilter} options={FILTERS} fmt={(o) => (o === 'all' ? 'All' : STATUS_LABEL[o])} />
        <Btn kind="primary" size="md" icon="file-circle-plus" onClick={() => setEditing({ uid:'' })}>Issue contract</Btn>
      </div>} />
    <BackendError error={error} onRetry={reload} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Active contracts" value={all.filter((c) => c.status === 'active').length} icon="file-signature" tone="pri" />
      <Stat label="Unsigned" value={all.filter((c) => c.status === 'active' && !c.signedAt).length} sub="awaiting the employee" icon="pen-clip" tone="amber" />
      <Stat label="Expiring soon" value={expiring.length} sub="within 30 days" icon="calendar-day" tone={expiring.length ? 'red' : 'blue'} />
      <Stat label="Staff without one" value={uncovered.length} sub="active staff, no contract" icon="user-clock" tone={uncovered.length ? 'red' : 'green'} />
    </div>

    {uncovered.length > 0 && (
      <Card className="p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}><Icon name="triangle-exclamation" /></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold t1 text-sm">{uncovered.length} active staff member{uncovered.length === 1 ? '' : 's'} without a contract</div>
            <div className="text-xs t3 mt-0.5">They have console access but no recorded terms.</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {uncovered.slice(0, 8).map((s) => (
                <button key={s.uid} onClick={() => setEditing({ uid:s.uid, name:s.name, email:s.email, title:s.title })}
                  className="px-2 py-1 rounded-md text-xs font-semibold" style={{ background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>
                  {s.name || s.email} <Icon name="plus" className="text-[10px] ml-0.5" />
                </button>
              ))}
              {uncovered.length > 8 && <span className="text-xs t3 self-center">+{uncovered.length - 8} more</span>}
            </div>
          </div>
        </div>
      </Card>
    )}

    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1" style={{ maxWidth:380 }}>
        <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or job title…" className="ym-input pl-9" style={{ width:'100%' }} />
      </div>
      <Btn kind="ghost" size="md" icon="file-arrow-down" disabled={!shown.length}
        onClick={() => exportCsv(`contracts-${today()}`, [
          { header:'Name', key:'name' }, { header:'Email', key:'email' }, { header:'Title', key:'title' },
          { header:'Type', csvValue:(c) => CONTRACT_TYPE_LABEL[c.type] || c.type },
          { header:'Start', key:'startDate' }, { header:'End', csvValue:(c) => c.endDate || '' },
          { header:'Pay (KES)', key:'payAmount' }, { header:'Period', key:'payPeriod' },
          { header:'Hours/week', csvValue:(c) => c.hoursPerWeek || '' },
          { header:'Status', key:'status' }, { header:'Signed', csvValue:(c) => (c.signedAt ? new Date(c.signedAt).toISOString().slice(0, 10) : '') },
        ], shown)}>Export</Btn>
    </div>

    <Card className="p-0 overflow-hidden">
      <DataTable minWidth={860} rows={shown} pageSize={15} onRowClick={(c) => setViewing(c)}
        empty={<EmptyState icon="file-signature" title="No contracts in this view." sub="Issue one to record somebody's employment terms." />}
        columns={[
          { key:'name', header:'Employee', sort:true, render:(c) => (
            <span className="flex items-center gap-2.5">
              <Avatar name={c.name || c.email} size={30} />
              <span className="min-w-0"><span className="block font-semibold t1 truncate">{c.name || c.email}</span>
                <span className="block text-xs t3 truncate">{c.title || DEPT_LABEL[c.department] || c.email}</span></span>
            </span>) },
          { key:'type', header:'Type', sort:true, render:(c) => <span className="text-xs t2">{CONTRACT_TYPE_LABEL[c.type] || c.type}</span> },
          { key:'startDate', header:'Term', sortValue:(c) => c.startDate, render:(c) => {
            const dl = daysLeft(c.endDate);
            return (<span className="text-xs">
              <span className="t2">{fmtDate(c.startDate)}{c.endDate ? ` → ${fmtDate(c.endDate)}` : ''}</span>
              {c.status === 'active' && dl != null && dl <= 30 &&
                <span className="block font-semibold" style={{ color: dl < 0 ? 'var(--red)' : 'var(--amber)' }}>{dl < 0 ? 'past end date' : `${dl} day${dl === 1 ? '' : 's'} left`}</span>}
            </span>); } },
          { key:'payAmount', header:'Pay', align:'right', sortValue:(c) => c.payAmount, render:(c) => (
            <span className="num font-semibold t1 text-sm">{kes(c.payAmount || 0)}<span className="t3 font-normal">{PAY_PERIOD_LABEL[c.payPeriod] || ''}</span></span>) },
          { key:'signedAt', header:'Signed', align:'center', render:(c) => (c.signedAt
            ? <Icon name="circle-check" style={{ color:'var(--green)' }} title={`Signed ${fmtDate(new Date(c.signedAt).toISOString().slice(0, 10))}`} />
            : <span className="text-xs t3">—</span>) },
          { key:'status', header:'Status', render:(c) => <Pill tone={STATUS_TONE[c.status] || 'blue'}>{STATUS_LABEL[c.status] || c.status}</Pill> },
          { key:'act', header:'', csv:false, align:'right', render:(c) => (
            <span className="flex items-center gap-1.5 justify-end">
              <Btn kind="soft" size="sm" icon="pen" onClick={(e) => { e.stopPropagation(); setEditing(c); }} title="Amend" />
              {c.status === 'active' && <Btn kind="ghost" size="sm" icon="file-circle-xmark" onClick={(e) => { e.stopPropagation(); end(c); }} title="Terminate" />}
            </span>) },
        ]} />
    </Card>

    {editing && <ContractDrawer contract={editing} staff={Array.isArray(staff) ? staff : []}
      onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    {viewing && <ContractView c={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}
  </div>);
}

function ContractDrawer({ contract, staff, onClose, onSaved }) {
  const { toast } = useDialogs();
  const isNew = !contract.id;
  const [f, setF] = useState({
    uid: contract.uid || '', type: contract.type || 'permanent', title: contract.title || '',
    startDate: contract.startDate || today(), endDate: contract.endDate || '',
    hoursPerWeek: contract.hoursPerWeek || '', payAmount: contract.payAmount || '',
    payPeriod: contract.payPeriod || 'monthly', terms: contract.terms || '', status: contract.status || 'active',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  // Anything but a permanent or contractor engagement is time-boxed by definition.
  const needsEnd = ['fixed_term', 'probation', 'intern', 'casual'].includes(f.type);
  const ok = f.uid && f.startDate && Number(f.payAmount) > 0 && (!needsEnd || f.endDate);

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await saveContract({ ...(contract.id ? { id: contract.id } : {}), ...f, payAmount: Number(f.payAmount), hoursPerWeek: Number(f.hoursPerWeek) || undefined });
      toast({ tone:'ok', title: isNew ? 'Contract issued' : 'Contract amended', body: isNew ? 'The employee has been notified.' : undefined });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not save the contract.'); setBusy(false); }
  };

  const person = staff.find((s) => s.uid === f.uid);

  return (
    <Modal title={isNew ? 'Issue a contract' : `Amend ${contract.name}'s contract`}
      subtitle={isNew ? 'Supersedes any contract they are currently on' : contract.email} icon="file-signature" onClose={onClose} maxWidth={620}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy || !ok}>{isNew ? 'Issue contract' : 'Save changes'}</Btn>
      </>}>
      <div className="space-y-3">
        {isNew && (
          <div>
            <label className="text-xs font-semibold t3">Employee *</label>
            <select value={f.uid} onChange={(e) => set('uid', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }}>
              <option value="">Choose someone…</option>
              {staff.filter((s) => s.status === 'active').map((s) => <option key={s.uid} value={s.uid}>{s.name || s.email}</option>)}
            </select>
            {person && <div className="text-xs t3 mt-1">{person.title ? `${person.title} · ` : ''}{DEPT_LABEL[person.department] || person.department}</div>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold t3">Engagement type *</label>
            <select value={f.type} onChange={(e) => set('type', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }}>
              {Object.entries(CONTRACT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold t3">Job title</label>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} placeholder="e.g. Support Agent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold t3">Start date *</label>
            <input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
          </div>
          <div>
            <label className="text-xs font-semibold t3">End date {needsEnd ? '*' : <span className="t3">(open-ended)</span>}</label>
            <input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
            {needsEnd && !f.endDate && <div className="text-[11px] mt-1" style={{ color:'var(--amber)' }}>A {CONTRACT_TYPE_LABEL[f.type].toLowerCase()} contract needs an end date.</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold t3">Pay (KES) *</label>
            <input type="number" min="0" value={f.payAmount} onChange={(e) => set('payAmount', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-semibold t3">Per</label>
            <select value={f.payPeriod} onChange={(e) => set('payPeriod', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }}>
              {Object.entries(PAY_PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v.replace('/', '')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold t3">Hours / week</label>
            <input type="number" min="0" max="168" value={f.hoursPerWeek} onChange={(e) => set('hoursPerWeek', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} placeholder="40" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold t3">Terms &amp; conditions</label>
          <textarea rows={5} value={f.terms} onChange={(e) => set('terms', e.target.value)} maxLength={8000}
            placeholder="Duties, notice period, leave entitlement, confidentiality — whatever this engagement is actually on."
            className="ym-input mt-1" style={{ width:'100%', resize:'vertical' }} />
        </div>

        {isNew && <div className="text-xs t3 flex items-start gap-2"><Icon name="circle-info" className="mt-0.5" />Issuing supersedes their current active contract (kept in history) and notifies them to review and sign it.</div>}
        {err && <div className="text-sm flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
      </div>
    </Modal>
  );
}

function ContractView({ c, onClose, onEdit }) {
  const dl = daysLeft(c.endDate);
  return (
    <Modal title={c.name || c.email} subtitle={`${CONTRACT_TYPE_LABEL[c.type] || c.type} · ${c.title || '—'}`} icon="file-signature" onClose={onClose} maxWidth={560}
      footer={<Btn kind="soft" size="sm" icon="pen" onClick={onEdit}>Amend</Btn>}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill tone={STATUS_TONE[c.status] || 'blue'}>{STATUS_LABEL[c.status] || c.status}</Pill>
          {c.signedAt ? <Pill tone="ok">Signed</Pill> : <Pill tone="amber">Unsigned</Pill>}
          {c.status === 'active' && dl != null && dl <= 30 && <Pill tone={dl < 0 ? 'red' : 'amber'}>{dl < 0 ? 'Past end date' : `${dl} days left`}</Pill>}
        </div>
        <div className="rounded-xl p-3 grid grid-cols-2 gap-3 text-sm" style={{ background:'var(--surface2)' }}>
          <div><div className="text-xs t3">Start</div><div className="t1 font-semibold">{fmtDate(c.startDate)}</div></div>
          <div><div className="text-xs t3">End</div><div className="t1 font-semibold">{c.endDate ? fmtDate(c.endDate) : 'Open-ended'}</div></div>
          <div><div className="text-xs t3">Pay</div><div className="t1 font-semibold num">{kes(c.payAmount || 0)}{PAY_PERIOD_LABEL[c.payPeriod] || ''}</div></div>
          <div><div className="text-xs t3">Hours / week</div><div className="t1 font-semibold num">{c.hoursPerWeek || '—'}</div></div>
        </div>
        {c.terms && (
          <div><div className="text-xs font-semibold t3 uppercase mb-1" style={{ letterSpacing:'.06em' }}>Terms</div>
            <div className="text-sm t2 rounded-xl p-3" style={{ background:'var(--surface2)', whiteSpace:'pre-wrap' }}>{c.terms}</div></div>
        )}
        <div className="text-xs t3">
          {c.signedAt ? `Signed by ${c.signedName || 'the employee'} on ${new Date(c.signedAt).toLocaleDateString('en-KE')}.` : 'Not yet signed by the employee.'}
          {c.issuedByEmail && ` Issued by ${c.issuedByEmail.split('@')[0]}.`}
        </div>
      </div>
    </Modal>
  );
}

/* ══ The employee's own view ══════════════════════════════════════════════
   Reachable by every staff member regardless of department — you are always
   entitled to your own terms, and signing is your act alone. */
export function MyContract() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [sig, setSig] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useDialogs();
  const { user } = useStaffClaims();

  const load = () => fetchMyContract().then(setData).catch((e) => setErr(e.message || 'Could not load your contract.'));
  useEffect(() => { load(); }, []);

  const sign = async () => {
    setBusy(true);
    try { await signContract(data.current.id, sig); toast({ tone:'ok', title:'Contract signed', body:'Thank you — a record has been kept.' }); setSig(''); load(); }
    catch (e) { toast({ tone:'error', title:'Could not sign', body:e.message }); }
    finally { setBusy(false); }
  };

  const c = data && data.current;
  const history = ((data && data.contracts) || []).filter((x) => !c || x.id !== c.id);

  return (<div className="fadeup space-y-6">
    <SectionHead icon="file-signature" title="My contract" sub="Your own employment terms" />
    {err && <div className="text-sm flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
    {!data && !err && <div className="py-8 text-center t3 text-sm"><Icon name="spinner" className="fa-spin mr-2" />Loading…</div>}

    {data && !c && <Card className="p-2"><EmptyState icon="file-circle-question" title="No active contract on record." sub="Ask People to issue one." /></Card>}

    {c && (
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase t3" style={{ letterSpacing:'.08em' }}>{CONTRACT_TYPE_LABEL[c.type] || c.type}</div>
            <h3 className="text-xl font-bold t1">{c.title || 'Employment contract'}</h3>
            <div className="text-sm t3">{fmtDate(c.startDate)}{c.endDate ? ` → ${fmtDate(c.endDate)}` : ' · open-ended'}</div>
          </div>
          {c.signedAt ? <Pill tone="ok">Signed {new Date(c.signedAt).toLocaleDateString('en-KE')}</Pill> : <Pill tone="amber">Awaiting your signature</Pill>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3" style={{ background:'var(--surface2)' }}><div className="text-xs t3">Pay</div><div className="num font-bold t1">{kes(c.payAmount || 0)}<span className="t3 font-normal text-sm">{PAY_PERIOD_LABEL[c.payPeriod] || ''}</span></div></div>
          <div className="rounded-xl p-3" style={{ background:'var(--surface2)' }}><div className="text-xs t3">Hours / week</div><div className="num font-bold t1">{c.hoursPerWeek || '—'}</div></div>
          <div className="rounded-xl p-3" style={{ background:'var(--surface2)' }}><div className="text-xs t3">Department</div><div className="font-bold t1 text-sm">{DEPT_LABEL[c.department] || c.department || '—'}</div></div>
        </div>

        {c.terms && (
          <div><div className="text-xs font-semibold t3 uppercase mb-1" style={{ letterSpacing:'.06em' }}>Terms</div>
            <div className="text-sm t2 rounded-xl p-4" style={{ background:'var(--surface2)', whiteSpace:'pre-wrap', maxHeight:280, overflowY:'auto' }}>{c.terms}</div></div>
        )}

        {!c.signedAt && (
          <div className="rounded-xl p-4" style={{ border:'1px solid var(--pri)', background:'var(--pri-soft)' }}>
            <div className="text-sm font-semibold" style={{ color:'var(--pri)' }}>Acknowledge these terms</div>
            <p className="text-xs t3 mt-1">Type your full name to confirm you've read and accept this contract. The time is recorded.</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <input value={sig} onChange={(e) => setSig(e.target.value)} placeholder={user?.displayName || 'Your full name'} className="ym-input" style={{ flex:1, minWidth:180 }} />
              <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'pen-clip'} onClick={sign} disabled={busy || sig.trim().length < 2}>Sign</Btn>
            </div>
          </div>
        )}
      </Card>
    )}

    {history.length > 0 && (
      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-3"><h3 className="font-bold t1">Previous contracts</h3><p className="text-xs t3">Kept as a record of what you were employed under</p></div>
        <DataTable minWidth={420} rows={history}
          columns={[
            { key:'type', header:'Type', render:(x) => <span className="text-xs t2">{CONTRACT_TYPE_LABEL[x.type] || x.type}</span> },
            { key:'startDate', header:'Term', render:(x) => <span className="text-xs t2">{fmtDate(x.startDate)}{x.endDate ? ` → ${fmtDate(x.endDate)}` : ''}</span> },
            { key:'payAmount', header:'Pay', align:'right', render:(x) => <span className="num text-sm t1">{kes(x.payAmount || 0)}{PAY_PERIOD_LABEL[x.payPeriod] || ''}</span> },
            { key:'status', header:'Status', render:(x) => <Pill tone={STATUS_TONE[x.status] || 'blue'}>{STATUS_LABEL[x.status] || x.status}</Pill> },
          ]} />
      </Card>
    )}
  </div>);
}
