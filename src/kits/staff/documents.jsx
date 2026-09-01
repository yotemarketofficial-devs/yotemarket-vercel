/* documents.jsx — a person's file. CONFIDENTIAL · internal.
 *
 * The compliance register knew what each employee must hold and reported what was
 * outstanding, but there was nowhere to put the actual document. This is that place.
 *
 * NOTHING HERE TOUCHES STORAGE DIRECTLY. Every other upload in the platform goes
 * browser → Storage → keep the download URL; that URL carries a token which bypasses
 * Storage rules, so a police clearance behind one is readable by anyone who ever sees the
 * link. These bytes travel through a callable in both directions, and only the storage
 * path is kept. The 5 MB ceiling is the price of that and is stated up front rather than
 * discovered at 90% of an upload.
 *
 * ATTACHING IS NOT VERIFYING. Anyone may attach their own certificate; only People may
 * tick "verified". If filing a document marked itself verified, the register would go
 * green on the word of the person it is about, which is the one thing it exists to stop.
 */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, EmptyState } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  fetchEmployeeCompliance, setEmployeeDocument, uploadHrFile, openHrFile,
  HR_FILE_ACCEPT, useStaffClaims,
} from './service.js';

const { useState, useEffect, useCallback, useRef } = React;

const TONE = { valid: 'ok', expiring: 'amber', expired: 'red', missing: 'amber' };
const LABEL = { valid: 'In order', expiring: 'Expiring', expired: 'Expired', missing: 'Not on file' };

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-KE',
  { day: 'numeric', month: 'short', year: 'numeric' }) : null);

/* ── One document row ────────────────────────────────────────────────────── */
function DocumentRow({ uid, doc, canVerify, onChanged }) {
  const { toast, confirm } = useDialogs();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState('');

  const attach = async (file) => {
    if (!file) return;
    setBusy('upload');
    try {
      await uploadHrFile({ scope: 'employee', subjectId: uid, key: doc.key, file });
      toast({ tone: 'ok', title: `${doc.label} attached` });
      onChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not attach', body: e?.message || 'Try again.' });
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';   // let the same file be re-picked
    }
  };

  const view = async () => {
    setBusy('view');
    try { await openHrFile({ scope: 'employee', subjectId: uid, key: doc.key }); }
    catch (e) { toast({ tone: 'error', title: 'Could not open', body: e?.message || 'Try again.' }); }
    finally { setBusy(''); }
  };

  const verify = async () => {
    const next = !doc.verified;
    if (next && !doc.hasFile && !doc.reference) {
      const ok = await confirm({
        title: 'Mark this verified with nothing attached?',
        body: 'There is no file and no reference on this document. Verifying it now records '
            + 'that you have seen it somewhere else.',
        confirmLabel: 'Mark verified',
      });
      if (!ok) return;
    }
    setBusy('verify');
    try {
      await setEmployeeDocument({ uid, key: doc.key, held: next });
      onChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not change', body: e?.message || 'Try again.' });
    } finally { setBusy(''); }
  };

  const attached = Boolean(doc.hasFile);

  return (
    <div className="py-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold t1">{doc.label}</span>
            {doc.required
              ? <Pill tone={TONE[doc.status] || 'amber'}>{LABEL[doc.status] || doc.status}</Pill>
              : <span className="text-xs t3">optional</span>}
            {/* Held is what People confirmed; the file is separate and may arrive first. */}
            {attached && !doc.verified && <Pill tone="blue">Attached, unverified</Pill>}
          </div>
          <div className="text-xs t3 mt-0.5">{doc.note}</div>
          <div className="text-xs t3 mt-1">
            {doc.reference ? <>Ref {doc.reference} · </> : null}
            {doc.expiresOn ? <>Expires {fmtDate(doc.expiresOn)}</>
              : doc.expires ? <span style={{ color: 'var(--amber)' }}>No expiry recorded</span>
                : 'Does not expire'}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {attached && (
            <Btn kind="soft" size="sm" icon={busy === 'view' ? 'spinner' : 'eye'}
              disabled={!!busy} onClick={view}>View</Btn>
          )}
          <input ref={fileRef} type="file" accept={HR_FILE_ACCEPT} style={{ display: 'none' }}
            onChange={(e) => attach(e.target.files && e.target.files[0])} />
          <Btn kind={attached ? 'ghost' : 'primary'} size="sm"
            icon={busy === 'upload' ? 'spinner' : 'file-arrow-up'} disabled={!!busy}
            onClick={() => fileRef.current && fileRef.current.click()}>
            {attached ? 'Replace' : 'Attach'}
          </Btn>
          {canVerify && (
            <Btn kind={doc.verified ? 'soft' : 'ghost'} size="sm"
              icon={busy === 'verify' ? 'spinner' : (doc.verified ? 'circle-check' : 'check')}
              disabled={!!busy} onClick={verify}
              title={doc.verified ? 'Recorded as verified — click to undo' : 'Confirm you have seen this document'}>
              {doc.verified ? 'Verified' : 'Verify'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── The panel ───────────────────────────────────────────────────────────── */
export function DocumentsPanel({ uid, selfView = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const { isAdmin, departments, tier } = useStaffClaims();
  // Mirrors the backend gate exactly: People lead or admin. Anything looser here would
  // just render a button the callable refuses.
  const canVerify = Boolean(isAdmin || (tier === 'lead' && (departments || []).includes('people')));

  const load = useCallback(() => {
    let alive = true;
    setErr(null);
    fetchEmployeeCompliance(uid)
      .then((d) => { if (alive) setData(d.compliance || d); })
      .catch((e) => { if (alive) setErr(e?.message || 'Could not load this file.'); });
    return () => { alive = false; };
  }, [uid]);

  useEffect(load, [load]);

  if (err && /permission|denied/i.test(err)) {
    return (
      <Card className="p-6">
        <EmptyState icon="lock" title="Employee files are a People workspace."
          sub="Your departments do not include it." />
      </Card>
    );
  }
  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}>{err}</Card>;
  if (!data) return <Card className="p-6 t3 text-sm">Loading documents…</Card>;

  const docs = data.documents || [];
  const outstanding = data.outstanding || 0;

  return (
    <Card className="p-5">
      <SectionHead icon="folder-open"
        title={selfView ? 'My documents' : 'Documents'}
        sub={outstanding
          ? `${outstanding} required document${outstanding === 1 ? '' : 's'} still outstanding`
          : 'Everything required is on file'} />

      <div className="text-xs t3 rounded p-2.5 mb-1" style={{ background: 'var(--surface2)' }}>
        <Icon name="lock" /> These are held privately — they are never given a public link,
        and every time one is opened it is recorded. PDF or photo, up to 5 MB.
        {!canVerify && ' You can attach your own documents; somebody in People confirms them.'}
      </div>

      {docs.length ? docs.map((doc) => (
        <DocumentRow key={doc.key} uid={uid} doc={doc} canVerify={canVerify} onChanged={load} />
      )) : <EmptyState icon="folder-open" title="No documents are required for this person yet." />}
    </Card>
  );
}

export default DocumentsPanel;
