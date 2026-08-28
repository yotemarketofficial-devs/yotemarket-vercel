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
  setLinkedIn, importLinkedInResume, parseResumeText, saveResume,
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

/* ── LinkedIn and the resume ──────────────────────────────────────────────────
   Somebody gives us their profile URL and we fetch that page to pull their work history
   out of it.

   WHAT THIS SCREEN HAS TO HANDLE: LinkedIn shows logged-out visitors a sign-in wall and
   blocks server address ranges, so that fetch often comes back walled. That is a normal
   outcome with a next step, not a fault — so the import resolves with a reason and an
   `advice` line, and the screen offers the paste path rather than showing an error.

   NOTHING SAVES UNTIL SOMEBODY CONFIRMS IT. Both paths produce a draft that is shown for
   review first. An extractor is making a suggestion, and an employment record is not a
   thing to let a parser write unreviewed. */

const yearsLabel = (a, b, current) => {
  if (!a && !b) return '';
  if (current || (a && !b)) return `${a || '?'} — present`;
  return a === b ? String(a) : `${a || '?'} — ${b || '?'}`;
};

/* The draft, before it becomes a record. Read-only on purpose: this is a review step,
   and an editable form here would blur the line between what was extracted and what a
   person vouched for. Corrections go through "Edit details" after saving. */
function ResumeDraftModal({ draft, source, notice, onClose, onSave, busy }) {
  return (
    <Modal
      title="Check this before it is saved"
      subtitle={source === 'linkedin' ? 'Extracted from the LinkedIn profile' : 'Extracted from the text supplied'}
      icon="file-lines"
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Discard</Btn>
          <Btn icon="check" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : 'Looks right — save'}</Btn>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {notice && (
          <div className="text-xs t3 p-3 rounded-lg" style={{ background:'var(--surface2)' }}>
            <Icon name="circle-info" /> {notice}
          </div>
        )}

        {draft.headline && <div className="font-semibold t1">{draft.headline}</div>}
        {draft.location && <div className="text-xs t3">{draft.location}</div>}
        {draft.summary && <div className="t2" style={{ whiteSpace:'pre-wrap' }}>{draft.summary}</div>}

        {draft.positions?.length > 0 && (
          <div>
            <div className="text-xs font-semibold t3 mb-1" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>Experience</div>
            {draft.positions.map((p, i) => (
              <div key={i} className="py-1.5" style={i ? { borderTop:'1px solid var(--line)' } : undefined}>
                <div className="t1 font-semibold">{p.title || '—'}</div>
                <div className="text-xs t3">{[p.company, p.location, yearsLabel(p.startYear, p.endYear, p.current)].filter(Boolean).join(' · ')}</div>
                {p.summary && <div className="text-xs t2 mt-1" style={{ whiteSpace:'pre-wrap' }}>{p.summary}</div>}
              </div>
            ))}
          </div>
        )}

        {draft.education?.length > 0 && (
          <div>
            <div className="text-xs font-semibold t3 mb-1" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>Education</div>
            {draft.education.map((e, i) => (
              <div key={i} className="py-1">
                <div className="t1">{e.school}</div>
                <div className="text-xs t3">{[e.qualification, e.field, yearsLabel(e.startYear, e.endYear)].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        )}

        {draft.skills?.length > 0 && (
          <div>
            <div className="text-xs font-semibold t3 mb-1" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>Skills</div>
            <div className="flex flex-wrap gap-1">
              {draft.skills.map((s) => <Pill key={s} tone="blue">{s}</Pill>)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* The paste path. Not a lesser fallback — on most days it is the one that returns data,
   because the fetch is walled far more often than it succeeds. */
function PasteResumeModal({ uid, onClose, onParsed }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await parseResumeText({ uid, text });
      onParsed(r);
      onClose();
    } catch (e) {
      setErr(e.message || 'Could not read that.');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      title="Paste the profile or CV"
      subtitle="Their LinkedIn profile text, or the contents of their CV"
      icon="paste"
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn icon="wand-magic-sparkles" onClick={go} disabled={busy || text.trim().length < 60}>
            {busy ? 'Reading…' : 'Extract'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="text-xs t3">
          Ask them to open their profile, select the page and paste it here — or paste their CV.
          Nothing is saved until you have read what comes back.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste the profile or CV text…"
          style={{ width:'100%', padding:'10px', border:'1px solid var(--line)', borderRadius:8,
            background:'var(--bg)', color:'var(--t1)', fontFamily:'inherit', fontSize:'.875rem', resize:'vertical' }}
        />
        {err && <div className="text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

function ResumeCard({ rec, canEdit, onChanged }) {
  const [url, setUrl] = useState(rec.linkedinUrl || '');
  const [editingUrl, setEditingUrl] = useState(false);
  const [busy, setBusy] = useState(null);      // 'url' | 'import' | 'save'
  const [msg, setMsg] = useState(null);        // { ok, text, advice }
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState(null);    // { draft, source, notice }

  const resume = rec.resume;

  const saveUrl = async () => {
    setBusy('url'); setMsg(null);
    try {
      await setLinkedIn({ uid: rec.uid, linkedinUrl: url });
      setEditingUrl(false);
      onChanged();
    } catch (e) {
      setMsg({ ok:false, text: e.message || 'Could not save that link.' });
    } finally { setBusy(null); }
  };

  const importFromLinkedIn = async () => {
    setBusy('import'); setMsg(null);
    try {
      const r = await importLinkedInResume({ uid: rec.uid });
      if (r.ok) { setDraft(r); return; }
      // A wall is an expected answer with a next step, so it is reported as guidance
      // rather than as a failure — and the paste path is offered in the same breath.
      setMsg({ ok:false, text: r.detail || 'LinkedIn did not return the profile.', advice: r.advice, offerPaste: r.canPasteInstead });
    } catch (e) {
      setMsg({ ok:false, text: e.message || 'Could not import that profile.' });
    } finally { setBusy(null); }
  };

  const saveDraft = async () => {
    setBusy('save');
    try {
      await saveResume({ uid: rec.uid, resume: draft.draft, source: draft.source });
      setDraft(null);
      setMsg({ ok:true, text:'Resume saved.' });
      onChanged();
    } catch (e) {
      setMsg({ ok:false, text: e.message || 'Could not save that resume.' });
    } finally { setBusy(null); }
  };

  const field = { flex:1, minWidth:220, padding:'6px 10px', border:'1px solid var(--line)', borderRadius:8, background:'var(--bg)', color:'var(--t1)' };

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-bold t1"><Icon name="linkedin" brand /> Profile &amp; resume</h3>
        {resume?.completeness && (
          <Pill tone={resume.completeness.percent >= 80 ? 'ok' : 'amber'}>{resume.completeness.percent}% complete</Pill>
        )}
      </div>

      {/* The link */}
      {editingUrl ? (
        <div className="flex items-center gap-2 flex-wrap">
          <input style={field} value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="linkedin.com/in/their-name" />
          <Btn size="sm" icon="check" onClick={saveUrl} disabled={busy === 'url'}>Save</Btn>
          <Btn kind="ghost" size="sm" onClick={() => { setUrl(rec.linkedinUrl || ''); setEditingUrl(false); }}>Cancel</Btn>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {rec.linkedinUrl
            ? <a href={rec.linkedinUrl} target="_blank" rel="noreferrer noopener" style={{ color:'var(--pri)' }}>{rec.linkedinUrl}</a>
            : <span className="t3">No LinkedIn profile on file.</span>}
          {canEdit && <Btn kind="ghost" size="sm" icon="pen" onClick={() => setEditingUrl(true)}>{rec.linkedinUrl ? 'Change' : 'Add'}</Btn>}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <Btn kind="ghost" size="sm" icon="cloud-arrow-down" onClick={importFromLinkedIn}
            disabled={!rec.linkedinUrl || busy === 'import'}>
            {busy === 'import' ? 'Fetching…' : 'Fetch from LinkedIn'}
          </Btn>
          <Btn kind="ghost" size="sm" icon="paste" onClick={() => setPasting(true)}>Paste profile or CV</Btn>
        </div>
      )}

      {msg && (
        <div className="text-sm p-3 rounded-lg" style={{ background:'var(--surface2)', color: msg.ok ? 'var(--t2)' : 'var(--red)' }}>
          <Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} /> {msg.text}
          {msg.advice && <div className="text-xs t3 mt-1">{msg.advice}</div>}
          {msg.offerPaste && (
            <div className="mt-2">
              <Btn size="sm" icon="paste" onClick={() => { setMsg(null); setPasting(true); }}>Paste it instead</Btn>
            </div>
          )}
        </div>
      )}

      {/* The saved resume */}
      {resume ? (
        <div className="space-y-3 text-sm" style={{ borderTop:'1px solid var(--line)', paddingTop:12 }}>
          {resume.headline && <div className="font-semibold t1">{resume.headline}</div>}
          {resume.summary && <div className="t2" style={{ whiteSpace:'pre-wrap' }}>{resume.summary}</div>}

          {resume.positions?.length > 0 && (
            <div>
              <div className="text-xs font-semibold t3 mb-1" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>Experience</div>
              {resume.positions.map((p, i) => (
                <div key={i} className="py-1.5" style={i ? { borderTop:'1px solid var(--line)' } : undefined}>
                  <div className="t1 font-semibold">{p.title || '—'}</div>
                  <div className="text-xs t3">{[p.company, yearsLabel(p.startYear, p.endYear, p.current)].filter(Boolean).join(' · ')}</div>
                  {p.summary && <div className="text-xs t2 mt-1" style={{ whiteSpace:'pre-wrap' }}>{p.summary}</div>}
                </div>
              ))}
            </div>
          )}

          {resume.education?.length > 0 && (
            <div>
              <div className="text-xs font-semibold t3 mb-1" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>Education</div>
              {resume.education.map((e, i) => (
                <div key={i} className="py-1">
                  <div className="t1">{e.school}</div>
                  <div className="text-xs t3">{[e.qualification, e.field, yearsLabel(e.startYear, e.endYear)].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </div>
          )}

          {resume.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((s) => <Pill key={s} tone="blue">{s}</Pill>)}
            </div>
          )}

          {/* Who vouched for it, not who extracted it — that is the question that
              matters later, and an unattributed resume is just a claim. */}
          <div className="text-xs t3" style={{ borderTop:'1px solid var(--line)', paddingTop:8 }}>
            {resume.source === 'linkedin' ? 'Imported from LinkedIn' : resume.source === 'text' ? 'Extracted from supplied text' : 'Entered by hand'}
            {resume.confirmedAt ? ` · confirmed ${fmtDate(resume.confirmedAt)}` : ''}
            {resume.confirmedByEmail ? ` by ${resume.confirmedByEmail}` : ''}
            {resume.completeness?.missing?.length
              ? ` · still missing: ${resume.completeness.missing.join(', ')}`
              : ''}
          </div>
        </div>
      ) : (
        <div className="text-xs t3">
          No resume on file.
          {canEdit ? ' Fetch it from their LinkedIn profile, or paste their CV.' : ''}
        </div>
      )}

      {pasting && (
        <PasteResumeModal uid={rec.uid} onClose={() => setPasting(false)} onParsed={setDraft} />
      )}
      {draft && (
        <ResumeDraftModal
          draft={draft.draft}
          source={draft.source}
          notice={draft.notice}
          busy={busy === 'save'}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </Card>
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
  const { isAdmin, tier, departments = [], user } = useStaffClaims();
  const isPeople = isAdmin || (tier === 'lead' && departments.includes('people'));
  // Your own resume is yours to maintain — the server says the same, so this only
  // decides whether the buttons are drawn.
  const isSelf = !!user && user.uid === uid;

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

      {/* Profile & resume */}
      <ResumeCard rec={rec} canEdit={isPeople || isSelf} onChanged={load} />

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
