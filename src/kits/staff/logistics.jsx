/* logistics.jsx — Staff console: the delivery engine, wired through.

   The engine has been live for a while — slot batching, corridor bundling,
   Valhalla road routing, the 3-leg chain of custody (store→rider→hub→shopper),
   badge/rating claim gating and per-run rider payouts. The console, though, only
   ever read `staffListRuns`, which flattened everything to in transit / delivered
   / delayed. Ops could not see a run FORMING, could not tell a run nobody had
   claimed from one already moving, could not see hub load or why a rider wasn't
   picking work up, and had no lever at all when a run stalled.

   This screen is the engine as it actually is:
     • Exceptions first — the only list ops has to work.
     • The run board across every real stage, with fill, weight, distance,
       routing source and payout.
     • Hub load and fleet availability by band.
     • A run drawer: chain of custody per order, optimized stop sequence, and the
       payout maths broken down the way the rider sees it.
   Recovery (release a stalled run back to the board / cancel it for re-batching)
   goes through staff-gated callables — Firestore rules deny direct `runs` writes,
   so this is the only path in. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Stat, Bar, Icon, kes, DataTable, Modal, EmptyState, BackendError } from './ui.jsx';
import {
  useStaffResource, fetchLogistics, fetchRunDetail, resolveRun, optimizeRuns,
  fetchRiderRoster, setRiderStatus,
} from './service.js';
import { useDialogs } from './dialogs.jsx';
const { useState, useEffect } = React;

const STAGE_TONE = { forming:'amber', open:'blue', accepted:'ok', completed:'ok', cancelled:'red' };
const STAGE_FILTERS = ['live', 'forming', 'open', 'accepted', 'completed'];
const STAGE_LABEL = { live:'Live', forming:'Forming', open:'Awaiting rider', accepted:'In progress', completed:'Completed' };
const EX_TONE = { unclaimed:'red', stalled:'red', under_filled:'amber', no_hub:'amber', routing_degraded:'blue' };
const EX_ICON = { unclaimed:'user-clock', stalled:'hourglass-half', under_filled:'layer-group', no_hub:'location-crosshairs', routing_degraded:'route' };
const EX_LABEL = { unclaimed:'Unclaimed', stalled:'Stalled', under_filled:'Under-filled', no_hub:'No collection point', routing_degraded:'Routing degraded' };

const age = (min) => (min == null ? '—' : min < 60 ? `${min}m` : min < 1440 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`);
const fmtWhen = (ms) => (ms ? new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—');

/* Demo shape — only ever rendered with no backend configured at all (see
   useStaffResource); a live console blanks rather than inventing runs. */
const LOGI_DEMO = {
  summary: { forming:2, open:3, accepted:4, completed:128, completedMonth:41, unclaimedOver30:1,
    ridersIdle:9, ridersActive:4, inflight:{ queued:5, accepted:6, picked_up:3, at_hub:7 }, uncollected:1,
    riderCostMonth:38400, costPerRun:937, avgFillPct:78, valhallaPct:96, exceptions:2 },
  runs: [
    { id:'r1', code:'RUN-9241A', status:'accepted', statusLabel:'In progress', band:'A', vehicle:'Motorbike', hubName:'Kisumu CBD Grocers', riderName:'Collins O.', drops:5, cap:5, fillPct:100, weightKg:41, weightCapKg:50, distanceKm:12.4, etaMin:38, payout:420, routingSource:'valhalla', ageMin:14, stale:false },
    { id:'r2', code:'RUN-9238B', status:'open', statusLabel:'Awaiting rider', band:'B', vehicle:'Van/Probox', hubName:'Nakuru Farm Fresh', riderName:null, drops:7, cap:10, fillPct:70, weightKg:63, weightCapKg:100, distanceKm:44.1, etaMin:71, payout:1350, routingSource:'valhalla', ageMin:52, stale:true },
    { id:'r3', code:'RUN-9236A', status:'forming', statusLabel:'Forming', band:'A', vehicle:'Motorbike', hubName:'Coast Spices Co.', riderName:null, drops:2, cap:5, fillPct:40, weightKg:12, weightCapKg:50, distanceKm:null, etaMin:null, payout:0, routingSource:null, ageMin:33, stale:false },
  ],
  hubs: [{ hubId:'h1', name:'Kisumu CBD Grocers', forming:1, open:1, accepted:2, completed:41, incoming:3, atHub:7, awaitingCollection:7 }],
  fleet: [{ band:'A', label:'Urban · Motorbike', active:3, idle:6, blocked:2 }, { band:'B', label:'Regional · Van', active:1, idle:3, blocked:1 }, { band:'C', label:'Long haul · Lorry', active:0, idle:0, blocked:0 }],
  exceptions: [{ kind:'unclaimed', runId:'r2', code:'RUN-9238B', band:'B', hubName:'Nakuru Farm Fresh', ageMin:52, detail:'No rider has claimed this run in 52 min' }],
};

export function Logistics(){
  // Ops needs freshness, but not 20s freshness on a four-collection scan — a run
  // that just went stale is still stale 30 seconds later.
  const { data, live, error, demo, reload } = useStaffResource(fetchLogistics, LOGI_DEMO, [], { pollMs: 30000 });
  const [stage, setStage] = useState('live');
  const [hub, setHub] = useState('all');
  const [open, setOpen] = useState(null);      // runId in the detail drawer
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const s = data.summary || {};
  const runs = data.runs || [];
  const hubs = data.hubs || [];
  const fleet = data.fleet || [];
  const exceptions = data.exceptions || [];
  const inflight = s.inflight || {};

  const shown = runs
    .filter((r) => (stage === 'live' ? ['forming','open','accepted'].includes(r.status) : r.status === stage))
    .filter((r) => hub === 'all' || r.hubId === hub);

  const optimize = async () => {
    setBusy(true); setMsg(null);
    try { const r = await optimizeRuns(hub === 'all' ? null : hub); setMsg({ ok:true, text:`Re-optimised ${r.updated} of ${r.runs} open run(s).` }); reload(); }
    catch (e) { setMsg({ ok:false, text: e.message || 'Optimise failed.' }); }
    finally { setBusy(false); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="truck-fast" title="Runs &amp; routes"
      sub={demo ? 'Sample operations — no backend configured' : (live ? 'Live batched-run operations across every band' : 'Loading live operations…')}
      action={<Btn kind="primary" size="md" icon={busy ? 'spinner' : 'route'} onClick={optimize} disabled={busy}>{busy ? 'Optimising…' : 'Re-optimise routes'}</Btn>} />
    <BackendError error={error} onRetry={reload} />
    {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

    {/* Exceptions before anything else — everything below is context for these. */}
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}><Icon name="triangle-exclamation" /></div>
          <div><div className="font-bold t1 leading-tight">Needs a human</div><div className="text-xs t3">Runs the engine can't resolve on its own</div></div>
        </div>
        {exceptions.length ? <Pill tone="amber">{exceptions.length}</Pill> : <Pill tone="ok">All clear</Pill>}
      </div>
      {exceptions.length === 0
        ? <EmptyState icon="circle-check" tone="green" title="Nothing stuck." sub="Every run is forming, claimed or delivered on schedule." />
        : exceptions.map((x, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`var(--${EX_TONE[x.kind] || 'blue'}-bg)`, color:`var(--${EX_TONE[x.kind] || 'blue'})` }}><Icon name={EX_ICON[x.kind] || 'circle-exclamation'} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold t1 text-sm flex items-center gap-2 flex-wrap">
                <span className="num">{x.code}</span>
                <Pill tone={EX_TONE[x.kind] || 'blue'}>{EX_LABEL[x.kind] || x.kind}</Pill>
                <span className="text-xs t3 font-normal">Band {x.band}{x.hubName ? ` · ${x.hubName}` : ''}</span>
              </div>
              <div className="text-xs t3 truncate">{x.detail}</div>
            </div>
            <span className="num text-xs t3 flex-shrink-0">{age(x.ageMin)}</span>
            <Btn kind="soft" size="sm" iconRight="arrow-right" onClick={() => setOpen(x.runId)}>Open</Btn>
          </div>
        ))}
    </Card>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Forming" value={s.forming ?? 0} sub="filling against a slot" icon="layer-group" tone="amber" />
      <Stat label="Awaiting a rider" value={s.open ?? 0} sub={`${s.unclaimedOver30 ?? 0} over 30 min`} icon="user-clock" tone={s.unclaimedOver30 ? 'red' : 'blue'} />
      <Stat label="In progress" value={s.accepted ?? 0} sub={`${s.ridersActive ?? 0} riders out · ${s.ridersIdle ?? 0} idle`} icon="motorcycle" tone="green" />
      <Stat label="Rider cost (month)" value={kes(s.riderCostMonth || 0)} sub={s.costPerRun ? `${kes(s.costPerRun)} per run · ${s.completedMonth ?? 0} runs` : 'no completed runs yet'} icon="money-bill-wave" tone="pri" />
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5 pb-3 flex-wrap">
            <h3 className="font-bold t1">Run board</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {hubs.length > 1 && (
                <select value={hub} onChange={(e) => setHub(e.target.value)} className="ym-input" style={{ width:'auto', padding:'6px 10px', fontSize:13 }}>
                  <option value="all">All collection points</option>
                  {hubs.map((h) => <option key={h.hubId} value={h.hubId}>{h.name}</option>)}
                </select>
              )}
              <Seg value={stage} onChange={setStage} options={STAGE_FILTERS} fmt={(o) => STAGE_LABEL[o]} />
            </div>
          </div>
          <DataTable minWidth={760} rows={shown} pageSize={12} onRowClick={(r) => setOpen(r.id)}
            empty={<EmptyState icon="route" title="No runs in this view." sub="Runs appear here the moment a paid order is batched." />}
            columns={[
              { key:'code', header:'Run', sort:true, render:(r) => (
                <span className="num font-semibold t1 flex items-center gap-1.5">{r.code}
                  {r.stale && <Icon name="triangle-exclamation" style={{ color:'var(--amber)' }} title={`No movement for ${age(r.ageMin)}`} />}
                  {r.perishable && <Icon name="temperature-low" style={{ color:'var(--blue)' }} title="Perishable — short batching clock" />}
                </span>) },
              { key:'status', header:'Stage', sort:true, render:(r) => <Pill tone={STAGE_TONE[r.status] || 'blue'}>{r.statusLabel}</Pill> },
              { key:'band', header:'Band', render:(r) => <span className="t2 text-xs">{r.band} · {r.vehicle}</span> },
              { key:'hubName', header:'Collection point', render:(r) => <span className="t2 truncate">{r.hubName || <span className="t3">Unassigned</span>}</span> },
              { key:'riderName', header:'Rider', render:(r) => (r.riderName ? <span className="t2">{r.riderName}</span> : <span className="t3">—</span>) },
              // Fill is the whole cost case for batching: a half-empty run costs
              // nearly what a full one does.
              { key:'fillPct', header:'Fill', align:'right', sortValue:(r) => r.fillPct, render:(r) => (
                <span className="inline-flex flex-col items-end" style={{ minWidth:64 }}>
                  <span className="num text-xs t2">{r.drops}/{r.cap} · {r.weightKg}kg</span>
                  <span style={{ width:60 }}><Bar pct={r.fillPct} color={r.fillPct >= 80 ? 'var(--green)' : r.fillPct >= 50 ? 'var(--amber)' : 'var(--red)'} /></span>
                </span>) },
              { key:'distanceKm', header:'Distance', align:'right', sortValue:(r) => r.distanceKm || 0, render:(r) => (
                <span className="num t2 text-xs">{r.distanceKm != null ? `${r.distanceKm} km` : '—'}
                  {r.routingSource === 'haversine' && <Icon name="triangle-exclamation" className="ml-1" style={{ color:'var(--amber)' }} title="Straight-line estimate — the road router was unavailable" />}
                </span>) },
              { key:'payout', header:'Payout', align:'right', sortValue:(r) => r.payout, render:(r) => <span className="num t1 font-semibold">{r.payout ? kes(r.payout) : '—'}</span> },
              { key:'ageMin', header:'Age', align:'right', sortValue:(r) => r.ageMin, render:(r) => <span className="num text-xs" style={{ color: r.stale ? 'var(--amber)' : 'var(--t3)' }}>{age(r.ageMin)}</span> },
            ]} />
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-5 pb-3"><h3 className="font-bold t1">Collection points</h3><p className="text-xs t3">Pickup-enabled stores acting as hubs — parcels in, parcels waiting</p></div>
          <DataTable minWidth={560} rows={hubs} keyField="hubId"
            empty={<EmptyState icon="warehouse" title="No hub activity." sub="Collection points appear once orders route through them." />}
            columns={[
              { key:'name', header:'Collection point', render:(h) => <span className="font-semibold t1">{h.name}</span> },
              { key:'forming', header:'Forming', align:'right', render:(h) => <span className="num t2">{h.forming}</span> },
              { key:'open', header:'Awaiting rider', align:'right', render:(h) => <span className="num" style={{ color: h.open ? 'var(--blue)' : 'var(--t3)' }}>{h.open}</span> },
              { key:'accepted', header:'In transit', align:'right', render:(h) => <span className="num t2">{h.accepted}</span> },
              { key:'incoming', header:'Incoming', align:'right', render:(h) => <span className="num t2">{h.incoming}</span> },
              // Parcels sitting at a hub are the uncollected-parcel clock ticking.
              { key:'awaitingCollection', header:'Awaiting collection', align:'right', render:(h) => <span className="num font-semibold" style={{ color: h.awaitingCollection ? 'var(--amber)' : 'var(--t3)' }}>{h.awaitingCollection}</span> },
            ]} />
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-bold t1 mb-1">Fleet by band</h3>
          <p className="text-xs t3 mb-4">Riders whose badge and rating let them claim right now</p>
          <div className="space-y-4">{fleet.map((f) => { const avail = f.active + f.idle; return (
            <div key={f.band}>
              <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold t1">Band {f.band}</span><span className="num t3">{f.active}/{avail || 0} out</span></div>
              <Bar pct={avail ? (f.active / avail) * 100 : 0} color="var(--green)" />
              <div className="text-xs t3 mt-1">
                {f.label.split('·')[1]?.trim()} · {f.idle} available
                {f.blocked > 0 && <span style={{ color:'var(--amber)' }}> · {f.blocked} blocked</span>}
              </div>
            </div>); })}
            {!fleet.some((f) => f.active + f.idle + f.blocked) && <EmptyState icon="motorcycle" title="No riders yet." sub="Approved riders appear here once they claim their profile." />}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold t1 mb-1">Orders in flight</h3>
          <p className="text-xs t3 mb-4">Where every undelivered parcel sits in the custody chain</p>
          <div className="space-y-2.5">
            {[['queued','Awaiting batching','box'], ['accepted','Rider assigned','user-check'], ['picked_up','Collected from store','hand-holding-box'], ['at_hub','At collection point','warehouse']].map(([k, label, icon]) => (
              <div key={k} className="flex items-center gap-3">
                <Icon name={icon} className="w-4 text-center t3" />
                <span className="flex-1 text-sm t2">{label}</span>
                <span className="num font-bold t1">{inflight[k] ?? 0}</span>
              </div>
            ))}
          </div>
          {s.uncollected > 0 && (
            <div className="mt-4 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}>
              <Icon name="clock" className="mt-0.5" />
              <span><b>{s.uncollected}</b> parcel{s.uncollected === 1 ? '' : 's'} waiting over 48h — the uncollected-parcel policy applies.</span>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold t1 mb-1">Engine health</h3>
          <p className="text-xs t3 mb-4">Is batching actually working, and is routing honest?</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span className="t2">Average run fill</span><span className="num font-semibold t1">{s.avgFillPct != null ? `${s.avgFillPct}%` : '—'}</span></div>
              <Bar pct={s.avgFillPct || 0} color={(s.avgFillPct || 0) >= 70 ? 'var(--green)' : 'var(--amber)'} />
              <div className="text-[11px] t3 mt-1">Half-empty runs cost nearly what full ones do.</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span className="t2">Priced on real roads</span><span className="num font-semibold t1">{s.valhallaPct != null ? `${s.valhallaPct}%` : '—'}</span></div>
              <Bar pct={s.valhallaPct || 0} color={(s.valhallaPct || 0) >= 95 ? 'var(--green)' : 'var(--red)'} />
              <div className="text-[11px] t3 mt-1">The rest fell back to straight-line distance, which under-pays riders near a tier boundary.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    {open && <RunDrawer runId={open} onClose={() => setOpen(null)} reload={reload} live={live} />}
  </div>);
}

/* One run in full: custody chain per order, the optimized stop order, and the
   payout maths — so "why was I paid this?" is answerable without reading code. */
function RunDrawer({ runId, onClose, reload, live }){
  const { prompt, toast } = useDialogs();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setD(null); setErr(null);
    fetchRunDetail(runId)
      .then((r) => { if (alive) setD(r); })
      .catch((e) => { if (alive) setErr(live ? (e.message || 'Could not load this run.') : 'Connect the backend to inspect live runs.'); });
    return () => { alive = false; };
  }, [runId, live]);

  const act = async (action) => {
    const release = action === 'release';
    const reason = await prompt({
      title: release ? 'Return this run to the board?' : 'Cancel this run?',
      tone: release ? undefined : 'danger', icon: release ? 'rotate-left' : 'ban', multiline: true,
      body: release
        ? 'The run stays intact and goes back on the open board for another rider to claim.'
        : 'The run is abandoned and its orders are re-batched into new runs. Refused if any parcel has already been collected.',
      facts: [
        { label:'Run', value: run.code },
        { label:'Orders', value: `${run.orders} · ${run.drops} drop${run.drops === 1 ? '' : 's'}` },
        run.riderName ? { label:'Rider', value: run.riderName } : null,
      ],
      placeholder: 'Reason — recorded in the audit log',
      confirmLabel: release ? 'Return to board' : 'Cancel run',
      confirmIcon: release ? 'rotate-left' : 'ban',
    });
    if (reason === null) return;
    setBusy(true); setErr(null);
    try { await resolveRun(runId, action, reason); toast({ tone:'ok', title: release ? 'Run returned to the board.' : 'Run cancelled — orders re-batched.' }); reload(); onClose(); }
    catch (e) { setErr(e.message || 'Action failed.'); setBusy(false); }
  };

  const run = (d && d.run) || {};
  const orders = (d && d.orders) || [];
  const stops = (d && d.stops) || [];
  const pay = (d && d.payout) || {};
  const canAct = run.status && !['completed','cancelled'].includes(run.status) && !run.settled;

  return (
    <Modal title={run.code || 'Run'} subtitle={run.statusLabel ? `${run.statusLabel} · Band ${run.band} · ${run.vehicle || ''}` : 'Loading…'} icon="route" onClose={onClose} maxWidth={720}
      footer={canAct ? (
        <div className="flex items-center gap-2 w-full flex-wrap">
          {run.riderId && <Btn kind="soft" size="sm" icon="rotate-left" onClick={() => act('release')} disabled={busy}>Return to board</Btn>}
          <Btn kind="danger" size="sm" icon="ban" onClick={() => act('cancel')} disabled={busy} className="ml-auto">Cancel run</Btn>
        </div>
      ) : null}>
      {err && <div className="text-sm mb-3 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
      {!d && !err && <div className="py-8 text-center t3 text-sm"><Icon name="spinner" className="fa-spin mr-2" />Loading the run…</div>}
      {d && (<div className="space-y-4">
        <div className="rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" style={{ background:'var(--surface2)' }}>
          <div><div className="t3">Collection point</div><div className="t1 font-semibold truncate">{run.hubName || 'Unassigned'}</div></div>
          <div><div className="t3">Rider</div><div className="t1 font-semibold truncate">{run.riderName || 'Unclaimed'}</div></div>
          <div><div className="t3">Load</div><div className="t1 font-semibold num">{run.drops}/{run.cap} drops · {run.weightKg}/{run.weightCapKg} kg</div></div>
          <div><div className="t3">Distance / ETA</div><div className="t1 font-semibold num">{run.distanceKm != null ? `${run.distanceKm} km` : '—'}{run.etaMin ? ` · ${run.etaMin} min` : ''}</div></div>
        </div>

        {run.slotStart && (
          <div className="text-xs t3 flex items-center gap-2"><Icon name="clock" />Delivery slot {fmtWhen(run.slotStart)}{run.slotEnd ? ` – ${new Date(run.slotEnd).toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' })}` : ''}</div>
        )}
        {run.routingSource === 'haversine' && (
          <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}>
            <Icon name="triangle-exclamation" className="mt-0.5" />
            <span>This run was costed on straight-line distance because the road router was unavailable. Straight-line is always shorter than the road, so the payout tier may be one band low — worth checking if the rider disputes it.</span>
          </div>
        )}

        {/* Chain of custody — three legs, each confirmed with a handover code. */}
        <div>
          <h4 className="font-bold t1 text-sm mb-2">Orders &amp; chain of custody</h4>
          {orders.length === 0 ? <div className="text-sm t3">No orders attached to this run.</div> : (
            <div className="space-y-2">{orders.map((o) => (
              <div key={o.id} className="rounded-xl p-3" style={{ border:'1px solid var(--line)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="num font-semibold t1 text-sm">{o.code}</span>
                  <Pill tone={o.status === 'delivered' ? 'ok' : o.status === 'at_hub' ? 'amber' : 'blue'}>{String(o.status).replace('_', ' ')}</Pill>
                  <span className="text-xs t3">{o.storeName || o.storeId} · {o.items} item{o.items === 1 ? '' : 's'}{o.weightKg ? ` · ${o.weightKg} kg` : ''}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[['Store → rider', o.legs.pickedUp, o.legs.pickedUpAt], ['Rider → hub', o.legs.atHub, o.legs.atHubAt], ['Hub → shopper', o.legs.delivered, o.legs.deliveredAt]].map(([label, done, at], i) => (
                    <React.Fragment key={label}>
                      {i > 0 && <span className="flex-1 h-px" style={{ background: done ? 'var(--green)' : 'var(--line)' }} />}
                      <span className="flex items-center gap-1.5 text-[11px]" title={at ? fmtWhen(at) : 'Not yet confirmed'}>
                        <Icon name={done ? 'circle-check' : 'circle'} style={{ color: done ? 'var(--green)' : 'var(--t3)', fontSize:12 }} />
                        <span style={{ color: done ? 'var(--t1)' : 'var(--t3)' }}>{label}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}</div>
          )}
        </div>

        {stops.length > 0 && (
          <div>
            <h4 className="font-bold t1 text-sm mb-2">Optimised pickup order</h4>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {stops.map((st) => (
                <span key={st.seq} className="px-2 py-1 rounded-md t2" style={{ background:'var(--surface2)' }}>
                  <span className="num font-bold" style={{ color:'var(--pri)' }}>{st.seq}</span> {st.storeName}
                </span>
              ))}
              <Icon name="arrow-right" className="t3" />
              <span className="px-2 py-1 rounded-md font-semibold" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}>{run.hubName || 'Hub'}</span>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-bold t1 text-sm mb-2">Rider payout {pay.settled ? <Pill tone="ok">settled</Pill> : <Pill tone="blue">estimated</Pill>}</h4>
          <div className="rounded-xl p-3 text-sm space-y-1.5" style={{ background:'var(--surface2)' }}>
            <div className="flex justify-between"><span className="t3">Base ({run.band})</span><span className="num t1">{kes(pay.base || 0)}</span></div>
            <div className="flex justify-between"><span className="t3">Multi-drop × {(pay.drops || 1) - 1}</span><span className="num t1">{kes(pay.multi || 0)}</span></div>
            <div className="flex justify-between"><span className="t3">Distance · {pay.km || 0} paid km @ KSh 25</span><span className="num t1">{kes(pay.distance || 0)}</span></div>
            <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop:'1px solid var(--line)' }}><span className="t1">Total</span><span className="num t1">{kes(pay.total || 0)}</span></div>
          </div>
          <div className="text-[11px] t3 mt-1.5">Paid km is fixed by the route's distance tier (tier upper bound − 2), so re-optimising a route never cuts a rider's pay.</div>
        </div>
      </div>)}
    </Modal>
  );
}

/* ── Rider roster ──────────────────────────────────────────────────────────────
   Why a run goes unclaimed is usually a rider-side answer: a lapsed badge, a
   rating below the floor, or a suspended profile. This is that answer, in one
   table, with the lever to act on it. */
const RIDER_FILTERS = ['all', 'available', 'onRun', 'blocked'];
const RIDER_FILTER_LABEL = { all:'All', available:'Available', onRun:'On a run', blocked:'Blocked' };
const BLOCK_LABEL = { profile:'Suspended', badge:'Badge lapsed', rating:'Below rating floor' };

export function RiderRoster(){
  const { prompt, toast } = useDialogs();
  const { data, live, error, demo, reload } = useStaffResource(fetchRiderRoster, { riders:[], counts:{} }, [], { pollMs: 60000 });
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const riders = data.riders || [];
  const counts = data.counts || {};
  const ql = q.trim().toLowerCase();
  const shown = riders
    .filter((r) => filter === 'all' ? true
      : filter === 'available' ? (r.canClaim && !r.onRun)
        : filter === 'onRun' ? !!r.onRun : !r.canClaim)
    .filter((r) => !ql || [r.name, r.email, r.phone, r.county].some((x) => (x || '').toLowerCase().includes(ql)));

  const toggle = async (r) => {
    const suspending = r.status === 'active';
    const next = suspending ? 'suspended' : 'active';
    const reason = await prompt({
      title: suspending ? `Suspend ${r.name}?` : `Reinstate ${r.name}?`,
      tone: suspending ? 'danger' : undefined, icon: suspending ? 'ban' : 'circle-check', multiline: true,
      body: suspending
        ? 'They stop being offered runs immediately. Any run already in their hands is untouched — move that from the run board.'
        : 'They can claim runs again, subject to their badge and rating.',
      facts: [
        { label:'Rating', value: r.rating == null ? 'unrated' : r.rating.toFixed(2) },
        { label:'Runs completed', value: String(r.runsCompleted) },
        r.onRun ? { label:'Currently on', value: r.onRun } : null,
      ],
      placeholder: 'Reason — audit-logged and sent to the rider',
      confirmLabel: suspending ? 'Suspend rider' : 'Reinstate',
      confirmIcon: suspending ? 'ban' : 'circle-check',
    });
    if (reason === null) return;
    setBusy(r.uid); setMsg(null);
    try { await setRiderStatus(r.uid, next, reason); toast({ tone:'ok', title:`${r.name} ${suspending ? 'suspended' : 'reinstated'}.` }); reload(); }
    catch (e) { setMsg({ ok:false, text: e.message || 'Could not update the rider.' }); }
    finally { setBusy(null); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="id-card-clip" title="Rider roster"
      sub={demo ? 'No backend configured' : (live ? 'Who can claim work right now — and what blocks the rest' : 'Loading the roster…')}
      action={<Seg value={filter} onChange={setFilter} options={RIDER_FILTERS} fmt={(o) => RIDER_FILTER_LABEL[o]} />} />
    <BackendError error={error} onRetry={reload} />
    {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Can claim work" value={counts.canClaim ?? 0} sub={`of ${counts.total ?? 0} riders`} icon="circle-check" tone="green" />
      <Stat label="On a run" value={counts.onRun ?? 0} icon="motorcycle" tone="blue" />
      <Stat label="Badge lapsed" value={counts.badgeLapsed ?? 0} sub="can't be dispatched" icon="id-badge" tone="amber" />
      <Stat label="Below rating floor" value={counts.belowRating ?? 0} sub={`${counts.suspended ?? 0} suspended`} icon="star-half-stroke" tone="red" />
    </div>

    <div className="relative" style={{ maxWidth:420 }}>
      <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email or county…" className="ym-input pl-9" style={{ width:'100%' }} />
    </div>

    <Card className="p-0 overflow-hidden">
      <DataTable minWidth={860} rows={shown} keyField="uid" pageSize={15}
        empty={<EmptyState icon="motorcycle" title="No riders in this view." sub="Approved applicants appear here once they claim their rider profile." />}
        columns={[
          { key:'name', header:'Rider', sort:true, render:(r) => (
            <span><span className="font-semibold t1">{r.name}</span>
              <span className="block text-xs t3">{r.phone || r.email || r.uid.slice(0, 8)}{r.county ? ` · ${r.county}` : ''}</span></span>) },
          { key:'status', header:'Status', render:(r) => (r.canClaim
            ? <Pill tone="ok">Can claim</Pill>
            : <Pill tone={r.blockedBy === 'profile' ? 'red' : 'amber'}>{BLOCK_LABEL[r.blockedBy] || 'Blocked'}</Pill>) },
          // Badge tier is what gates which bands a rider may take — the practical
          // answer when a band-B run sits unclaimed with idle band-A riders.
          { key:'badgeTier', header:'Badge', render:(r) => (
            <span className="text-xs">
              <span className="t1 font-semibold">{r.badgeTier || '—'}</span>
              <span className="block t3">{r.bands.length ? `Bands ${r.bands.join('/')}` : 'No bands'}{r.badgeFree ? ' · free trial' : ''}</span>
            </span>) },
          { key:'rating', header:'Rating', align:'right', sortValue:(r) => (r.rating == null ? -1 : r.rating), render:(r) => (
            <span className="text-xs">
              <span className="num t1 font-semibold">{r.rating == null ? '—' : r.rating.toFixed(2)}</span>
              <span className="block t3">{r.grace ? 'in grace' : `${r.ratingCount} rated`}</span>
            </span>) },
          { key:'runsCompleted', header:'Runs', align:'right', sort:true, render:(r) => <span className="num t2">{r.runsCompleted}</span> },
          { key:'onRun', header:'Now', render:(r) => (r.onRun ? <span className="num text-xs" style={{ color:'var(--blue)' }}>{r.onRun}</span> : <span className="t3 text-xs">idle</span>) },
          { key:'balanceAvailable', header:'Owed', align:'right', sortValue:(r) => r.balanceAvailable, render:(r) => <span className="num t2">{kes(r.balanceAvailable)}</span> },
          { key:'act', header:'', csv:false, align:'right', render:(r) => (
            <Btn kind={r.status === 'active' ? 'soft' : 'success'} size="sm" icon={busy === r.uid ? 'spinner' : (r.status === 'active' ? 'ban' : 'circle-check')}
              onClick={(e) => { e.stopPropagation(); toggle(r); }} disabled={busy === r.uid}>
              {r.status === 'active' ? 'Suspend' : 'Reinstate'}
            </Btn>) },
        ]} />
    </Card>
  </div>);
}
