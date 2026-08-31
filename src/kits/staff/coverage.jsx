/* coverage.jsx — where our MERCHANTS are. CONFIDENTIAL · internal.

   The merchant list answers "who has signed up". This answers "where are we", which is a
   different question and the one that decides where to recruit next.

   WHY MERCHANT GEOGRAPHY IS MESSIER THAN A MARKETER'S. A scout picks their county from a
   list. A store never did: every one signed up through a single free-text "Area /
   location" box, so `area` holds "Nairobi", "Westlands" and "Nairobi CBD" side by side —
   three different levels in one field. The backend was returning that box AS the county,
   which is how "Nairobi CBD" came to be shown to staff as one of the 47.

   So a store's county is now DERIVED where it was never stated, by reading the box:
   a part is a county only if it resolves to one outright. "Westlands" yields a town and
   no county rather than a guess at which county Westlands is in. A trailing county name
   is read ("Westlands Nairobi"), a leading one is not — because "Mombasa Road" is in
   NAIROBI, and matching the front of the string would file that merchant 500 km away and
   look confident doing it. */
import React from 'react';
import { Card, Btn, Pill, Icon, Stat, Modal, EmptyState } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  fetchMerchantCoverage, setStoreGeography, backfillStoreGeography,
  KE_COUNTY_NAMES, useStaffClaims,
} from './service.js';

const { useState, useEffect, useCallback } = React;

/* ── Correcting one store ─────────────────────────────────────────────────────
   Staff get this because a wrong county is usually spotted while looking at the map,
   not by the merchant. The merchant's own edit writes the same fields. */
export function StoreGeoModal({ store, onClose, onSaved }) {
  const { toast } = useDialogs();
  const [county, setCounty] = useState(store.county || '');
  const [subCounty, setSubCounty] = useState(store.subCounty || '');
  const [town, setTown] = useState(store.town || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const r = await setStoreGeography({ storeId: store.id, county, subCounty, town });
      toast({ tone: 'ok', title: 'Location saved', body: r?.geo?.county || 'County cleared' });
      onSaved?.(r?.geo || { county, subCounty, town });
      onClose();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not save', body: e?.message || 'Try again.' });
    } finally { setBusy(false); }
  };

  return (
    <Modal title={`Location — ${store.shop || store.name || 'Store'}`} icon="map-location-dot"
      onClose={onClose} maxWidth={480}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy}>Save location</Btn>
      </>}>
      <div className="space-y-4">
        {store.area && (
          <div className="text-xs t3 rounded p-2.5" style={{ background: 'var(--surface2)' }}>
            Signed up with <span className="font-semibold t2">“{store.area}”</span> in the single
            area box. Anything below that is blank was read out of it.
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-semibold t2 mb-1">County</span>
          <select className="ym-input w-full" value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="">— not set —</option>
            {KE_COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="block text-xs t3 mt-1">
            A closed list: the 47 are fixed, so anything outside them is a typo rather than a place.
          </span>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold t2 mb-1">Sub-county <span className="t3 font-normal">(optional)</span></span>
          <input className="ym-input w-full" value={subCounty} onChange={(e) => setSubCounty(e.target.value)}
            placeholder="e.g. Westlands" />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold t2 mb-1">Town, city or village <span className="t3 font-normal">(optional)</span></span>
          <input className="ym-input w-full" value={town} onChange={(e) => setTown(e.target.value)}
            placeholder="e.g. Parklands" />
          <span className="block text-xs t3 mt-1">
            Free text on purpose — there is no complete list of Kenyan sub-counties or villages,
            and validating against one would reject real answers.
          </span>
        </label>
      </div>
    </Modal>
  );
}

/* ── Re-reading every store's location ────────────────────────────────────────
   NOT the first-time fill — stores are stamped with their location automatically the
   first time this console lists them. This is the RE-READ: it derives every store again
   and shows where the stored answer and a fresh reading disagree, which is what you want
   after the parsing rules change or when a county looks wrong on the map.

   A dry run first, always, because unlike the automatic pass this one overwrites. */
function Backfill({ onDone }) {
  const { confirm, toast } = useDialogs();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (commit) => {
    setBusy(true);
    try {
      const r = await backfillStoreGeography(commit);
      if (commit) {
        toast({ tone: 'ok', title: `Updated ${r.wouldWrite} store${r.wouldWrite === 1 ? '' : 's'}` });
        setPreview(null);
        onDone?.();
      } else {
        setPreview(r);
      }
    } catch (e) {
      toast({ tone: 'error', title: 'Backfill failed', body: e?.message || 'Try again.' });
    } finally { setBusy(false); }
  };

  const commit = async () => {
    const ok = await confirm({
      title: `Update ${preview.wouldWrite} store location${preview.wouldWrite === 1 ? '' : 's'}?`,
      body: 'This overwrites the stored location with a fresh reading. Stores whose location '
          + 'a person set by hand keep it — only their name and status fields are corrected.',
      confirmLabel: 'Apply the re-read',
    });
    if (ok) run(true);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-bold t1"><Icon name="rotate" /> Re-read every store's location</h3>
        <Btn kind="ghost" size="sm" icon={busy && !preview ? 'spinner' : 'eye'} onClick={() => run(false)} disabled={busy}>Preview</Btn>
      </div>
      <p className="text-xs t3">
        Stores are stamped with a location automatically the first time this console lists them,
        so this is not the first fill. It derives every store again and shows where the stored
        answer disagrees with a fresh reading — useful after the parsing rules change. It never
        guesses: “Westlands” stays a town with no county, and a location somebody set by hand
        is left alone.
      </p>

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Would change" value={preview.wouldWrite} icon="pen" tone="pri" />
            <Stat label="Already correct" value={preview.unchanged} icon="circle-check" tone="green" />
            <Stat label="Set by a person" value={preview.humanSet} icon="user-pen" tone="blue"
              sub="left alone" />
            <Stat label="Stores read" value={preview.scanned} icon="store" tone="amber" />
          </div>

          {!!preview.sample?.length && (
            <div className="text-xs t3 space-y-1 max-h-48 overflow-y-auto">
              {preview.sample.map((s) => (
                <div key={s.id} className="flex gap-2 py-1" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="flex-1 truncate t2">{s.name}</span>
                  <span className="truncate" style={{ maxWidth: 140 }}>
                    {[s.from?.county, s.from?.town].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <Icon name="arrow-right" />
                  <span className="font-semibold t2 truncate" style={{ maxWidth: 170 }}>
                    {[s.to?.county, s.to?.town].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              ))}
              {preview.wouldWrite > preview.sample.length && (
                <div className="pt-1">…and {preview.wouldWrite - preview.sample.length} more.</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'pen'} onClick={commit} disabled={busy || !preview.wouldWrite}>
              Update {preview.wouldWrite} store{preview.wouldWrite === 1 ? '' : 's'}
            </Btn>
            <span className="text-xs t3">
              {preview.wouldWrite ? 'Review the list above before applying.' : 'Every store already matches a fresh reading.'}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Merchant coverage ────────────────────────────────────────────────────── */
export function MerchantCoverage() {
  const [level, setLevel] = useState('county');
  // Below county the levels are open sets — there is no list of every Kenyan sub-county to
  // count against — so drilling in needs a county, which also bounds the read to it.
  const [within, setWithin] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const { isAdmin } = useStaffClaims();

  const load = useCallback(() => {
    let alive = true;
    setErr(null);
    fetchMerchantCoverage(level, within)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e?.message || 'Could not load coverage.'); });
    return () => { alive = false; };
  }, [level, within]);

  useEffect(load, [load]);

  // A growth-department staffer can open this tab but the backend scopes merchant data to
  // marketplace. Saying so is better than showing them a raw permission error.
  if (err && /permission|denied/i.test(err)) {
    return (
      <Card className="p-6">
        <EmptyState icon="lock" title="Merchant coverage is a Marketplace workspace."
          sub="Your departments do not include it. Scout coverage on the other tab is unaffected." />
      </Card>
    );
  }
  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}>{err}</Card>;
  if (!data) return <Card className="p-6 t3 text-sm">Loading coverage…</Card>;

  const t = data.totals || {};
  const gaps = data.gaps || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Trading merchants" value={t.merchants || 0} icon="store" tone="pri"
          sub={within ? `in ${within}` : null} />
        <Stat label="Counties reached" value={47 - (data.uncovered?.length || 0)} icon="map" tone="green" sub="of 47" />
        <Stat label="No location set" value={t.unassigned || 0} icon="circle-question" tone="amber" />
        <Stat label="Suspended" value={t.suspended || 0} icon="ban" tone="blue" sub="not counted as coverage" />
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {[['county', 'County'], ['subCounty', 'Sub-county'], ['town', 'Town / village']].map(([k, label]) => (
          <Btn key={k} kind={level === k ? 'primary' : 'ghost'} size="sm" onClick={() => setLevel(k)}>{label}</Btn>
        ))}
        {level !== 'county' && (
          <select className="ym-input" style={{ minWidth: 170 }} value={within}
            onChange={(e) => setWithin(e.target.value)}>
            <option value="">Pick a county to drill into…</option>
            {KE_COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {within && <Btn kind="ghost" size="sm" icon="xmark" onClick={() => { setWithin(''); setLevel('county'); }}>Clear</Btn>}
      </div>

      {level !== 'county' && !within && (
        <Card className="p-5 text-sm t3">
          Pick a county above. Sub-counties and villages are open lists — there is no complete
          register of them to count against — so this level is read within one county rather
          than guessed at across all 47.
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-bold t1 mb-2">Where our merchants are{within ? ` — ${within}` : ''}</h3>
        {data.rollup?.length ? (
          <div className="space-y-1">
            {data.rollup.map((r) => (
              <div key={r.label} className="py-2" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-1 font-semibold t1">
                    {r.label}
                    {r.label === 'Unassigned' && <span className="t3 font-normal"> — no location on the store</span>}
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
        ) : <div className="text-sm t3">No trading merchants with a location yet.</div>}
      </Card>

      {/* The cross-tab neither list answers alone. Both sides are an action; a coverage
          count on its own is only a number. Only meaningful at county level, which is the
          level a scout's territory is set at. */}
      {level === 'county' && <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h3 className="font-bold t1"><Icon name="user-plus" /> Merchants, no scout</h3>
            <Pill tone={gaps.merchantsNoScout?.length ? 'amber' : 'ok'}>{gaps.merchantsNoScout?.length || 0}</Pill>
          </div>
          <p className="text-xs t3 mb-2">Selling here already, with nobody recruiting the next one.</p>
          <div className="flex flex-wrap gap-1.5">
            {(gaps.merchantsNoScout || []).map((c) => (
              <span key={c} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface2)', color: 'var(--t2)' }}>{c}</span>
            ))}
            {!gaps.merchantsNoScout?.length && <span className="text-xs t3">Every county with a merchant has a scout.</span>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h3 className="font-bold t1"><Icon name="user-clock" /> Scout, no merchants</h3>
            <Pill tone={gaps.scoutNoMerchants?.length ? 'blue' : 'ok'}>{gaps.scoutNoMerchants?.length || 0}</Pill>
          </div>
          <p className="text-xs t3 mb-2">Someone assigned there who has not landed a store yet — new, or stuck.</p>
          <div className="flex flex-wrap gap-1.5">
            {(gaps.scoutNoMerchants || []).map((c) => (
              <span key={c} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface2)', color: 'var(--t2)' }}>{c}</span>
            ))}
            {!gaps.scoutNoMerchants?.length && <span className="text-xs t3">Every scout's county has at least one merchant.</span>}
          </div>
        </Card>
      </div>}

      {level === 'county' && <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-bold t1"><Icon name="map-pin" /> Counties with no merchant</h3>
          <Pill tone={data.uncovered?.length ? 'amber' : 'ok'}>{data.uncovered?.length || 0} of 47</Pill>
        </div>
        <p className="text-xs t3 mb-2">
          Suspended stores are not counted — nothing there is for sale, so counting them would
          report a county as served when a shopper finds nothing.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(data.uncovered || []).map((c) => (
            <span key={c} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface2)', color: 'var(--t2)' }}>{c}</span>
          ))}
        </div>
      </Card>}

      {isAdmin && <Backfill onDone={load} />}
    </div>
  );
}

export default MerchantCoverage;
