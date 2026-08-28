/* marketer.jsx — one marketer, and what to do about them. CONFIDENTIAL · internal.

   The scouts table answers "who are our marketers". This page answers "should I act on
   this one", which needs the things a table cannot hold: every merchant they actually
   brought in and where those are, what they have earned and been paid, and whether they
   are working the patch they were given.

   TERRITORY IS THE SPINE. County is canonical (the 47 are fixed), sub-county and town are
   normalised but open — no complete list of Kenyan sub-counties or villages exists, and
   validating against one would reject real answers. So the county field refuses what it
   cannot resolve, and the two below it accept what they are told. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Avatar, Stat, Modal, DataTable, EmptyState, kes } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  fetchMarketerDetail, setMarketerTerritory, fetchMarketerCoverage,
  KE_COUNTY_NAMES, useStaffClaims, useStaffResource, fetchMarketers,
} from './service.js';

const { useState, useEffect, useCallback } = React;

const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—');
const STATUS_TONE = { active:'ok', applicant:'amber', rejected:'red' };

/* ── Territory ────────────────────────────────────────────────────────────── */
function TerritoryModal({ marketer, onClose, onSaved }) {
  const t = marketer.territory || {};
  const [f, setF] = useState({ county: t.county || '', subCounty: t.subCounty || '', town: t.town || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try { await setMarketerTerritory({ uid: marketer.uid, ...f }); onSaved(); }
    catch (e) { setErr(e.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal title={`Territory — ${marketer.name}`} icon="map-location-dot" onClose={onClose} maxWidth={480}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy || !f.county}>Save</Btn>
      </>}>
      <div className="space-y-3">
        {/* A picker, not a text box. County is the one level with a right answer, and
            typing it free-hand is exactly how one place became four spellings. */}
        <label className="block text-xs font-semibold t3">
          County
          <select value={f.county} onChange={(e) => set('county', e.target.value)}
            className="ym-input mt-1" style={{ width:'100%' }}>
            <option value="">Choose a county…</option>
            {KE_COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold t3">
          Sub-county
          <input value={f.subCounty} onChange={(e) => set('subCounty', e.target.value)}
            placeholder="e.g. Westlands" className="ym-input mt-1" style={{ width:'100%' }} />
        </label>
        <label className="block text-xs font-semibold t3">
          Town, city or village
          <input value={f.town} onChange={(e) => set('town', e.target.value)}
            placeholder="e.g. Parklands" className="ym-input mt-1" style={{ width:'100%' }} />
          <span className="block text-[11px] t3 mt-1 font-normal">
            Tidied so two spellings of one place group together. Anything is accepted — there is no
            official list of every Kenyan village.
          </span>
        </label>
        {err && <div className="text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

/* ── One marketer ─────────────────────────────────────────────────────────── */
export function MarketerRecord({ uid, onBack }) {
  const [m, setM] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { isAdmin, tier, departments = [] } = useStaffClaims();
  const canEdit = isAdmin || (tier === 'lead' && departments.includes('growth'));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetchMarketerDetail(uid); setM(r.marketer); setErr(null); }
    catch (e) { setErr(e.message || 'Could not open that record.'); }
    finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Card className="p-6 t3 text-sm">Loading marketer…</Card>;
  if (err) return <Card className="p-6 text-sm" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>;
  if (!m) return null;

  const t = m.territory || {};
  const cov = m.coverage || {};
  const territoryLabel = [t.town, t.subCounty, t.county].filter(Boolean).join(', ') || 'Not set';

  return (
    <div className="fadeup space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {onBack && <Btn kind="ghost" size="sm" icon="arrow-left" onClick={onBack}>Marketers</Btn>}
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={m.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold t1">{m.name}</h2>
              <Pill tone={STATUS_TONE[m.status] || 'blue'}>{m.status}</Pill>
              {m.code && <Pill tone="blue">{m.code}</Pill>}
            </div>
            <div className="text-sm t3 mt-1">
              <Icon name="map-location-dot" /> {territoryLabel}
              {t.code ? <span className="t3"> · county {t.code}</span> : null}
            </div>
            <div className="text-xs t3 mt-1">
              {m.email}{m.phone ? ` · ${m.phone}` : ''}{m.joined ? ` · joined ${fmtDate(m.joined)}` : ''}
            </div>
          </div>
          {canEdit && <Btn kind="ghost" size="sm" icon="map-location-dot" onClick={() => setEditing(true)}>Set territory</Btn>}
        </div>

        {/* Two different problems, said differently: nobody filled it in, versus somebody
            typed something that is not a county. */}
        {t.unresolvedCounty && (
          <div className="text-sm mt-3" style={{ color:'var(--red)' }}>
            <Icon name="triangle-exclamation" /> Their county does not match any of the 47 — set it properly
            so they appear in coverage.
          </div>
        )}
        {!t.county && !t.unresolvedCounty && (
          <div className="text-sm mt-3" style={{ color:'var(--amber)' }}>
            <Icon name="circle-info" /> No territory set, so this marketer counts as unassigned everywhere.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Merchants referred" value={cov.referred || 0} icon="store" tone="pri" />
        <Stat label="Verified" value={cov.verified || 0} icon="circle-check" tone="green"
          sub={cov.referred ? `${Math.round((cov.verified / cov.referred) * 100)}% of referrals` : undefined} />
        <Stat label="In their county" value={cov.inTerritory || 0} icon="map-pin" tone="blue"
          sub={cov.outsideTerritory ? `${cov.outsideTerritory} elsewhere` : 'all in patch'} />
        <Stat label="Withdrawn" value={kes(m.earnings?.withdrawn || 0)} icon="money-bill" tone="amber" />
      </div>

      {/* Counted, not judged. A scout legitimately signs one up outside their patch; a
          scout whose merchants are ALL elsewhere is a territory to revisit, not a rule
          that was broken. */}
      {cov.referred > 0 && cov.inTerritory === 0 && t.county && (
        <Card className="p-4 text-sm" style={{ borderColor:'var(--amber)' }}>
          <Icon name="circle-info" /> None of their {cov.referred} merchants are in {t.county}.
          Worth asking where they are actually working before chasing the numbers.
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-bold t1 mb-1"><Icon name="map"/> Where their merchants are</h3>
        {(cov.bySubCounty || []).length ? (
          <div className="space-y-1 mt-2">
            {cov.bySubCounty.map((r) => (
              <div key={r.label} className="flex items-center gap-3 text-sm py-1.5" style={{ borderTop:'1px solid var(--line)' }}>
                <span className="flex-1 t1">{r.label}</span>
                <span className="t3 text-xs">{r.count} merchant{r.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-sm t3">No merchants referred yet.</div>}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold t1 mb-2"><Icon name="store"/> Merchants they brought in</h3>
        {m.merchants?.length ? (
          <DataTable minWidth={620} keyField="id" rows={m.merchants} pageSize={12}
            columns={[
              { key:'name', header:'Store', sort:true, render:(r) => <span className="font-semibold t1">{r.name}</span> },
              { key:'verified', header:'State', render:(r) => (
                r.verified ? <Pill tone="ok">Verified</Pill> : <Pill tone="amber">Unverified</Pill>) },
              { key:'county', header:'Where', render:(r) => (
                <span className="text-xs t3">{[r.town, r.subCounty, r.county].filter(Boolean).join(', ') || '—'}</span>) },
              { key:'joined', header:'Joined', sortValue:(r) => r.joined || 0, render:(r) => <span className="text-xs t3">{fmtDate(r.joined)}</span> },
            ]} />
        ) : <EmptyState icon="store" title="No merchants yet." sub="Nothing has been referred with their code." />}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold t1 mb-2"><Icon name="money-bill-transfer"/> Payouts</h3>
        {m.payouts?.length ? (
          <div className="space-y-1">
            {m.payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-sm py-1.5" style={{ borderTop:'1px solid var(--line)' }}>
                <span className="flex-1 t1">{kes(p.amount)}</span>
                <Pill tone={p.status === 'paid' ? 'ok' : p.status === 'rejected' ? 'red' : 'amber'}>{p.status}</Pill>
                <span className="text-xs t3">{fmtDate(p.at)}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-sm t3">No payout requests.</div>}
      </Card>

      {editing && (
        <TerritoryModal marketer={m} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }} />
      )}
    </div>
  );
}

/* ── Coverage ─────────────────────────────────────────────────────────────── */
export function MarketerCoverage() {
  const [level, setLevel] = useState('county');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let live = true;
    fetchMarketerCoverage(level)
      .then((r) => { if (live) { setData(r); setErr(null); } })
      .catch((e) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [level]);

  if (err) return <Card className="p-6 text-sm" style={{ color:'var(--red)' }}>{err}</Card>;
  if (!data) return <Card className="p-6 t3 text-sm">Loading coverage…</Card>;

  const t = data.totals || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active scouts" value={t.scouts || 0} icon="people-group" tone="pri" />
        <Stat label="Counties covered" value={47 - (data.uncovered?.length || 0)} icon="map" tone="green" sub="of 47" />
        <Stat label="No territory set" value={t.unassigned || 0} icon="circle-question" tone="amber" />
        <Stat label="County unrecognised" value={t.unresolved || 0} icon="triangle-exclamation" tone="red" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['county','County'],['subCounty','Sub-county'],['town','Town / village']].map(([k, label]) => (
          <Btn key={k} kind={level === k ? 'primary' : 'ghost'} size="sm" onClick={() => setLevel(k)}>{label}</Btn>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-bold t1 mb-2">Where our scouts are</h3>
        {data.rollup?.length ? (
          <div className="space-y-1">
            {data.rollup.map((r) => (
              <div key={r.label} className="py-2" style={{ borderTop:'1px solid var(--line)' }}>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-1 font-semibold t1">
                    {r.label}
                    {r.label === 'Unassigned' && <span className="t3 font-normal"> — territory not set</span>}
                  </span>
                  <span className="t3 text-xs">{r.count}</span>
                </div>
                {!!r.children?.length && (
                  <div className="text-xs t3 mt-1">
                    {r.children.slice(0, 6).map((c) => `${c.label} (${c.count})`).join(' · ')}
                    {r.children.length > 6 ? ' …' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <div className="text-sm t3">No active scouts with a territory yet.</div>}
      </Card>

      {/* The hiring question, which a list of existing scouts can never answer. */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-bold t1"><Icon name="map-pin"/> Counties with nobody</h3>
          <Pill tone={data.uncovered?.length ? 'amber' : 'ok'}>{data.uncovered?.length || 0} of 47</Pill>
        </div>
        <p className="text-xs t3 mb-2">
          Counted from active scouts only — an applicant is not coverage, and counting them would hide
          the gap the hiring funnel exists to fill.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(data.uncovered || []).map((c) => (
            <span key={c} className="text-xs px-2 py-1 rounded" style={{ background:'var(--surface2)', color:'var(--t2)' }}>{c}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── The screen ───────────────────────────────────────────────────────────────
   Coverage and the roster in one place, because the two questions are asked together:
   "where are we thin" and then immediately "who is in that county". Kept separate from
   the existing Scouts screen, which is the payouts and hiring workspace — this one is
   about territory. */
export function Territories() {
  const [openUid, setOpenUid] = useState(null);
  const [q, setQ] = useState('');
  const { data } = useStaffResource(fetchMarketers, { applicants: [], scouts: [] });

  if (openUid) return <MarketerRecord uid={openUid} onBack={() => setOpenUid(null)} />;

  const scouts = (data?.scouts || []).filter((s) => {
    if (!q.trim()) return true;
    const hay = `${s.name} ${s.county || ''} ${s.code || ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="map-location-dot" title="Territories & coverage"
        sub="Where our marketers are, where nobody is, and what each one is actually working" />

      <MarketerCoverage />

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="font-bold t1">Marketers</h3>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, county or code…"
            className="ym-input" style={{ width:260 }} />
        </div>
        {scouts.length ? (
          <DataTable minWidth={620} keyField="id" rows={scouts} pageSize={15} onRowClick={(r) => setOpenUid(r.id)}
            columns={[
              { key:'name', header:'Marketer', sort:true, render:(r) => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.name} size={28} />
                  <span className="min-w-0">
                    <span className="block font-semibold t1 truncate">{r.name}</span>
                    {r.code && <span className="block text-xs t3">{r.code}</span>}
                  </span>
                </span>) },
              { key:'county', header:'County', sort:true, render:(r) => (
                r.county
                  ? <span className="text-sm t2">{r.county}</span>
                  : <Pill tone="amber">Not set</Pill>) },
              { key:'verified', header:'Verified', sort:true, render:(r) => <span className="num">{r.verified ?? 0}</span> },
              { key:'referred', header:'Referred', sort:true, render:(r) => <span className="num t3">{r.referred ?? 0}</span> },
            ]} />
        ) : <EmptyState icon="people-group" title="No marketers yet."
              sub="Activated scouts appear here with their territory." />}
      </Card>
    </div>
  );
}

export default MarketerRecord;
