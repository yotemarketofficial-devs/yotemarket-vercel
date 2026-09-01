/* people.jsx — Staff management: the time clock, access control and timesheets.

   Three things that were missing:

   • ClockControl — a shift clock in the console header. Staff hours were not
     recorded anywhere, so there was no answer to "was anyone on the desk when
     this ticket sat unanswered for six hours?".
   • StaffAccess — the old Team screen granted a binary admin/moderator role, so
     every moderator could approve scout payouts, suspend riders and (once Comms
     shipped) broadcast to every user on the platform. Access is now a TIER
     (admin / department lead / agent) plus the DEPARTMENTS it applies to, and
     the same rule is enforced server-side by assertDept/assertLead — this screen
     only decides what to send.
   • Attendance — timesheets built from the clock, including the forgot-to-clock-
     out case, which a people lead closes explicitly so a corrected shift is
     visibly corrected rather than silently counted as worked. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Icon, DataTable, Modal, EmptyState, BackendError, exportCsv } from './ui.jsx';
import {
  useStaffResource, useStaffClaims, useRefreshSignal,
  fetchStaff, setStaffAccess, onboardStaff, offboardStaff,
  clockIn, clockOut, fetchMyShifts, fetchAttendance, closeShift,
  ALL_DEPTS, DEPT_LABEL, TIER_LABEL, setStatutoryIds, setStaffProfile,
  repairStaffDepartments, backfillStoreClaims,
} from './service.js';
import { useDialogs } from './dialogs.jsx';
const { useState, useEffect, useCallback } = React;

const TIER_TONE = { admin:'red', lead:'pri', agent:'blue' };
const hhmm = (min) => {
  if (min == null) return '—';
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};
const clockTime = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' }) : '—');
const dayLabel = (d) => {
  if (!d) return '—';
  const dt = new Date(`${d}T00:00:00`);
  return dt.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' });
};

/* ══ The header clock ═════════════════════════════════════════════════════ */
/**
 * `wide` renders the nav-footer form: full width, matching the Home button it sits above,
 * with its panel opening UPWARD — at the foot of the nav a downward panel would open off
 * the bottom of the screen.
 */
export function ClockControl({ rail = false, wide = false }) {
  const { isStaff } = useStaffClaims();
  const { confirm, prompt, toast } = useDialogs();
  const [state, setState] = useState(null);   // { open, todayMinutes, weekMinutes }
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState(false);

  const load = useCallback(() => {
    fetchMyShifts().then(setState).catch(() => setState(null));
  }, []);
  useEffect(() => { if (isStaff) load(); }, [isStaff, load]);
  useRefreshSignal(load);

  // Tick only while a shift is open — no timer running for a clocked-out console.
  const open = state && state.open;
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [open]);

  if (!isStaff || !state) return null;

  const elapsed = open ? Math.round((now - (open.clockInAt || now)) / 60000) : 0;

  const go = async () => {
    if (busy) return;
    if (!open) {
      setBusy(true);
      try { await clockIn(); toast({ tone:'ok', title:'Clocked in', body:`Shift started at ${clockTime(Date.now())}.` }); load(); }
      catch (e) { toast({ tone:'error', title:'Could not clock in', body:e.message }); }
      finally { setBusy(false); }
      return;
    }
    const ok = await confirm({
      title:'End your shift?', icon:'clock',
      body:'Your hours are recorded on the team timesheet.',
      facts:[{ label:'Started', value:clockTime(open.clockInAt) }, { label:'Elapsed', value:hhmm(elapsed) }],
      confirmLabel:'Clock out', confirmIcon:'right-from-bracket',
    });
    if (!ok) return;
    const note = await prompt({
      title:'Anything to hand over?', optional:true, multiline:true,
      placeholder:'Optional — what you left in progress, for whoever picks it up.',
      confirmLabel:'Clock out', hint:'Leave blank if there is nothing outstanding.',
    });
    if (note === null) return;
    setBusy(true);
    try { const r = await clockOut(note); toast({ tone:'ok', title:'Clocked out', body:`${hhmm(r.minutes)} recorded.` }); load(); }
    catch (e) { toast({ tone:'error', title:'Could not clock out', body:e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative">
      {/* In the rail there is no room for the wide pill, so the compact button is the only
          one rendered at any width — and it carries the elapsed time underneath, since the
          rail is where somebody now looks to see whether they are on shift. */}
      {wide ? (
        // Shaped like the Home button beneath it, so the two read as one pair of controls.
        <button onClick={() => setPanel((p) => !p)} title={open ? 'On shift' : 'Clocked out'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: open ? 'var(--green-bg)' : 'var(--surface2)',
            color: open ? 'var(--green)' : 'var(--t2)',
          }}>
          <Icon name="clock" className="w-5 text-center" style={{ color: open ? 'var(--green)' : 'var(--t3)' }} />
          <span className="flex-1 text-left">{open ? 'On shift' : 'Clock in'}</span>
          {open && <span className="num text-xs">{hhmm(elapsed)}</span>}
        </button>
      ) : rail ? (
        <button onClick={() => setPanel((p) => !p)} title={open ? 'On shift' : 'Clocked out'}
          className="flex flex-col items-center gap-1 w-full py-2 px-1 rounded-xl transition-colors"
          style={{ color: open ? 'var(--green)' : 'var(--t3)' }}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: open ? 'var(--green-bg)' : 'var(--surface2)', border:'1px solid var(--line)' }}>
            <Icon name="clock" className="text-lg" />
          </span>
          <span className="text-[10px] font-semibold leading-none num">{open ? hhmm(elapsed) : 'Clock in'}</span>
        </button>
      ) : (<>
        <button onClick={() => setPanel((p) => !p)} title={open ? 'On shift' : 'Clocked out'}
          className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-semibold"
          style={{ background: open ? 'var(--green-bg)' : 'var(--surface2)', color: open ? 'var(--green)' : 'var(--t3)', border:'1px solid var(--line)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: open ? 'var(--green)' : 'var(--t3)' }} />
          <span className="num">{open ? hhmm(elapsed) : 'Off shift'}</span>
        </button>
        <button onClick={() => setPanel((p) => !p)} aria-label="Time clock"
          className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: open ? 'var(--green-bg)' : 'var(--surface2)', color: open ? 'var(--green)' : 'var(--t2)', border:'1px solid var(--line)' }}>
          <Icon name="clock" />
        </button>
      </>)}

      {panel && (<>
        <div className="fixed inset-0 z-40" onClick={() => setPanel(false)} />
        <div className={`absolute rounded-xl overflow-hidden z-50 p-4 ${
          // At the foot of the nav a downward panel opens off the bottom of the screen,
          // so the wide form opens upward instead.
          wide ? 'bottom-full mb-2 left-0' : rail ? 'mt-2 left-0' : 'mt-2 right-0'}`}
          style={{ width:250, background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)' }}>
          <div className="text-xs font-bold uppercase t3" style={{ letterSpacing:'.08em' }}>Your shift</div>
          <div className="text-2xl font-bold t1 num mt-1">{open ? hhmm(elapsed) : 'Off shift'}</div>
          <div className="text-xs t3">{open ? `Since ${clockTime(open.clockInAt)}` : 'Not clocked in'}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="rounded-lg p-2" style={{ background:'var(--surface2)' }}>
              <div className="t3">Today</div><div className="num font-bold t1">{hhmm(state.todayMinutes)}</div>
            </div>
            <div className="rounded-lg p-2" style={{ background:'var(--surface2)' }}>
              <div className="t3">This week</div><div className="num font-bold t1">{hhmm(state.weekMinutes)}</div>
            </div>
          </div>
          <Btn kind={open ? 'soft' : 'success'} size="sm" className="w-full mt-3"
            icon={busy ? 'spinner' : (open ? 'right-from-bracket' : 'play')}
            onClick={() => { go(); setPanel(false); }} disabled={busy}>
            {open ? 'Clock out' : 'Clock in'}
          </Btn>
        </div>
      </>)}
    </div>
  );
}

/* ══ Access & roles ═══════════════════════════════════════════════════════ */
/* Repairing the six-department over-grant.

   A role change made without naming departments used to write the whole legacy
   operational set, and the console called it exactly that way from two screens. So people
   granted access before that was fixed may be holding marketplace, logistics, safety,
   support, growth and comms without anyone having decided that.

   It NEVER repairs silently. An admin could in principle have picked those six by hand,
   so the dry run names everybody and what they would become, and a person decides. */
/* Giving existing merchants their storeId claim.

   Storage rules cannot read Firestore, so the bucket had no way to tell whether the
   person uploading a photo owns the store whose folder they are writing to — anybody with
   an account could add files to any store's folder. Ownership now travels as a claim the
   backend mirrors from the merchant and store_staff records.

   THIS HAS TO RUN BEFORE THE RULE THAT REQUIRES IT. New stores get the claim as they are
   created; everyone who already existed needs it filling in, and until they have it the
   rule would refuse their uploads. */
function StoreClaimBackfill({ isAdmin }) {
  const { confirm, toast } = useDialogs();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;

  const run = async (commit) => {
    setBusy(true);
    try {
      const r = await backfillStoreClaims(commit);
      setPreview(r);
      if (commit) {
        toast({ tone: 'ok',
          title: `Claim set for ${r.owners + r.employees} account${r.owners + r.employees === 1 ? '' : 's'}`,
          body: 'Tokens refresh within the hour; the merchant dashboard forces it on entry.' });
      }
    } catch (e) {
      toast({ tone: 'error', title: 'Could not run', body: e?.message || 'Try again.' });
    } finally { setBusy(false); }
  };

  const apply = async () => {
    const ok = await confirm({
      title: `Set the store claim on ${preview.owners + preview.employees} account${preview.owners + preview.employees === 1 ? '' : 's'}?`,
      body: 'This only mirrors what the merchant and store_staff records already say. It grants '
          + 'nothing new — it lets the storage bucket see what the database already knows.',
      confirmLabel: 'Set the claims',
    });
    if (ok) run(true);
  };

  const pending = preview ? preview.owners + preview.employees : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-bold t1"><Icon name="store" /> Store upload permissions</h3>
        <Btn kind="ghost" size="sm" icon={busy && !preview ? 'spinner' : 'magnifying-glass'}
          disabled={busy} onClick={() => run(false)}>Check</Btn>
      </div>
      <p className="text-xs t3">
        Merchants upload product photos and feed clips straight to storage, and the bucket
        cannot read the database to check whose folder it is. Ownership travels as a token
        claim instead. New stores get it automatically; existing ones need this once.
      </p>

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Store owners" value={preview.owners} icon="user-tie" tone="pri" />
            <Stat label="Store employees" value={preview.employees} icon="users" tone="blue" />
            <Stat label="Already set" value={preview.skipped} icon="circle-check" tone="green" />
            <Stat label="No account" value={preview.failed} icon="circle-question" tone="amber" />
          </div>
          {preview.committed
            ? <div className="text-xs t3">Done. Tokens carry the claim within the hour, and the
                merchant dashboard forces a refresh on entry.</div>
            : pending
              ? <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} disabled={busy}
                  onClick={apply}>Set {pending} claim{pending === 1 ? '' : 's'}</Btn>
              : <div className="text-xs t3">Every merchant already has theirs.</div>}
        </div>
      )}
    </Card>
  );
}

function DepartmentRepair({ isAdmin, onDone }) {
  const { confirm, toast } = useDialogs();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;

  const run = async (commit) => {
    setBusy(true);
    try {
      const r = await repairStaffDepartments(commit);
      if (commit) {
        toast({ tone: 'ok', title: `Repaired ${r.repaired} record${r.repaired === 1 ? '' : 's'}` });
        setPreview(null); onDone && onDone();
      } else if (!r.affected) {
        toast({ tone: 'ok', title: 'Nothing to repair — every record names its own departments.' });
        setPreview(r);
      } else setPreview(r);
    } catch (e) {
      toast({ tone: 'error', title: 'Could not check', body: e?.message || 'Try again.' });
    } finally { setBusy(false); }
  };

  const apply = async () => {
    const ok = await confirm({
      title: `Narrow ${preview.affected} record${preview.affected === 1 ? '' : 's'}?`,
      body: 'Each person keeps the department their HR record names, or support if it names '
          + 'none. Anyone who needs more gets it here, which is a decision somebody makes '
          + 'rather than one the code made for them.',
      confirmLabel: 'Narrow them',
    });
    if (ok) run(true);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-bold t1"><Icon name="user-shield" /> Check for over-granted access</h3>
        <Btn kind="ghost" size="sm" icon={busy && !preview ? 'spinner' : 'magnifying-glass'}
          disabled={busy} onClick={() => run(false)}>Check</Btn>
      </div>
      <p className="text-xs t3">
        Granting a role used to hand out six departments — including safety, which moderates
        people, and marketplace, which suspends merchants. This finds anyone still holding
        them and shows what each would become before anything changes.
      </p>

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Records affected" value={preview.affected} icon="triangle-exclamation"
              tone={preview.affected ? 'amber' : 'green'} />
            <Stat label="Would keep" value={preview.affected ? 'their HR department' : '—'}
              icon="building" tone="blue" />
            <Stat label="Fallback" value="support" icon="life-ring" tone="pri" />
          </div>

          {!!preview.sample?.length && (
            <div className="text-xs t3 space-y-1 max-h-56 overflow-y-auto">
              {preview.sample.map((a) => (
                <div key={a.uid} className="flex gap-2 py-1 items-center" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="flex-1 truncate t2">{a.name}</span>
                  <span className="truncate" style={{ maxWidth: 150 }}>{a.reason}</span>
                  <Icon name="arrow-right" />
                  <span className="font-semibold t2">{a.to.map((d) => DEPT_LABEL[d] || d).join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {!!preview.affected && (
            <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} disabled={busy}
              onClick={apply}>Narrow {preview.affected} record{preview.affected === 1 ? '' : 's'}</Btn>
          )}
        </div>
      )}
    </Card>
  );
}

export function StaffAccess() {
  const { data, live, error, demo, reload } = useStaffResource(fetchStaff, []);
  const { confirm, toast } = useDialogs();
  const { user, isAdmin } = useStaffClaims();
  const [editing, setEditing] = useState(null);   // employee row
  const [adding, setAdding] = useState(false);

  const rows = Array.isArray(data) ? data : [];
  const active = rows.filter((r) => r.status === 'active');

  const offboard = async (emp) => {
    const ok = await confirm({
      title:`Offboard ${emp.name || emp.email}?`, tone:'danger', icon:'user-slash',
      body:'Their console access is revoked immediately. The HR record and their timesheets are kept.',
      facts:[{ label:'Access', value:`${TIER_LABEL[emp.tier] || emp.tier}${emp.departments.length ? ` · ${emp.departments.length} dept` : ''}` }],
      confirmLabel:'Offboard', confirmIcon:'user-slash',
    });
    if (!ok) return;
    try { await offboardStaff(emp.uid); toast({ tone:'ok', title:`${emp.name || emp.email} offboarded.` }); reload(); }
    catch (e) { toast({ tone:'error', title:'Could not offboard', body:e.message }); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="user-gear" title="Access &amp; roles"
      sub={demo ? 'No backend configured' : (live ? 'What each person can open, and what they can do there' : 'Loading the team…')}
      action={<Btn kind="primary" size="md" icon="user-plus" onClick={() => setAdding(true)}>Add someone</Btn>} />
    <BackendError error={error} onRetry={reload} />
    <DepartmentRepair isAdmin={isAdmin} onDone={reload} />
    <StoreClaimBackfill isAdmin={isAdmin} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Active staff" value={active.length} sub={`${rows.length - active.length} offboarded`} icon="users" tone="pri" />
      <Stat label="Administrators" value={active.filter((r) => r.tier === 'admin').length} sub="platform-wide access" icon="user-shield" tone="red" />
      <Stat label="Department leads" value={active.filter((r) => r.tier === 'lead').length} icon="user-tie" tone="blue" />
      <Stat label="On shift now" value={active.filter((r) => r.onShiftSince).length} icon="clock" tone="green" />
    </div>

    {/* Anyone still on the pre-department model is enforced under a fallback, so
        say so plainly rather than showing access nobody actually chose. */}
    {active.some((r) => !r.migrated && r.tier !== 'admin') && (
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}>
        <Icon name="circle-info" className="mt-0.5" />
        <div className="text-sm">
          <b>{active.filter((r) => !r.migrated && r.tier !== 'admin').length} account(s) haven't been assigned departments yet.</b>
          <div className="text-xs mt-0.5" style={{ opacity:.9 }}>They're running on the default — lead of every operational department. Open each one and narrow it to what they actually do.</div>
        </div>
      </div>
    )}

    <Card className="p-0 overflow-hidden">
      <DataTable minWidth={820} rows={rows} keyField="uid" pageSize={15} onRowClick={(r) => setEditing(r)}
        empty={<EmptyState icon="users" title="No staff yet." sub="Add your first team member to grant console access." />}
        columns={[
          { key:'name', header:'Person', sort:true, render:(r) => (
            <span className="flex items-center gap-2.5">
              <Avatar name={r.name || r.email} size={30} />
              <span className="min-w-0">
                <span className="block font-semibold t1 truncate">{r.name || r.email}{r.uid === (user && user.uid) ? <span className="t3 font-normal"> · you</span> : ''}</span>
                <span className="block text-xs t3 truncate">{r.title ? `${r.title} · ` : ''}{r.email}</span>
              </span>
            </span>) },
          { key:'tier', header:'Tier', sort:true, render:(r) => <Pill tone={TIER_TONE[r.tier] || 'blue'}>{TIER_LABEL[r.tier] || r.tier}</Pill> },
          { key:'departments', header:'Departments', render:(r) => (r.tier === 'admin'
            ? <span className="text-xs t3">All departments</span>
            : <span className="flex flex-wrap gap-1">{(r.departments || []).slice(0, 4).map((d) => (
              <span key={d} className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ background:'var(--surface2)', color:'var(--t2)' }}>{DEPT_LABEL[d] || d}</span>
            ))}{(r.departments || []).length > 4 && <span className="text-[11px] t3">+{r.departments.length - 4}</span>}</span>) },
          { key:'onShiftSince', header:'Shift', align:'center', render:(r) => (r.onShiftSince
            ? <Pill tone="ok">On since {clockTime(r.onShiftSince)}</Pill>
            : <span className="text-xs t3">—</span>) },
          { key:'status', header:'Status', render:(r) => (r.status === 'active'
            ? <Pill tone="ok">Active</Pill> : <Pill tone="red">Offboarded</Pill>) },
          { key:'act', header:'', csv:false, align:'right', render:(r) => (
            <span className="flex items-center gap-1.5 justify-end">
              <Btn kind="soft" size="sm" icon="pen" onClick={(e) => { e.stopPropagation(); setEditing(r); }}>Access</Btn>
              {r.status === 'active' && r.uid !== (user && user.uid) &&
                <Btn kind="ghost" size="sm" icon="user-slash" onClick={(e) => { e.stopPropagation(); offboard(r); }} title="Revoke access" />}
            </span>) },
        ]} />
    </Card>

    {editing && <AccessDrawer emp={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} isSelf={editing.uid === (user && user.uid)} />}
    {adding && <AddStaffDrawer onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
  </div>);
}

/* Tier + departments for one person. Deliberately shows what each tier can DO,
   because "lead vs agent" means nothing without the consequence next to it. */
function AccessDrawer({ emp, onClose, onSaved, isSelf }) {
  const { toast } = useDialogs();
  const [tier, setTier] = useState(emp.tier === 'admin' ? 'admin' : emp.tier || 'agent');
  const [depts, setDepts] = useState(emp.departments || []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (d) => setDepts((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));
  const ok = tier === 'admin' || depts.length > 0;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await setStaffAccess({ email: emp.email, role: tier, departments: tier === 'admin' ? ALL_DEPTS : depts });
      toast({ tone:'ok', title:'Access updated', body:`${emp.name || emp.email} is now ${TIER_LABEL[tier]}${tier !== 'admin' ? ` for ${depts.length} department${depts.length === 1 ? '' : 's'}` : ''}.` });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not update access.'); setBusy(false); }
  };

  return (
    <Modal title={emp.name || emp.email} subtitle={emp.email} icon="user-gear" onClose={onClose} maxWidth={560}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy || !ok}>Save access</Btn>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold t3 uppercase" style={{ letterSpacing:'.06em' }}>Tier</label>
          <div className="space-y-2 mt-2">
            {[
              ['admin', 'Everything, everywhere — plus managing this screen. Not department-scoped.'],
              ['lead', 'Every action inside their departments, including approving payouts, suspending riders, resolving disputes and broadcasting.'],
              ['agent', 'Day-to-day work inside their departments. Blocked from the destructive and outward-facing actions above.'],
            ].map(([k, desc]) => (
              <button key={k} onClick={() => setTier(k)} className="w-full text-left rounded-xl p-3 transition-colors"
                style={tier === k ? { background:'var(--pri-soft)', border:'1px solid var(--pri)' } : { background:'var(--surface2)', border:'1px solid var(--line)' }}>
                <div className="flex items-center gap-2">
                  <Icon name={tier === k ? 'circle-dot' : 'circle'} style={{ color: tier === k ? 'var(--pri)' : 'var(--t3)' }} />
                  <span className="font-semibold text-sm" style={{ color: tier === k ? 'var(--pri)' : 'var(--t1)' }}>{TIER_LABEL[k]}</span>
                </div>
                <div className="text-[11px] t3 leading-snug mt-1 ml-6">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {tier !== 'admin' && (
          <div>
            <label className="text-xs font-semibold t3 uppercase" style={{ letterSpacing:'.06em' }}>Departments</label>
            <p className="text-[11px] t3 mt-0.5 mb-2">Which consoles they can open. Everyone always gets Command.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_DEPTS.map((d) => {
                const on = depts.includes(d);
                return (
                  <button key={d} onClick={() => toggle(d)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
                    style={on ? { background:'var(--pri-soft)', color:'var(--pri)', border:'1px solid var(--pri)' } : { background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>
                    <Icon name={on ? 'square-check' : 'square'} className="text-xs" />{DEPT_LABEL[d]}
                  </button>
                );
              })}
            </div>
            {!depts.length && <div className="text-xs mt-2" style={{ color:'var(--amber)' }}>Pick at least one — with none they can sign in but see an empty console.</div>}
          </div>
        )}

        {isSelf && tier !== 'admin' && (
          <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2" style={{ background:'var(--red-bg)', color:'var(--red)' }}>
            <Icon name="triangle-exclamation" className="mt-0.5" />
            <span>This is your own account. The server refuses to let you drop your own admin access, so this change will be rejected.</span>
          </div>
        )}
        {err && <div className="text-sm flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
      </div>
    </Modal>
  );
}

/**
 * `prefill` carries a candidate straight from Job applications — name, email, the role
 * they applied for and the team they applied to. Retyping those is how an onboarding ends
 * up under a misspelt address that never matches the account they actually signed in with,
 * and the email is the join key here: onboardStaff looks the person up by it.
 *
 * Exported so careers.jsx can hire without duplicating this form (and, more importantly,
 * without duplicating the tier/department rules that go with it).
 */
export function AddStaffDrawer({ onClose, onSaved, prefill }) {
  const { toast } = useDialogs();
  const startDept = ALL_DEPTS.includes(prefill?.department) ? prefill.department : 'support';
  const [f, setF] = useState({
    email: prefill?.email || '', name: prefill?.name || '', title: prefill?.title || '',
    department: startDept, role: 'agent',
  });
  const [depts, setDepts] = useState([startDept]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (d) => setDepts((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await onboardStaff({ ...f, departments: f.role === 'admin' ? ALL_DEPTS : depts });
      toast({ tone:'ok', title:'Onboarded', body:`${f.name || f.email} now has console access.` });
      onSaved();
    } catch (e) { setErr(e.message || 'Could not onboard.'); setBusy(false); }
  };

  return (
    <Modal title="Add someone to the team" subtitle="They must have signed in to YoteMarket at least once" icon="user-plus" onClose={onClose} maxWidth={560}
      footer={<>
        <Btn kind="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'user-plus'} onClick={save}
          disabled={busy || !f.email.trim() || (f.role !== 'admin' && !depts.length)}>Grant access</Btn>
      </>}>
      <div className="space-y-3">
        <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Work email *" className="ym-input" style={{ width:'100%' }} />
        <div className="grid grid-cols-2 gap-3">
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" className="ym-input" />
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Job title" className="ym-input" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs t3 font-semibold">Tier</span>
          <Seg value={f.role} onChange={(v) => set('role', v)} options={['agent', 'lead', 'admin']} fmt={(o) => TIER_LABEL[o]} />
        </div>
        {f.role !== 'admin' && (
          <div>
            <div className="text-xs t3 font-semibold mb-1.5">Departments</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_DEPTS.map((d) => {
                const on = depts.includes(d);
                return (
                  <button key={d} onClick={() => toggle(d)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
                    style={on ? { background:'var(--pri-soft)', color:'var(--pri)', border:'1px solid var(--pri)' } : { background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>
                    <Icon name={on ? 'square-check' : 'square'} className="text-xs" />{DEPT_LABEL[d]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {err && <div className="text-sm flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
      </div>
    </Modal>
  );
}

/* ══ Attendance / timesheets ══════════════════════════════════════════════ */
const RANGES = [7, 14, 30];

export function Attendance() {
  const [days, setDays] = useState(14);
  const { data, live, error, demo, reload } = useStaffResource(() => fetchAttendance(days), { shifts:[], onShift:[], byPerson:[] }, [days], { pollMs:60000 });
  const { confirm, toast } = useDialogs();

  const shifts = data.shifts || [];
  const people = data.byPerson || [];
  const onShift = data.onShift || [];
  const totalMin = people.reduce((a, p) => a + (p.minutes || 0), 0);

  const close = async (row) => {
    const ok = await confirm({
      title:'Close this open shift?', icon:'clock', tone:'danger',
      body:`${row.name} never clocked out. Closing it records the hours as they stand and marks the shift as corrected by staff.`,
      facts:[
        { label:'Started', value:`${dayLabel(row.date)} ${clockTime(row.clockInAt)}` },
        { label:'Open for', value:hhmm(Math.round((Date.now() - row.clockInAt) / 60000)) },
      ],
      confirmLabel:'Close shift', confirmIcon:'check',
    });
    if (!ok) return;
    try { await closeShift(row.id); toast({ tone:'ok', title:'Shift closed.' }); reload(); }
    catch (e) { toast({ tone:'error', title:'Could not close it', body:e.message }); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="clock" title="Attendance"
      sub={demo ? 'No backend configured' : (live ? `Timesheets from the console clock · last ${days} days` : 'Loading timesheets…')}
      action={<div className="flex items-center gap-2">
        <Seg value={days} onChange={setDays} options={RANGES} fmt={(o) => `${o}d`} />
        <Btn kind="ghost" size="md" icon="file-arrow-down" disabled={!shifts.length}
          onClick={() => exportCsv(`attendance-${new Date().toISOString().slice(0, 10)}`, [
            { header:'Date', key:'date' }, { header:'Name', key:'name' }, { header:'Email', key:'email' },
            { header:'In', csvValue:(r) => clockTime(r.clockInAt) }, { header:'Out', csvValue:(r) => (r.clockOutAt ? clockTime(r.clockOutAt) : 'still open') },
            { header:'Minutes', csvValue:(r) => (r.minutes != null ? r.minutes : '') }, { header:'Note', key:'note' },
          ], shifts)}>Export</Btn>
      </div>} />
    <BackendError error={error} onRetry={reload} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="On shift now" value={onShift.length} sub={onShift.map((o) => o.name).slice(0, 2).join(', ') || 'nobody clocked in'} icon="user-clock" tone={onShift.length ? 'green' : 'blue'} />
      <Stat label="Hours logged" value={hhmm(totalMin)} sub={`across ${days} days`} icon="hourglass-half" tone="pri" />
      <Stat label="People worked" value={people.length} icon="users" tone="blue" />
      <Stat label="Avg shift" value={hhmm(shifts.length ? Math.round(totalMin / shifts.length) : null)} sub={`${shifts.length} shifts`} icon="chart-simple" tone="amber" />
    </div>

    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-3"><h3 className="font-bold t1">By person</h3><p className="text-xs t3">Total hours over the selected window</p></div>
        <DataTable minWidth={420} rows={people} keyField="uid"
          empty={<EmptyState icon="clock" title="No hours logged." sub="Shifts appear once people start using the clock." />}
          columns={[
            { key:'name', header:'Person', sort:true, render:(p) => (
              <span><span className="font-semibold t1 flex items-center gap-1.5">{p.name}{p.onShift && <span className="w-1.5 h-1.5 rounded-full" style={{ background:'var(--green)' }} title="On shift" />}</span>
                <span className="block text-xs t3">{p.department || p.email}</span></span>) },
            { key:'days', header:'Days', align:'right', sort:true, render:(p) => <span className="num t2">{p.days}</span> },
            { key:'shifts', header:'Shifts', align:'right', sort:true, render:(p) => <span className="num t2">{p.shifts}</span> },
            { key:'minutes', header:'Total', align:'right', sortValue:(p) => p.minutes, render:(p) => <span className="num font-semibold t1">{hhmm(p.minutes)}</span> },
          ]} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-3"><h3 className="font-bold t1">Shifts</h3><p className="text-xs t3">Newest first — an open shift keeps counting until it's closed</p></div>
        <DataTable minWidth={480} rows={shifts} pageSize={12}
          empty={<EmptyState icon="clock" title="No shifts recorded." />}
          columns={[
            { key:'name', header:'Person', render:(r) => (
              <span><span className="font-semibold t1 text-sm">{r.name}</span>
                <span className="block text-xs t3">{dayLabel(r.date)}</span></span>) },
            { key:'clockInAt', header:'In', align:'right', render:(r) => <span className="num text-xs t2">{clockTime(r.clockInAt)}</span> },
            { key:'clockOutAt', header:'Out', align:'right', render:(r) => (r.clockOutAt
              ? <span className="num text-xs t2">{clockTime(r.clockOutAt)}</span>
              : <Pill tone="ok">open</Pill>) },
            { key:'minutes', header:'Worked', align:'right', sortValue:(r) => r.minutes || 0, render:(r) => (
              <span className="num font-semibold t1 text-sm">{r.minutes != null ? hhmm(r.minutes) : hhmm(Math.round((Date.now() - r.clockInAt) / 60000))}</span>) },
            { key:'act', header:'', csv:false, align:'right', render:(r) => (!r.clockOutAt
              ? <Btn kind="soft" size="sm" icon="check" onClick={() => close(r)} title="They forgot to clock out">Close</Btn>
              : (r.note ? <Icon name="note-sticky" className="t3" title={r.note} /> : null)) },
          ]} />
      </Card>
    </div>
  </div>);
}

/* ══ Statutory identifiers ════════════════════════════════════════════════
   KRA PIN, NSSF and SHIF numbers, per employee.

   Payroll computes correctly without them and cannot be FILED without them: the PAYE
   return, the P9 and the NSSF/SHIF schedules are all keyed on these numbers. Missing
   ones surface here and on a payroll run, so they are found now rather than at a
   deadline.

   Anyone can fill in their OWN numbers; a People lead can fill in anybody's. The
   employee is the source of truth for their own, and HR should not be a bottleneck
   for a number the person is holding in their hand. */
/* What the server accepts for NSSF and SHIF (see normaliseStatutoryId in statutory.js):
   letters, digits, spaces, slashes and dashes, up to 32 characters.

   These inputs used to run `.replace(/\D/g, '')` on every keystroke, which silently ate
   everything but digits. SHA no longer issues digit strings — employer returns are keyed
   on a Digital Health Agency CR number like CR1105684025860-6 — so the field could not
   express the number people were being asked to enter, and NSSF's trailing X went the
   same way. Filtering to what the server allows keeps the guard without lying about the
   format; the server still validates. */
const statId = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9 /-]/g, '').slice(0, 32);

export function StatutoryIds() {
  const { data, error, reload } = useStaffResource(fetchStaff, []);
  const { toast } = useDialogs();
  const { user, isAdmin, tier, departments = [], profile } = useStaffClaims();
  const [edit, setEdit] = useState(null);   // { uid, kraPin, nssfNo, shifNo }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const rows = (Array.isArray(data) ? data : []).filter((r) => r.status === 'active');
  const canEditAnyone = isAdmin || (tier === 'lead' && departments.includes('people'));

  const open = (r) => { setErr(''); setEdit({ uid:r.uid, email:r.email, name:r.name || '', title:r.title || '', kraPin:r.kraPin || '', nssfNo:r.nssfNo || '', shifNo:r.shifNo || '' }); };
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      // Name first: if it fails the statutory write should not land either, since the
      // row would then show new numbers against the old placeholder name.
      if (edit.name.trim()) await setStaffProfile({ uid: edit.uid, name: edit.name, title: edit.title });
      await setStatutoryIds({ uid: edit.uid, kraPin: edit.kraPin, nssfNo: edit.nssfNo, shifNo: edit.shifNo });
      toast({ tone:'ok', title:'Saved', body:`Record updated for ${edit.name || edit.email}.` });
      setEdit(null); reload();
    } catch (e) { setErr(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  const missing = rows.filter((r) => !r.kraPin || !r.nssfNo || !r.shifNo);

  const columns = [
    { key:'name', header:'Employee', sort:true, csvValue:(r) => r.name || r.email, render:(r) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={r.name || r.email} size={30} />
        <span className="min-w-0">
          <span className="block font-semibold t1 truncate">{r.name || <span className="t3" style={{ fontWeight:400 }}>Name not set</span>}</span>
          <span className="block text-xs t3 truncate">{r.title || r.email}</span>
        </span>
      </span>) },
    { key:'staffId', header:'Staff ID', csvValue:(r) => r.staffId || '',
      render:(r) => r.staffId ? <span className="num text-xs t3">{r.staffId}</span> : <span className="text-xs t3">—</span> },
    { key:'kraPin', header:'KRA PIN', csvValue:(r) => r.kraPin || '',
      render:(r) => r.kraPin ? <span className="num text-sm t2">{r.kraPin}</span> : <Pill tone="amber">Missing</Pill> },
    { key:'nssfNo', header:'NSSF', csvValue:(r) => r.nssfNo || '',
      render:(r) => r.nssfNo ? <span className="num text-sm t2">{r.nssfNo}</span> : <Pill tone="amber">Missing</Pill> },
    { key:'shifNo', header:'SHIF', csvValue:(r) => r.shifNo || '',
      render:(r) => r.shifNo ? <span className="num text-sm t2">{r.shifNo}</span> : <Pill tone="amber">Missing</Pill> },
    { key:'act', header:'', csv:false, render:(r) => (
      (canEditAnyone || r.uid === (user && user.uid))
        ? <Btn kind="ghost" size="sm" icon="pen" onClick={() => open(r)}>Edit</Btn>
        : <span className="text-xs t3">—</span>) },
  ];

  if (error) return <BackendError error={error} onRetry={reload} />;

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="id-card" title="Statutory numbers"
        sub="KRA PIN, NSSF and SHIF — what PAYE returns and the P9 are filed against"
        action={rows.length ? <Btn kind="ghost" size="md" icon="file-arrow-down"
          onClick={() => exportCsv(`statutory-ids-${new Date().toISOString().slice(0,10)}`, columns, rows)}>Export</Btn> : null} />

      <Card className="p-5 text-sm t3 space-y-1">
        <div>
          <b className="t1">Payroll runs without these; it cannot be filed without them.</b> A missing number is
          found here rather than at a KRA deadline.
        </div>
        <div>You can always fill in your own. A People lead can fill in anyone's.</div>
      </Card>

      {/* Somebody signing in by badge needs to be able to find the badge. */}
      {profile?.staffId && (
        <Card className="p-5 flex items-center gap-3 flex-wrap">
          <Icon name="id-badge" />
          <div>
            <div className="text-xs t3">Your staff ID — you can sign in with this instead of your email</div>
            <div className="num font-bold t1 text-lg">{profile.staffId}</div>
          </div>
        </Card>
      )}

      {!!missing.length && (
        <Card className="p-4 text-sm" style={{ borderColor:'var(--amber)' }}>
          <Icon name="triangle-exclamation" /> {missing.length} of {rows.length} active staff are missing at least one number.
        </Card>
      )}

      <Card className="p-5">
        <DataTable columns={columns} rows={rows} keyField="uid" minWidth={720}
          empty="No active staff on record." />
      </Card>

      {edit && (
        <Modal title={edit.name || edit.email || 'Employee record'} subtitle="Name, title and statutory numbers"
          icon="id-card" onClose={() => setEdit(null)} maxWidth={480}
          footer={<>
            <Btn kind="ghost" size="sm" onClick={() => setEdit(null)} disabled={busy}>Cancel</Btn>
            <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'check'} onClick={save} disabled={busy}>Save</Btn>
          </>}>
          <div className="space-y-3">
            {/* The field that was missing everywhere. Nothing ever collected a name, so
                every screen fell back to the email's local-part and showed "general"
                where a person should be. */}
            <label className="block text-xs font-semibold t3">
              Full name
              <input value={edit.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Arnold Gichuche" className="ym-input mt-1" style={{ width:'100%' }} />
              <span className="block text-[11px] t3 mt-1 font-normal">
                Shown across the console, on contracts and in the audit log.
              </span>
            </label>
            <label className="block text-xs font-semibold t3">
              Job title
              <input value={edit.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Finance Lead" className="ym-input mt-1" style={{ width:'100%' }} />
            </label>
            <div style={{ borderTop:'1px solid var(--line)', margin:'4px 0' }} />
            <label className="block text-xs font-semibold t3">
              KRA PIN
              <input value={edit.kraPin} onChange={(e) => set('kraPin', e.target.value.toUpperCase())}
                placeholder="A123456789Z" maxLength={11} className="ym-input mt-1" style={{ width:'100%' }} />
              <span className="block text-[11px] t3 mt-1 font-normal">One letter, nine digits, one letter.</span>
            </label>
            <label className="block text-xs font-semibold t3">
              NSSF number
              <input value={edit.nssfNo} onChange={(e) => set('nssfNo', statId(e.target.value))}
                placeholder="e.g. 0012345678X" maxLength={32} className="ym-input mt-1" style={{ width:'100%' }} />
            </label>
            <label className="block text-xs font-semibold t3">
              SHIF number
              <input value={edit.shifNo} onChange={(e) => set('shifNo', statId(e.target.value))}
                placeholder="e.g. CR1105684025860-6" maxLength={32} className="ym-input mt-1" style={{ width:'100%' }} />
              <span className="block text-[11px] t3 mt-1 font-normal">Your SHA/SHIF membership number (formerly NHIF).</span>
            </label>
            <div className="text-xs t3">Leave a field blank if you do not have it yet — blanks are reported, never guessed.</div>
            {err && <div className="text-sm flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
