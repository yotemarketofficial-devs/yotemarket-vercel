/* careers.jsx — Staff: recruitment inbox. Job applications from the public
   /careers page, triaged through a hiring funnel. CONFIDENTIAL · staff only
   (candidate PII). Auto-refreshes via useStaffResource. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, DataTable } from './ui.jsx';
import { useStaffResource, fetchJobApplications, setJobApplicationStage, fetchJobOpenings, saveJobOpening, deleteJobOpening, deleteJobApplication } from './service.js';
import { useEscape } from '../../lib/useEscape.js';
const { useState } = React;

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'volunteer'];

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
  useEscape(onClose, !busy); // Esc closes, unless a stage move is in flight
  const move = async (stage) => {
    setBusy(true); setErr('');
    try { await setJobApplicationStage(app.id, stage, note.trim()); setNote(''); onMoved && onMoved(); onClose(); }
    catch (e) { setErr(e.message || 'Could not update.'); }
    finally { setBusy(false); }
  };
  // Right to erasure — a candidate can ask us to delete their data.
  const erase = async () => {
    if (!window.confirm(`Permanently erase ${app.name}'s application (${app.ref})? This deletes their name, contact details and CV links. It can't be undone.`)) return;
    setBusy(true); setErr('');
    try { await deleteJobApplication(app.id); onMoved && onMoved(); onClose(); }
    catch (e) { setErr(e.message || 'Could not delete.'); setBusy(false); }
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

        <div className="pt-4" style={{ borderTop:'1px solid var(--line)' }}>
          <div className="text-xs font-semibold t2 mb-1">Erase</div>
          <div className="text-xs t3 mb-2">Deletes their personal data for good — use when a candidate asks us to.</div>
          <Btn kind="danger" size="sm" icon="trash" disabled={busy} onClick={erase}>Delete application</Btn>
        </div>
      </div>
    </div>
  );
}

/* Open positions — what the public /careers page advertises. Posting here puts a
   role live immediately (the page streams job_openings); no deploy needed. */
function Openings() {
  const blank = { title: '', dept: 'engineering', type: 'full-time', location: 'Nairobi', summary: '' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const { data, loading, reload } = useStaffResource(fetchJobOpenings, { openings: [] }, []);
  const openings = data.openings || [];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { setMsg({ ok: false, text: 'A role title is required.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await saveJobOpening({ ...form, title: form.title.trim(), status: 'open' });
      setForm({ ...blank, dept: form.dept });
      setMsg({ ok: true, text: form.id ? 'Role updated.' : 'Role is live on the careers page.' });
      reload();
    } catch (e) { setMsg({ ok: false, text: e.message || 'Could not save the role.' }); }
    finally { setBusy(false); }
  };
  const toggle = async (o) => {
    try { await saveJobOpening({ id: o.id, dept: o.dept, title: o.title, type: o.type, location: o.location, summary: o.summary, status: o.status === 'open' ? 'closed' : 'open' }); reload(); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Failed.' }); }
  };
  const remove = async (o) => {
    if (!window.confirm(`Delete “${o.title}”? This can't be undone.`)) return;
    try { await deleteJobOpening(o.id); reload(); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Failed.' }); }
  };

  return (
    <Card className="p-6 space-y-4">
      <SectionHead icon="bullhorn" title="Open positions" sub="What /careers advertises — posting here goes live instantly" />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Role title e.g. Flutter Engineer" className="ym-input lg:col-span-2" />
        <select value={form.dept} onChange={(e) => set('dept', e.target.value)} className="ym-input">
          {Object.entries(DEPT_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={form.type} onChange={(e) => set('type', e.target.value)} className="ym-input">
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Location e.g. Nairobi / Remote" className="ym-input" />
        <input value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="One-line summary (optional)" className="ym-input lg:col-span-3" />
      </div>
      <Btn kind="primary" size="md" icon={busy ? 'spinner' : 'plus'} onClick={save} disabled={busy || !form.title.trim()}>{busy ? 'Saving…' : 'Post role'}</Btn>

      {loading && !openings.length ? <div className="text-sm t3 py-4 text-center"><Icon name="spinner" className="fa-spin mr-2" />Loading roles…</div>
        : openings.length === 0 ? <div className="text-sm t3 py-4 text-center">No roles posted yet — the careers page invites open applications until you post one.</div>
          : (
            <div className="space-y-2">
              {openings.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--line)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold t1 text-sm">{o.title}</span>
                      <Pill tone={o.status === 'open' ? 'active' : 'inactive'}>{o.status === 'open' ? 'Live' : 'Closed'}</Pill>
                    </div>
                    <div className="text-xs t3 mt-0.5">{DEPT_LABEL[o.dept] || o.dept} · {o.type}{o.location ? ` · ${o.location}` : ''}</div>
                  </div>
                  <button onClick={() => toggle(o)} className="text-xs font-semibold" style={{ color: 'var(--pri)' }}>{o.status === 'open' ? 'Close' : 'Reopen'}</button>
                  <button onClick={() => remove(o)} className="text-xs font-semibold" style={{ color: 'var(--red)' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
    </Card>
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

      <Openings />

      {open && <ApplicantDrawer app={open} onClose={() => setOpen(null)} onMoved={reload} />}
    </div>
  );
}
