/* employee.jsx — one employee, everything on one page. CONFIDENTIAL · internal.

   Opened from the Directory by an admin, a People lead, or the lead of the department
   that person actually works in. The server resolves that from the SUBJECT'S department
   rather than trusting anything sent from here, so this screen only decides what to show.

   Two things it deliberately does NOT show, both enforced server-side rather than here:

   • Complaints made about you. Not to a lead, not to an admin, not to the founder. A
     complaints system that shows the subject who complained is a way of finding out who
     talked. The screen says the section is withheld rather than pretending it is empty —
     an empty list would read as "nobody has complained", which may be untrue.
   • An anonymous complainant's name. It is never sent to the client at all, so no change
     to this file could ever reveal it.

   Pay and statutory numbers travel only to admin and People (`canSeeSensitive`). A
   department lead needs to run their team, which does not require knowing what they earn. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Avatar, Stat, Modal, EmptyState, kes } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  fetchEmployeeRecord, saveEmployeeReview, fileComplaint, resolveComplaint,
  setEmployeeDetails, setStaffProfile, DEPT_LABEL, TIER_LABEL, useStaffClaims,
} from './service.js';

const { useState, useEffect, useCallback } = React;

const EDUCATION_LEVELS = [
  ['', 'Not recorded'], ['none', 'None'], ['primary', 'Primary'], ['secondary', 'Secondary'],
  ['certificate', 'Certificate'], ['diploma', 'Diploma'], ['degree', 'Degree'],
  ['masters', "Master's"], ['doctorate', 'Doctorate'],
];
const EDU_LABEL = Object.fromEntries(EDUCATION_LEVELS);

const COMPLAINT_TONE = { open:'red', investigating:'amber', upheld:'red', dismissed:'blue', resolved:'ok' };
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—');
const hhmm = (min) => (min ? `${Math.floor(min / 60)}h` : '0h');

/* Stars, because a 1–5 rating reads faster as marks than as a number. */
function Stars({ n }) {
  return (
    <span style={{ color:'var(--amber)' }} aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name={i <= n ? 'star' : 'star-half-stroke'} className="text-xs" />)}
    </span>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export function EmployeeRecord({ uid, onBack }) {
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [complaining, setComplaining] = useState(false);
  const dialogs = useDialogs();
  const { isAdmin, tier, departments = [] } = useStaffClaims();
  const isPeople = isAdmin || (tier === 'lead' && departments.includes('people'));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetchEmployeeRecord(uid); setRec(r.record); setErr(null); }
    catch (e) { setErr(e.message || 'Could not open that record.'); }
    finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Card className="p-6 t3 text-sm">Loading record…</Card>;
  if (err) return <Card className="p-6 text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>;
  if (!rec) return null;

  const activeContract = (rec.contracts || []).find((c) => c.status === 'active') || null;
  const openComplaints = (rec.complaints || []).filter((c) => ['open', 'investigating'].includes(c.status));
  const avgRating = rec.reviews?.length
    ? Math.round((rec.reviews.reduce((s, r) => s + (r.rating || 0), 0) / rec.reviews.length) * 10) / 10
    : null;

  return (
    <div className="fadeup space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {onBack && <Btn kind="ghost" size="sm" icon="arrow-left" onClick={onBack}>Directory</Btn>}
      </div>

      {/* Identity */}
      <Card className="p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar src={rec.photoUrl} name={rec.name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold t1">{rec.name}</h2>
              <Pill tone={rec.status === 'active' ? 'ok' : 'red'}>{rec.status}</Pill>
              {rec.tier && <Pill tone="blue">{TIER_LABEL[rec.tier] || rec.tier}</Pill>}
            </div>
            <div className="text-sm t3 mt-1">
              {rec.title || 'No job title set'} · {DEPT_LABEL[rec.department] || rec.department || 'No department'}
            </div>
            <div className="text-xs t3 mt-1">
              {rec.email}{rec.staffId ? <> · <span className="num">{rec.staffId}</span></> : null}
              {rec.startedAt ? ` · since ${fmtDate(rec.startedAt)}` : ''}
            </div>
          </div>
          <Btn kind="ghost" size="sm" icon="pen" onClick={() => setEditing(true)}>Edit details</Btn>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Education" value={EDU_LABEL[rec.educationLevel || ''] || 'Not recorded'} icon="graduation-cap" tone="blue" />
        <Stat label="Performance" value={avgRating ? `${avgRating}/5` : 'No reviews'} icon="star"
          sub={rec.reviews?.length ? `${rec.reviews.length} review${rec.reviews.length === 1 ? '' : 's'}` : undefined} tone="amber" />
        <Stat label="Open complaints" value={rec.complaintsHidden ? '—' : openComplaints.length}
          icon="triangle-exclamation" tone={openComplaints.length ? 'red' : 'green'} />
        <Stat label="Time worked" value={hhmm(rec.attendance?.minutes)} icon="clock"
          sub={`${rec.attendance?.daysWorked || 0} days on the clock`} tone="pri" />
      </div>

      {/* Education */}
      <Card className="p-5">
        <h3 className="font-bold t1 mb-2"><Icon name="graduation-cap" /> Education</h3>
        <div className="text-sm t2">{EDU_LABEL[rec.educationLevel || ''] || 'Not recorded'}</div>
        {rec.education
          ? <div className="text-sm t3 mt-1" style={{ whiteSpace:'pre-wrap' }}>{rec.education}</div>
          : <div className="text-xs t3 mt-1">No detail recorded — add it with “Edit details”.</div>}
      </Card>

      {/* Employment */}
      <Card className="p-5">
        <h3 className="font-bold t1 mb-2"><Icon name="file-signature" /> Employment</h3>
        {activeContract ? (
          <div className="text-sm t2">
            {activeContract.title || '—'} · {activeContract.type?.replace('_', ' ')} · from {activeContract.startDate}
            {activeContract.endDate ? ` to ${activeContract.endDate}` : ' (open-ended)'}
            {rec.canSeeSensitive && activeContract.payAmount
              ? <> · <b className="t1">{kes(activeContract.payAmount)}</b> {activeContract.payPeriod}</> : null}
            <div className="text-xs t3 mt-1">
              {activeContract.signedAt ? `Signed ${fmtDate(activeContract.signedAt)}` : 'NOT SIGNED'}
            </div>
          </div>
        ) : <div className="text-sm t3">No active contract.</div>}
        {(rec.contracts || []).length > 1 && (
          <div className="text-xs t3 mt-2">{rec.contracts.length - 1} earlier contract(s) on file.</div>
        )}
        {rec.canSeeSensitive && (
          <div className="text-xs t3 mt-3" style={{ borderTop:'1px solid var(--line)', paddingTop:8 }}>
            KRA {rec.kraPin || '—'} · NSSF {rec.nssfNo || '—'} · SHIF {rec.shifNo || '—'}
          </div>
        )}
      </Card>

      {/* Performance */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold t1"><Icon name="star" /> Performance</h3>
          {isPeople && <Btn kind="ghost" size="sm" icon="plus" onClick={() => setReviewing(true)}>Record a review</Btn>}
        </div>
        {(rec.reviews || []).length ? rec.reviews.map((r) => (
          <div key={r.id} className="py-2" style={{ borderTop:'1px solid var(--line)' }}>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <b className="t1">{r.period}</b> <Stars n={r.rating} />
              <span className="text-xs t3">· {r.byName} · {fmtDate(r.at)}</span>
            </div>
            {r.strengths && <div className="text-sm t2 mt-1"><b className="t3 text-xs">Strengths </b>{r.strengths}</div>}
            {r.concerns && <div className="text-sm t2 mt-1"><b className="t3 text-xs">Concerns </b>{r.concerns}</div>}
          </div>
        )) : <div className="text-sm t3">No reviews recorded yet.</div>}
      </Card>

      {/* Complaints */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold t1"><Icon name="triangle-exclamation" /> Complaints</h3>
          <Btn kind="ghost" size="sm" icon="flag" onClick={() => setComplaining(true)}>Raise one</Btn>
        </div>

        {rec.complaintsHidden ? (
          // Said plainly rather than shown as empty: an empty list would read as "nobody
          // has complained", which may not be true.
          <div className="text-sm t3">
            Complaints about you are not shown here, to anyone at any level — including you.
            People handle them directly.
          </div>
        ) : (rec.complaints || []).length ? rec.complaints.map((c) => (
          <div key={c.id} className="py-2" style={{ borderTop:'1px solid var(--line)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <b className="t1 text-sm">{c.subject}</b>
              <Pill tone={COMPLAINT_TONE[c.status] || 'blue'}>{c.status}</Pill>
              <span className="text-xs t3">· {c.byName} · {fmtDate(c.at)}</span>
            </div>
            {c.detail && <div className="text-sm t2 mt-1" style={{ whiteSpace:'pre-wrap' }}>{c.detail}</div>}
            {c.resolution && <div className="text-xs t3 mt-1">Resolution: {c.resolution}</div>}
            {isPeople && !['resolved', 'dismissed'].includes(c.status) && (
              <div className="flex gap-2 mt-2">
                {['investigating', 'upheld', 'dismissed', 'resolved'].map((s) => (
                  <Btn key={s} kind="ghost" size="sm" onClick={async () => {
                    const note = await dialogs.prompt({ title:`Mark as ${s}`, body:'Add a short resolution note.', optional:true, multiline:true });
                    if (note === null) return;
                    try { await resolveComplaint(c.id, s, note || ''); load(); }
                    catch (e) { dialogs.toast?.({ title:e.message, tone:'error' }); }
                  }}>{s}</Btn>
                ))}
              </div>
            )}
          </div>
        )) : <div className="text-sm t3">No complaints on file.</div>}
      </Card>

      {editing && (
        <DetailsModal rec={rec} canEdit={isPeople} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
      )}
      {reviewing && (
        <ReviewModal uid={uid} name={rec.name} onClose={() => setReviewing(false)} onSaved={() => { setReviewing(false); load(); }} />
      )}
      {complaining && (
        <ComplaintModal aboutUid={uid} name={rec.name} onClose={() => setComplaining(false)} onSaved={() => { setComplaining(false); load(); }} />
      )}
    </div>
  );
}

/* ── Edit name, title, education, photo ───────────────────────────────────── */
function DetailsModal({ rec, canEdit, onClose, onSaved }) {
  const [f, setF] = useState({
    name: rec.name || '', title: rec.title || '',
    educationLevel: rec.educationLevel || '', education: rec.education || '',
  });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      let photoUrl;
      if (photo) {
        const { uploadFile } = await import('../../lib/storage.js');
        photoUrl = await uploadFile(`staff_photos/${rec.uid}/${Date.now()}.jpg`, photo, photo.type || 'image/jpeg');
      }
      if (f.name.trim() && f.name !== rec.name) await setStaffProfile({ uid: rec.uid, name: f.name, title: f.title });
      else if (f.title !== rec.title) await setStaffProfile({ uid: rec.uid, name: f.name || rec.name, title: f.title });
      await setEmployeeDetails({
        uid: rec.uid, educationLevel: f.educationLevel, education: f.education,
        ...(photoUrl ? { photoUrl } : {}),
      });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal title={`Edit — ${rec.name}`} icon="pen" onClose={onClose} maxWidth={520}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy}>Save</Btn>
      </>}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold t3">Full name
          <input value={f.name} onChange={(e) => set('name', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
        </label>
        <label className="block text-xs font-semibold t3">Job title
          <input value={f.title} onChange={(e) => set('title', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
        </label>
        <label className="block text-xs font-semibold t3">Education level
          <select value={f.educationLevel} onChange={(e) => set('educationLevel', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }}>
            {EDUCATION_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold t3">Institution, field, year
          <textarea value={f.education} onChange={(e) => set('education', e.target.value)}
            className="ym-input mt-1" style={{ width:'100%', minHeight:70 }}
            placeholder="e.g. University of Nairobi — BSc Computer Science, 2021" />
        </label>
        <label className="block text-xs font-semibold t3">Company photo
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            className="ym-input mt-1" style={{ width:'100%', padding:'8px 10px' }} />
          {photo && <span className="block text-[11px] t3 mt-1 font-normal">{photo.name}</span>}
        </label>
        {!canEdit && <div className="text-xs t3">You can edit your own record; a People lead edits anybody’s.</div>}
        {err && <div className="text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

/* ── Record a performance review ──────────────────────────────────────────── */
function ReviewModal({ uid, name, onClose, onSaved }) {
  const thisPeriod = () => `${new Date().getFullYear()} H${new Date().getMonth() < 6 ? 1 : 2}`;
  const [f, setF] = useState({ period: thisPeriod(), rating: 3, strengths: '', concerns: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try { await saveEmployeeReview({ uid, ...f }); onSaved(); }
    catch (e) { setErr(e.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal title={`Review — ${name}`} icon="star" onClose={onClose} maxWidth={520}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy}>Record</Btn>
      </>}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold t3">Period
          <input value={f.period} onChange={(e) => set('period', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
        </label>
        <div>
          <div className="text-xs font-semibold t3 mb-1">Rating</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => set('rating', n)} aria-label={`${n} of 5`}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, padding:2,
                  color: n <= f.rating ? 'var(--amber)' : 'var(--t3)' }}>
                <Icon name="star" />
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-semibold t3">Strengths
          <textarea value={f.strengths} onChange={(e) => set('strengths', e.target.value)}
            className="ym-input mt-1" style={{ width:'100%', minHeight:70 }} />
        </label>
        <label className="block text-xs font-semibold t3">Concerns
          <textarea value={f.concerns} onChange={(e) => set('concerns', e.target.value)}
            className="ym-input mt-1" style={{ width:'100%', minHeight:70 }} />
        </label>
        <div className="text-xs t3">The employee is notified that a review was recorded.</div>
        {err && <div className="text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

/* ── Raise a complaint ────────────────────────────────────────────────────── */
function ComplaintModal({ aboutUid, name, onClose, onSaved }) {
  const [f, setF] = useState({ subject: '', detail: '', anonymous: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try { await fileComplaint({ aboutUid, ...f }); onSaved(); }
    catch (e) { setErr(e.message || 'Could not file.'); setBusy(false); }
  };

  return (
    <Modal title={`Complaint about ${name}`} icon="flag" onClose={onClose} maxWidth={520}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'flag'} onClick={save} disabled={busy || !f.subject.trim()}>File it</Btn>
      </>}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold t3">Subject
          <input value={f.subject} onChange={(e) => set('subject', e.target.value)} className="ym-input mt-1" style={{ width:'100%' }} />
        </label>
        <label className="block text-xs font-semibold t3">What happened
          <textarea value={f.detail} onChange={(e) => set('detail', e.target.value)}
            className="ym-input mt-1" style={{ width:'100%', minHeight:110 }} />
        </label>
        <label className="text-sm t2 flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={f.anonymous} onChange={(e) => set('anonymous', e.target.checked)} className="mt-1" />
          <span>
            <b>File anonymously.</b> Your name is never sent to anyone reading this — it is withheld
            by the server, not hidden by this screen.
          </span>
        </label>
        <div className="text-xs t3">
          {name} will not see this complaint, or who raised it, in their own record.
        </div>
        {err && <div className="text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

export default EmployeeRecord;
