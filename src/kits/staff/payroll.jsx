/* payroll.jsx — Staff portal: monthly payroll. CONFIDENTIAL · finance only.

   A run is computed from records the platform already holds — staff_contracts for what
   each person is owed, staff_shifts for what the hourly and daily people actually worked
   — with real Kenyan statutory deductions (PAYE, SHIF, NSSF, Housing Levy).

   IT DOES NOT MOVE MONEY. Salaries are paid through the bank; a run is a computation and
   a record, and the screen says so rather than letting anyone assume otherwise.

   The flow is deliberately two-step. Preview computes nothing permanent and can be run as
   often as you like. Creating a run freezes the figures; approving one posts the cost to
   finance and releases payslips to staff. Approval is the irreversible half, so it is the
   one that asks. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Stat, DataTable, EmptyState, Modal, kes, exportCsv } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  previewPayroll, createPayrollRun, fetchPayrollRuns, fetchPayrollRun,
  approvePayrollRun, voidPayrollRun,
} from './service.js';

const { useState, useEffect, useCallback } = React;

/** Current month as YYYY-MM — payroll is nearly always run for the month you are in. */
const thisMonth = () => new Date().toISOString().slice(0, 7);

const monthLabel = (p) => {
  if (!/^\d{4}-\d{2}$/.test(p || '')) return p || '—';
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

// Pill's vocabulary is ok|amber|blue|red (see .pill-* in the theme). It is NOT Stat's
// (pri|green|amber|blue|red) — mixing the two renders an unstyled pill, and on Stat it
// throws outright, because Stat indexes its tone map and reads .bg off the result.
const STATUS_TONE = { draft: 'amber', approved: 'ok', void: 'red' };

/* ── One payslip, expanded ────────────────────────────────────────────────── */
function PayslipModal({ item, period, onClose }) {
  if (!item) return null;
  const d = item.deductions || {};
  const row = (label, value, opts = {}) => (
    <div className="flex items-center justify-between py-1.5" style={opts.strong ? { fontWeight: 700 } : undefined}>
      <span className={opts.strong ? 't1' : 't3'}>{label}</span>
      <span className={opts.strong ? 't1' : 't2'}>{kes(value)}</span>
    </div>
  );
  return (
    <Modal
      title={item.name || 'Payslip'}
      subtitle={`${item.title || item.department || 'Staff'} · ${monthLabel(period)}`}
      icon="receipt"
      onClose={onClose}
      maxWidth={520}
    >
      <div className="text-sm">
        {row('Gross pay', item.gross, { strong: true })}
        {(item.payPeriod === 'hourly' || item.payPeriod === 'daily') && (
          <div className="text-xs t3 pb-2">
            {item.payPeriod === 'hourly' ? `${item.hours || 0} hours` : `${item.days || 0} days`} recorded
            {' · '}rate {kes(item.payAmount)} per {item.payPeriod === 'hourly' ? 'hour' : 'day'}
          </div>
        )}

        <div className="mt-3 mb-1 text-xs font-semibold t3" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Statutory deductions
        </div>
        {row('NSSF (Tier I + II)', d.nssf)}
        {row('SHIF (2.75%)', d.shif)}
        {row('Housing Levy (1.5%)', d.housingLevy)}
        <div className="text-xs t3 py-1">
          Taxable pay {kes(item.taxablePay)} — gross less the three above, which are deductible before PAYE.
        </div>
        {row('PAYE', d.paye)}
        {row('Total deductions', item.totalDeductions, { strong: true })}

        <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 8 }}>
          {row('NET PAY', item.netPay, { strong: true })}
        </div>

        <div className="mt-3 text-xs t3">
          Employer also pays {kes((item.employer || {}).total || 0)} in matched NSSF and Housing Levy,
          making the total cost of employing {(item.name || 'this person').split(' ')[0]} {kes(item.employmentCost)} this month.
        </div>
      </div>
    </Modal>
  );
}

/* ── Preview: compute a month without committing to it ────────────────────── */
function Preview({ period, onCreated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState(null);
  const dialogs = useDialogs();

  const run = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await previewPayroll(period)); } catch (e) { setErr(e.message || 'Could not compute payroll.'); setData(null); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { run(); }, [run]);

  const create = async () => {
    const ok = await dialogs.confirm({
      title: `Create the ${monthLabel(period)} payroll run?`,
      body: 'This freezes the figures below into a draft. Nothing is paid and nothing is posted to finance until the run is approved.',
      confirmLabel: 'Create draft run',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await createPayrollRun(period);
      dialogs.toast?.({ title: `Draft run created for ${monthLabel(period)}.` });
      onCreated?.(res?.id);
    } catch (e) {
      dialogs.toast?.({ title: e.message || 'Could not create the run.', tone: 'error' });
    } finally { setBusy(false); }
  };

  if (loading) return <Card className="p-6 t3 text-sm">Computing {monthLabel(period)}…</Card>;
  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>;
  if (!data) return null;

  const t = data.totals || {};
  const statutory = (r) => {
    const d = r.deductions || {};
    return (d.nssf || 0) + (d.shif || 0) + (d.housingLevy || 0);
  };
  const columns = [
    { key: 'name', header: 'Employee', sort: true, csvValue: (r) => r.name, render: (r) => (
      <div><div className="font-semibold t1">{r.name}</div><div className="text-xs t3">{r.title || r.department || '—'}</div></div>
    ) },
    { key: 'department', header: 'Department', sort: true, csvValue: (r) => r.department || '',
      render: (r) => <span className="t3 text-xs">{r.department || '—'}</span> },
    { key: 'gross', header: 'Gross', sort: true, csvValue: (r) => r.gross, render: (r) => kes(r.gross) },
    { key: 'paye', header: 'PAYE', sortValue: (r) => (r.deductions || {}).paye || 0,
      csvValue: (r) => (r.deductions || {}).paye || 0, render: (r) => kes((r.deductions || {}).paye || 0) },
    { key: 'statutory', header: 'NSSF + SHIF + Levy', sortValue: statutory, csvValue: statutory,
      render: (r) => kes(statutory(r)) },
    { key: 'netPay', header: 'Net pay', sort: true, csvValue: (r) => r.netPay,
      render: (r) => <b className="t1">{kes(r.netPay)}</b> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Staff on this run" value={t.headcount || 0} icon="users" />
        <Stat label="Gross pay" value={kes(t.gross || 0)} icon="money-bill" />
        <Stat label="Net to staff" value={kes(t.net || 0)} icon="hand-holding-dollar" tone="green" />
        <Stat label="Total employment cost" value={kes(t.employerCost || 0)} icon="building" sub="Gross + employer NSSF & levy" />
      </div>

      {/* A run computes fine without these and cannot be FILED without them. Flagged at
          preview so they are chased now rather than at a KRA deadline. */}
      {!!data.lines.filter((l) => (l.missingIds || []).length).length && (
        <Card className="p-4 text-sm" style={{ borderColor: 'var(--amber)' }}>
          <Icon name="triangle-exclamation" />{' '}
          {data.lines.filter((l) => (l.missingIds || []).length).length} of {data.lines.length} payslips are missing a
          statutory number. Payroll still runs; the PAYE return and P9 cannot be filed without them.
          <div className="text-xs t3 mt-1">
            {data.lines.filter((l) => (l.missingIds || []).length).slice(0, 6)
              .map((l) => `${l.name} (${l.missingIds.join(', ')})`).join(' · ')}
            {data.lines.filter((l) => (l.missingIds || []).length).length > 6 ? ' …' : ''}
          </div>
          <div className="text-xs t3 mt-1">Fill them in under People → Statutory numbers.</div>
        </Card>
      )}

      {data.existingRun && (
        <Card className="p-4 text-sm" style={{ borderColor: 'var(--amber)' }}>
          <Icon name="circle-info" /> A payroll run for {monthLabel(period)} already exists ({data.existingRun.status}).
          Creating another is blocked — void the existing one first if it has to be redone.
        </Card>
      )}

      {!!(data.blocked || []).length && (
        <Card className="p-5 space-y-2">
          <div className="font-bold t1"><Icon name="triangle-exclamation" /> {data.blocked.length} not on this run</div>
          <div className="text-xs t3">
            These people have an active contract but their pay could not be worked out. They are listed
            rather than silently skipped — somebody left out of payroll finds out on payday.
          </div>
          {data.blocked.map((b) => (
            <div key={b.uid} className="flex items-start justify-between gap-3 text-sm py-1" style={{ borderTop: '1px solid var(--line)' }}>
              <div><b className="t1">{b.name}</b> <span className="t3">{b.department}</span></div>
              <div className="t3 text-xs" style={{ maxWidth: 380, textAlign: 'right' }}>{b.reason}</div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="font-bold t1">Payslips — {monthLabel(period)}</div>
          <div className="flex gap-2">
            {/* The CSV is the artefact that actually reaches a bank or an accountant, so it
                carries the full statutory breakdown rather than the summarised columns above. */}
            <Btn kind="ghost" size="sm" icon="file-csv"
              onClick={() => exportCsv(`payroll-${period}.csv`, [
                { key: 'name', header: 'Employee', csvValue: (r) => r.name },
                { key: 'department', header: 'Department', csvValue: (r) => r.department || '' },
                // The filing keys. A PAYE return, a P9 and the NSSF/SHIF schedules are all
                // keyed on these, so the export is useless to an accountant without them.
                { key: 'kraPin', header: 'KRA PIN', csvValue: (r) => r.kraPin || '' },
                { key: 'nssfNo', header: 'NSSF No', csvValue: (r) => r.nssfNo || '' },
                { key: 'shifNo', header: 'SHIF No', csvValue: (r) => r.shifNo || '' },
                { key: 'payPeriod', header: 'Basis', csvValue: (r) => r.payPeriod || '' },
                { key: 'gross', header: 'Gross', csvValue: (r) => r.gross },
                { key: 'nssf', header: 'NSSF', csvValue: (r) => (r.deductions || {}).nssf || 0 },
                { key: 'shif', header: 'SHIF', csvValue: (r) => (r.deductions || {}).shif || 0 },
                { key: 'housingLevy', header: 'Housing Levy', csvValue: (r) => (r.deductions || {}).housingLevy || 0 },
                { key: 'taxablePay', header: 'Taxable pay', csvValue: (r) => r.taxablePay },
                { key: 'paye', header: 'PAYE', csvValue: (r) => (r.deductions || {}).paye || 0 },
                { key: 'totalDeductions', header: 'Total deductions', csvValue: (r) => r.totalDeductions },
                { key: 'netPay', header: 'Net pay', csvValue: (r) => r.netPay },
                { key: 'employmentCost', header: 'Employment cost', csvValue: (r) => r.employmentCost },
              ], data.lines)}>Export CSV</Btn>
            <Btn kind="primary" size="sm" icon="lock" onClick={create} disabled={busy || !!data.existingRun}>
              {busy ? 'Creating…' : 'Create draft run'}
            </Btn>
          </div>
        </div>
        <DataTable columns={columns} rows={data.lines} keyField="uid" onRowClick={setSlip}
          empty="No payable staff for this month." minWidth={720} />
        <div className="text-xs t3">
          Statutory rates last reviewed <b>{data.ratesReviewed || 'unknown'}</b>. These are set by law, not by us —
          check them against current KRA, SHA and NSSF guidance at the start of each tax year.
        </div>
      </Card>

      <PayslipModal item={slip} period={period} onClose={() => setSlip(null)} />
    </div>
  );
}

/* ── An existing run ──────────────────────────────────────────────────────── */
function RunDetail({ id, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState(null);
  const dialogs = useDialogs();

  const load = useCallback(async () => {
    try { setData(await fetchPayrollRun(id)); setErr(null); } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}>{err}</Card>;
  if (!data) return <Card className="p-6 t3 text-sm">Loading run…</Card>;

  const { run, items } = data;
  const t = run.totals || {};

  const approve = async () => {
    const ok = await dialogs.confirm({
      title: `Approve payroll for ${monthLabel(run.period)}?`,
      body: `This posts ${kes(t.employerCost || 0)} to finance as a fixed cost and makes ${t.headcount || 0} payslips visible to staff. `
        + 'The figures freeze at that point. It does not pay anyone — salaries still go out through the bank.',
      confirmLabel: 'Approve run',
    });
    if (!ok) return;
    setBusy(true);
    try { await approvePayrollRun(id); await load(); onChanged?.(); dialogs.toast?.({ title: 'Payroll approved and posted to finance.' }); }
    catch (e) { dialogs.toast?.({ title: e.message || 'Could not approve.', tone: 'error' }); }
    finally { setBusy(false); }
  };

  const doVoid = async () => {
    const reason = await dialogs.prompt({
      title: 'Void this payroll run',
      body: run.financeEntryId
        ? 'This run has already posted to finance. Voiding it here does NOT reverse that entry — that is a deliberate finance correction, not a side effect. Say why.'
        : 'Say why this run is being voided.',
      confirmPhrase: 'VOID',
    });
    if (!reason) return;
    setBusy(true);
    try { await voidPayrollRun(id, reason); await load(); onChanged?.(); }
    catch (e) { dialogs.toast?.({ title: e.message || 'Could not void.', tone: 'error' }); }
    finally { setBusy(false); }
  };

  const columns = [
    { key: 'name', header: 'Employee', sort: true, csvValue: (r) => r.name, render: (r) => (
      <div><div className="font-semibold t1">{r.name}</div><div className="text-xs t3">{r.title || r.department || '—'}</div></div>
    ) },
    { key: 'gross', header: 'Gross', sort: true, csvValue: (r) => r.gross, render: (r) => kes(r.gross) },
    { key: 'totalDeductions', header: 'Deductions', sort: true, csvValue: (r) => r.totalDeductions,
      render: (r) => kes(r.totalDeductions) },
    { key: 'netPay', header: 'Net pay', sort: true, csvValue: (r) => r.netPay,
      render: (r) => <b className="t1">{kes(r.netPay)}</b> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Btn kind="ghost" size="sm" icon="arrow-left" onClick={onBack}>All runs</Btn>
        <div className="font-bold t1 text-lg">{monthLabel(run.period)}</div>
        <Pill tone={STATUS_TONE[run.status] || 'blue'}>{run.status}</Pill>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Staff paid" value={t.headcount || 0} icon="users" />
        <Stat label="Gross" value={kes(t.gross || 0)} icon="money-bill" />
        <Stat label="Net to staff" value={kes(t.net || 0)} icon="hand-holding-dollar" tone="green" />
        <Stat label="Employment cost" value={kes(t.employerCost || 0)} icon="building" />
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* People, not addresses. The name is resolved from the staff directory server
              side, so it is right for runs created before names were stored. */}
          <div className="text-sm t3">
            Created by {run.createdByName || run.createdByEmail || '—'}
            {run.approvedAt ? ` · approved by ${run.approvedByName || run.approvedByEmail || '—'}` : ''}
            {run.financeEntryId ? ' · posted to finance' : ''}
          </div>
          <div className="flex gap-2">
            {run.status === 'draft' && (
              <Btn kind="primary" size="sm" icon="circle-check" onClick={approve} disabled={busy}>
                {busy ? 'Working…' : 'Approve & post'}
              </Btn>
            )}
            {run.status !== 'void' && (
              <Btn kind="ghost" size="sm" icon="ban" onClick={doVoid} disabled={busy}>Void</Btn>
            )}
          </div>
        </div>

        {run.status === 'void' && run.voidReason && (
          <div className="text-sm" style={{ color: 'var(--red)' }}>Voided: {run.voidReason}</div>
        )}

        <DataTable columns={columns} rows={items} keyField="uid" onRowClick={setSlip} minWidth={640} />
      </Card>

      {!!(run.blocked || []).length && (
        <Card className="p-5 space-y-2">
          <div className="font-bold t1">{run.blocked.length} were not on this run</div>
          {run.blocked.map((b) => (
            <div key={b.uid} className="text-sm t3 py-1" style={{ borderTop: '1px solid var(--line)' }}>
              <b className="t1">{b.name}</b> — {b.reason}
            </div>
          ))}
        </Card>
      )}

      <PayslipModal item={slip} period={run.period} onClose={() => setSlip(null)} />
    </div>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export function Payroll() {
  const [tab, setTab] = useState('preview');          // preview | runs
  const [period, setPeriod] = useState(thisMonth());
  const [openRun, setOpenRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsErr, setRunsErr] = useState(null);

  const loadRuns = useCallback(async () => {
    try { const d = await fetchPayrollRuns(); setRuns(d.runs || []); setRunsErr(null); }
    catch (e) { setRunsErr(e.message); }
  }, []);
  useEffect(() => { loadRuns(); }, [loadRuns]);

  const openCreated = (id) => { loadRuns(); if (id) { setOpenRun(id); setTab('runs'); } };

  return (
    <div className="fadeup space-y-6">
      <SectionHead
        icon="money-check-dollar"
        title="Payroll"
        sub="Monthly pay from contracts and the clock, with PAYE, SHIF, NSSF and Housing Levy"
      />

      <Card className="p-5 text-sm t3 space-y-1">
        <div>
          <b className="t1">This does not pay anyone.</b> A run computes what each person is owed, records the
          payslips, and posts the cost to Finance. Salaries still go out through the bank.
        </div>
        <div>
          Monthly staff are paid their salary in full. Hourly and daily staff are paid from <b>closed</b> shifts
          on the clock — an open shift is time not yet worked, so it is never paid.
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap items-center">
        <Btn kind={tab === 'preview' ? 'primary' : 'ghost'} size="sm" icon="calculator"
          onClick={() => { setTab('preview'); setOpenRun(null); }}>Compute a month</Btn>
        <Btn kind={tab === 'runs' ? 'primary' : 'ghost'} size="sm" icon="clock-rotate-left"
          onClick={() => setTab('runs')}>Runs{runs.length ? ` (${runs.length})` : ''}</Btn>
        {tab === 'preview' && (
          <input
            type="month"
            value={period}
            max={thisMonth()}
            onChange={(e) => setPeriod(e.target.value)}
            className="ym-input"
            style={{ width: 190, marginLeft: 'auto' }}
          />
        )}
      </div>

      {tab === 'preview' && <Preview period={period} onCreated={openCreated} />}

      {tab === 'runs' && (openRun
        ? <RunDetail id={openRun} onBack={() => setOpenRun(null)} onChanged={loadRuns} />
        : runsErr
          ? <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}>{runsErr}</Card>
          : runs.length
            ? (
              <Card className="p-5">
                <DataTable
                  minWidth={640}
                  keyField="id"
                  rows={runs}
                  onRowClick={(r) => setOpenRun(r.id)}
                  initialSort={{ key: 'period', dir: 'desc' }}
                  columns={[
                    { key: 'period', header: 'Month', sort: true, render: (r) => <b className="t1">{monthLabel(r.period)}</b> },
                    { key: 'status', header: 'Status', sort: true, render: (r) => <Pill tone={STATUS_TONE[r.status] || 'blue'}>{r.status}</Pill> },
                    { key: 'headcount', header: 'Staff', sortValue: (r) => (r.totals || {}).headcount || 0,
                      render: (r) => (r.totals || {}).headcount || 0 },
                    { key: 'gross', header: 'Gross', sortValue: (r) => (r.totals || {}).gross || 0,
                      render: (r) => kes((r.totals || {}).gross || 0) },
                    { key: 'net', header: 'Net', sortValue: (r) => (r.totals || {}).net || 0,
                      render: (r) => kes((r.totals || {}).net || 0) },
                  ]}
                />
              </Card>
            )
            : <EmptyState icon="money-check-dollar" title="No payroll runs yet."
                sub="Compute a month first, then create the run from the preview." />
      )}
    </div>
  );
}

export default Payroll;
