/* riders.jsx — Staff: rider applications from the public /rider page. Logistics
   vet and approve them here. CONFIDENTIAL · staff only (applicant PII: phone,
   licence, plate). Auto-refreshes via useStaffResource. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, DataTable } from './ui.jsx';
import { useStaffResource, fetchRiderApplications, setRiderApplicationStage } from './service.js';
import { useEscape } from '../../lib/useEscape.js';
const { useState } = React;

const STAGES = [
  { id: 'new', label: 'New', tone: 'pending' },
  { id: 'review', label: 'In review', tone: 'pending' },
  { id: 'vetting', label: 'Vetting', tone: 'pending' },
  { id: 'approved', label: 'Approved', tone: 'active' },
  { id: 'rejected', label: 'Not proceeding', tone: 'inactive' },
];
const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
const VEHICLE_LABEL = { motorbike: 'Motorbike', bicycle: 'Bicycle', tuktuk: 'Tuk-tuk', car: 'Car', van: 'Van / pickup', foot: 'On foot' };
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function RiderDrawer({ app, onClose, onMoved }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  useEscape(onClose, !busy); // Esc closes, unless a stage move is in flight
  const move = async (stage) => {
    setBusy(true); setErr('');
    try { await setRiderApplicationStage(app.id, stage, note.trim()); setNote(''); onMoved && onMoved(); onClose(); }
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
          <span className="text-xs t3">{VEHICLE_LABEL[app.vehicle] || app.vehicle} · {app.availability}</span>
        </div>

        <Card className="p-4 space-y-2">
          <div className="text-sm t2"><Icon name="phone" className="mr-2 t3" /><a href={`tel:${app.phone}`} style={{ color: 'var(--pri)' }}>{app.phone}</a> <span className="text-xs t3">(M-Pesa)</span></div>
          {app.email && <div className="text-sm t2"><Icon name="envelope" className="mr-2 t3" /><a href={`mailto:${app.email}`} style={{ color: 'var(--pri)' }}>{app.email}</a></div>}
          <div className="text-sm t2"><Icon name="location-dot" className="mr-2 t3" />{app.county}</div>
          {app.plate && <div className="text-sm t2"><Icon name="motorcycle" className="mr-2 t3" />Plate <b>{app.plate}</b></div>}
          {app.licence && <div className="text-sm t2"><Icon name="id-card" className="mr-2 t3" />Licence <b>{app.licence}</b></div>}
        </Card>

        {app.note && (
          <div>
            <div className="text-xs font-semibold t2 mb-2">Their note</div>
            <Card className="p-4"><p className="text-sm t2 whitespace-pre-wrap leading-relaxed">{app.note}</p></Card>
          </div>
        )}

        {app.notes && app.notes.length > 0 && (
          <div>
            <div className="text-xs font-semibold t2 mb-2">Vetting notes</div>
            <div className="space-y-2">
              {app.notes.map((n, i) => (
                <Card key={i} className="p-3"><div className="text-sm t2">{n.text}</div><div className="text-[11px] t3 mt-1">{fmtDate(n.at)}</div></Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold t2">Add a note (saved with the next move)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="ym-input w-full" placeholder="e.g. Licence checked, plate verified — approve" />
        </div>

        {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" className="mr-2" />{err}</div>}

        <div>
          <div className="text-xs font-semibold t2 mb-2">Move to</div>
          <div className="flex gap-2 flex-wrap">
            {STAGES.filter((s) => s.id !== app.stage).map((s) => (
              <Btn key={s.id} kind={s.id === 'rejected' ? 'ghost' : 'primary'} size="sm" disabled={busy} onClick={() => move(s.id)}>{s.label}</Btn>
            ))}
          </div>
          <p className="text-xs t3 mt-3">Approving records the decision here. The rider signs in with the Rider app using this phone number.</p>
        </div>
      </div>
    </div>
  );
}

export function RiderApplications() {
  const [stage, setStage] = useState('new');
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const { data, loading, live, reload } = useStaffResource(fetchRiderApplications, { applications: [], counts: {} }, []);
  const all = data.applications || [];
  const counts = data.counts || {};

  const ql = q.trim().toLowerCase();
  const rows = all
    .filter((a) => stage === 'all' || a.stage === stage)
    .filter((a) => !ql || `${a.name} ${a.phone} ${a.county} ${a.plate} ${a.ref}`.toLowerCase().includes(ql));

  const columns = [
    { key: 'name', header: 'Rider', sort: true, render: (r) => (<div><div className="font-semibold t1 text-sm">{r.name}</div><div className="text-xs t3">{r.phone}</div></div>) },
    { key: 'county', header: 'Area', sort: true, render: (r) => <span className="text-sm t2">{r.county}</span> },
    { key: 'vehicle', header: 'Ride', sort: true, render: (r) => (<div><div className="text-sm t2">{VEHICLE_LABEL[r.vehicle] || r.vehicle}</div>{r.plate && <div className="text-xs t3">{r.plate}</div>}</div>) },
    { key: 'stage', header: 'Stage', sort: true, render: (r) => <Pill tone={stageMeta(r.stage).tone}>{stageMeta(r.stage).label}</Pill> },
    { key: 'createdAt', header: 'Applied', sort: true, sortValue: (r) => r.createdAt || 0, render: (r) => <span className="text-xs t3">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div className="fadeup space-y-5">
      <SectionHead
        icon="motorcycle"
        title="Rider applications"
        sub={`People applying to join the delivery network${live ? '' : ' — backend unavailable'}`}
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, area, plate…" className="ym-input ml-auto" style={{ maxWidth: 280 }} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading && !all.length
          ? <div className="text-sm t3 py-10 text-center"><Icon name="spinner" className="fa-spin mr-2" />Loading applications…</div>
          : <DataTable columns={columns} rows={rows} onRowClick={(r) => setOpen(r)} pageSize={15}
              initialSort={{ key: 'createdAt', dir: 'desc' }}
              empty={q ? `No riders match “${q}”.` : (stage === 'new' ? 'No new rider applications right now.' : 'Nothing in this stage.')} />}
      </Card>

      {open && <RiderDrawer app={open} onClose={() => setOpen(null)} onMoved={reload} />}
    </div>
  );
}
