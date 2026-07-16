/* careers.jsx — Staff: recruitment inbox. Job applications from the public
   /careers page, triaged through a hiring funnel. CONFIDENTIAL · staff only
   (candidate PII). Auto-refreshes via useStaffResource. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, DataTable } from './ui.jsx';
import { useStaffResource, fetchJobApplications, setJobApplicationStage } from './service.js';
const { useState } = React;

const STAGES = [
  { id: 'new', label: 'New', tone: 'pending' },
  { id: 'review', label: 'In review', tone: 'pending' },
  { id: 'shortlist', label: 'Shortlisted', tone: 'active' },
  { id: 'interview', label: 'Interview', tone: 'active' },
  { id: 'offer', label: 'Offer', tone: 'active' },
  { id: 'hired', label: 'Hired', tone: 'active' },
  { id: 'rejected', label: 'Not proceeding', tone: 'inactive' },
];
const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
const DEPT_LABEL = {
  engineering: 'Engineering', operations: 'Operations & Logistics', support: 'Customer Support',
  growth: 'Growth & Partnerships', finance: 'Finance & Admin', marketing: 'Marketing & Brand', other: 'Other',
};
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/* Detail drawer — the full application + funnel controls. */
function ApplicantDrawer({ app, onClose, onMoved }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const move = async (stage) => {
    setBusy(true); setErr('');
    try { await setJobApplicationStage(app.id, stage, note.trim()); setNote(''); onMoved && onMoved(); onClose(); }
    catch (e) { setErr(e.message || 'Could not update.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0" style={{ background: 'rgba(20,8,37,.5)' }} />
      <div className="relative h-full w-full max-w-[520px] overflow-y-auto p-6 space-y-5" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--line)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold t1">{app.name}</h3>
            <div className="text-xs t3 mt-1">{app.ref} · applied {fmtDate(app.createdAt)}</div>
          </div>
          <button onClick={onClose} className="text-lg t3" aria-label="Close"><Icon name="xmark" /></button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone={stageMeta(app.stage).tone}>{stageMeta(app.stage).label}</Pill>
          <span className="text-xs t3">{DEPT_LABEL[app.dept] || app.dept}</span>
          {app.role && <span className="text-xs t3">· {app.role}</span>}
        </div>

        <Card className="p-4 space-y-2">
          <div className="text-sm t2"><Icon name="envelope" className="mr-2 t3" /><a href={`mailto:${app.email}`} style={{ color: 'var(--pri)' }}>{app.email}</a></div>
          {app.phone && <div className="text-sm t2"><Icon name="phone" className="mr-2 t3" /><a href={`tel:${app.phone}`} style={{ color: 'var(--pri)' }}>{app.phone}</a></div>}
          {app.links && <div className="text-sm t2 break-all"><Icon name="link" className="mr-2 t3" />{app.links}</div>}
        </Card>

        <div>
          <div className="text-xs font-semibold t2 mb-2">Their pitch</div>
          <Card className="p-4"><p className="text-sm t2 whitespace-pre-wrap leading-relaxed">{app.message}</p></Card>
        </div>

        {app.notes && app.notes.length > 0 && (
          <div>
            <div className="text-xs font-semibold t2 mb-2">Internal notes</div>
            <div className="space-y-2">
              {app.notes.map((n, i) => (
                <Card key={i} className="p-3"><div className="text-sm t2">{n.text}</div><div className="text-[11px] t3 mt-1">{fmtDate(n.at)}</div></Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold t2">Add a note (saved with the next move)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="ym-input w-full" placeholder="e.g. Strong Flutter background — book a call" />
        </div>

        {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" className="mr-2" />{err}</div>}

        <div>
          <div className="text-xs font-semibold t2 mb-2">Move to</div>
          <div className="flex gap-2 flex-wrap">
            {STAGES.filter((s) => s.id !== app.stage).map((s) => (
              <Btn key={s.id} kind={s.id === 'rejected' ? 'ghost' : 'primary'} size="sm" disabled={busy} onClick={() => move(s.id)}>{s.label}</Btn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Careers() {
  const [stage, setStage] = useState('new');
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const { data, loading, live, reload } = useStaffResource(fetchJobApplications, { applications: [], counts: {} }, []);
  const all = data.applications || [];
  const counts = data.counts || {};

  const ql = q.trim().toLowerCase();
  const rows = all
    .filter((a) => stage === 'all' || a.stage === stage)
    .filter((a) => !ql || `${a.name} ${a.email} ${a.role} ${a.ref}`.toLowerCase().includes(ql));

  const columns = [
    { key: 'name', header: 'Candidate', sort: true, render: (r) => (<div><div className="font-semibold t1 text-sm">{r.name}</div><div className="text-xs t3">{r.email}</div></div>) },
    { key: 'dept', header: 'Team', sort: true, render: (r) => (<div><div className="text-sm t2">{DEPT_LABEL[r.dept] || r.dept}</div>{r.role && <div className="text-xs t3">{r.role}</div>}</div>) },
    { key: 'stage', header: 'Stage', sort: true, render: (r) => <Pill tone={stageMeta(r.stage).tone}>{stageMeta(r.stage).label}</Pill> },
    { key: 'createdAt', header: 'Applied', sort: true, sortValue: (r) => r.createdAt || 0, render: (r) => <span className="text-xs t3">{fmtDate(r.createdAt)}</span> },
    { key: 'ref', header: 'Ref', render: (r) => <span className="text-xs t3">{r.ref}</span> },
  ];

  return (
    <div className="fadeup space-y-5">
      <SectionHead
        icon="briefcase"
        title="Job applications"
        sub={`Candidates from the public careers page${live ? '' : ' — backend unavailable'}`}
        action={<Btn kind="ghost" size="sm" icon="rotate" onClick={reload}>Refresh</Btn>}
      />

      <div className="flex gap-2 flex-wrap items-center">
        {[{ id: 'all', label: 'All' }, ...STAGES].map((s) => {
          const n = s.id === 'all' ? all.length : (counts[s.id] || 0);
          return (
            <button key={s.id} onClick={() => setStage(s.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: stage === s.id ? 'var(--pri)' : 'var(--surface2)', color: stage === s.id ? '#fff' : 'var(--t2)' }}>
              {s.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, role…" className="ym-input ml-auto" style={{ maxWidth: 260 }} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading && !all.length
          ? <div className="text-sm t3 py-10 text-center"><Icon name="spinner" className="fa-spin mr-2" />Loading applications…</div>
          : <DataTable columns={columns} rows={rows} onRowClick={(r) => setOpen(r)} pageSize={15}
              initialSort={{ key: 'createdAt', dir: 'desc' }}
              empty={q ? `No applications match “${q}”.` : (stage === 'new' ? 'No new applications right now.' : 'Nothing in this stage.')} />}
      </Card>

      {open && <ApplicantDrawer app={open} onClose={() => setOpen(null)} onMoved={reload} />}
    </div>
  );
}
