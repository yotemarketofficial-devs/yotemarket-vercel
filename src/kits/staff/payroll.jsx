/* payroll.jsx — Staff portal: monthly payroll. CONFIDENTIAL · finance only.

   A run is computed from records the platform already holds — staff_contracts for what
   each person is owed, staff_shifts for what the hourly and daily people actually worked
   — with real Kenyan statutory deductions (PAYE, SHIF, NSSF, Housing Levy).

   IT NOW MOVES MONEY, which it did not before. Disbursement was held back while the Daraja
   initiator credential was unavailable; that is resolved, so an approved run can be paid
   from this screen.

   THREE STEPS, AND THE SEPARATION IS THE POINT. Preview computes nothing permanent and can
   be run as often as you like. Creating a run freezes the figures. Approving posts the cost
   to finance and releases payslips. Paying is its own act, after approval, because approving
   is a judgement about whether the figures are right and paying is the irreversible one —
   collapsing them would make a mistaken approval a mistaken payment.

   Both of the last two ask before they act, and Pay asks harder. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Stat, DataTable, EmptyState, Modal, kes, exportCsv } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import {
  previewPayroll, createPayrollRun, fetchPayrollRuns, fetchPayrollRun,
  approvePayrollRun, voidPayrollRun,
  payPayrollRun, retryPayrollPayments, fetchPayrollPayments, fetchPayrollBankFile, markPayrollPaid,
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

/* ── Paying an approved run ───────────────────────────────────────────────────
   Approve and Pay are two buttons on purpose. Approving is a finance judgement about
   whether the figures are right; paying is the irreversible act. One button for both
   would make a mistaken approval a mistaken payment.

   TWO RAILS, because neither reaches everybody. M-Pesa staff are paid over Daraja B2C
   and confirmed by its result webhook — nothing on this screen can declare one of those
   paid, and the server refuses if you try. Bank staff, including everyone above the B2C
   per-transaction ceiling, come out in a file finance uploads and then marks off here.

   "Sent" is shown as its own state and never counted as settled. Money that has left
   without a confirmation is exactly the case where reporting it as paid produces a
   person who was told they were paid and was not. */

const PAY_TONE = {
  paid: 'ok', sent: 'blue', pending: 'blue',
  awaiting_bank: 'amber', failed: 'red', unpayable: 'red',
};
const PAY_LABEL = {
  paid: 'Paid', sent: 'Sent — awaiting confirmation', pending: 'Starting',
  awaiting_bank: 'On the bank file', failed: 'Failed', unpayable: 'Cannot pay',
};

/** Browser-side download of the bank instruction file. The server returns the CSV rather
 *  than a link, so nothing lands in Storage that would then need its own access rule. */
function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function PaymentsPanel({ runId, run, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);   // 'pay' | 'retry' | 'bank' | uid
  const dialogs = useDialogs();

  const load = useCallback(async () => {
    try { setData(await fetchPayrollPayments(runId)); setErr(null); }
    catch (e) { setErr(e.message || 'Could not load payments.'); }
  }, [runId]);
  useEffect(() => { load(); }, [load]);

  const r = data?.rollup;
  const started = !!(data?.payments || []).length;

  const pay = async () => {
    const t = run.totals || {};
    const ok = await dialogs.confirm({
      title: `Pay ${monthLabel(run.period)}?`,
      body: `This sends ${kes(t.net || 0)} to ${t.headcount || 0} people. Anyone on M-Pesa is paid immediately `
        + 'and cannot be recalled; anyone on bank transfer goes onto a file for you to upload. '
        + 'Each payslip is paid at most once, so a repeat of this action is safe.',
      confirmLabel: 'Pay salaries',
      confirmPhrase: 'PAY',
    });
    if (!ok) return;
    setBusy('pay');
    try {
      const res = await payPayrollRun(runId);
      await load(); onChanged?.();
      const f = (res.rollup || {});
      dialogs.toast?.({
        title: `${f.sent || 0} sent, ${f.awaitingBank || 0} on the bank file`
          + (f.failed || f.unpayable ? `, ${(f.failed || 0) + (f.unpayable || 0)} need attention` : ''),
      });
    } catch (e) {
      dialogs.toast?.({ title: e.message || 'Could not start the payment run.', tone: 'error' });
    } finally { setBusy(null); }
  };

  const retry = async (uid) => {
    setBusy(uid || 'retry');
    try { await retryPayrollPayments(runId, uid); await load(); onChanged?.(); }
    catch (e) { dialogs.toast?.({ title: e.message || 'Could not retry.', tone: 'error' }); }
    finally { setBusy(null); }
  };

  const bankFile = async () => {
    setBusy('bank');
    try {
      const f = await fetchPayrollBankFile(runId);
      if (!f.count) { dialogs.toast?.({ title: 'Nobody on this run is paid by bank transfer.' }); return; }
      downloadCsv(f.filename, f.csv);
    } catch (e) {
      dialogs.toast?.({ title: e.message || 'Could not build the bank file.', tone: 'error' });
    } finally { setBusy(null); }
  };

  const confirmBank = async (row) => {
    const reference = await dialogs.prompt({
      title: `Confirm ${row.name || 'this transfer'} was paid`,
      body: `Enter the bank's reference for the ${kes(row.amount)} transfer. It is required — "paid" `
        + 'with nothing to point at is a claim rather than a record, and it is the line an auditor asks about.',
      confirmLabel: 'Mark paid',
    });
    if (!reference) return;
    setBusy(row.uid);
    try { await markPayrollPaid({ id: runId, uid: row.uid, reference }); await load(); onChanged?.(); }
    catch (e) { dialogs.toast?.({ title: e.message || 'Could not mark that paid.', tone: 'error' }); }
    finally { setBusy(null); }
  };

  if (run.status !== 'approved') return null;

  const columns = [
    { key: 'name', header: 'Employee', sort: true, render: (row) => (
      <div>
        <div className="font-semibold t1">{row.name || row.uid}</div>
        <div className="text-xs t3">{row.destinationLabel || 'No destination'}</div>
      </div>
    ) },
    { key: 'amount', header: 'Net pay', sort: true, render: (row) => kes(row.amount) },
    { key: 'status', header: 'Status', render: (row) => (
      <div>
        <Pill tone={PAY_TONE[row.status] || 'blue'}>{PAY_LABEL[row.status] || row.status}</Pill>
        {row.reason && <div className="text-xs t3 mt-1" style={{ maxWidth: 320 }}>{row.reason}</div>}
      </div>
    ) },
    { key: 'receipt', header: 'Reference', render: (row) => (
      <span className="num text-xs t3">{row.receipt || '—'}</span>
    ) },
    { key: 'act', header: '', render: (row) => (
      <div className="flex gap-1 justify-end">
        {row.status === 'awaiting_bank' && (
          <Btn kind="ghost" size="sm" icon="check" disabled={busy === row.uid} onClick={() => confirmBank(row)}>Mark paid</Btn>
        )}
        {['failed', 'unpayable'].includes(row.status) && (
          <Btn kind="ghost" size="sm" icon="rotate-right" disabled={busy === row.uid} onClick={() => retry(row.uid)}>Retry</Btn>
        )}
      </div>
    ) },
  ];

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold t1"><Icon name="money-bill-transfer" /> Payment</div>
          <div className="text-xs t3">
            {started
              ? 'M-Pesa is confirmed by Safaricom; bank transfers are confirmed here once you have uploaded the file.'
              : 'Nothing has been sent yet for this run.'}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn kind="ghost" size="sm" icon="file-csv" onClick={bankFile} disabled={busy === 'bank'}>Bank file</Btn>
          {!!r?.failed && (
            <Btn kind="ghost" size="sm" icon="rotate-right" onClick={() => retry()} disabled={busy === 'retry'}>
              Retry {r.failed} failed
            </Btn>
          )}
          <Btn kind="primary" size="sm" icon="paper-plane" onClick={pay} disabled={busy === 'pay' || r?.complete}>
            {busy === 'pay' ? 'Paying…' : started ? 'Pay the rest' : 'Pay salaries'}
          </Btn>
        </div>
      </div>

      {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}

      {r && started && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Settled" value={kes(r.settledAmount)} icon="circle-check" tone="green"
            sub={`${r.paid} of ${r.total} confirmed`} />
          {/* Its own tile, never folded into settled. */}
          <Stat label="In flight" value={kes(r.inFlightAmount)} icon="paper-plane" tone="blue"
            sub={`${r.sent} sent, awaiting M-Pesa`} />
          <Stat label="On the bank file" value={r.awaitingBank} icon="building-columns"
            tone={r.awaitingBank ? 'amber' : 'pri'} sub="Upload, then mark paid" />
          <Stat label="Need attention" value={r.needsAttention} icon="triangle-exclamation"
            tone={r.needsAttention ? 'red' : 'green'} sub={`${r.failed} failed, ${r.unpayable} unpayable`} />
        </div>
      )}

      {started
        ? <DataTable columns={columns} rows={data.payments} keyField="uid" minWidth={680} />
        : (
          <div className="text-xs t3">
            Paying sends each person their net pay. Staff with an M-Pesa number are paid over Daraja;
            anyone on bank transfer — including any salary above the M-Pesa per-transaction ceiling —
            appears in the bank file instead.
          </div>
        )}
    </Card>
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
        + 'The figures freeze at that point. It does NOT pay anyone — paying is a separate step once the run is approved.',
      confirmLabel: 'Approve run',
    });
    if (!ok) return;
    setBusy(true);
    try { await approvePayrollRun(id); await load(); onChanged?.(); dialogs.toast?.({ title: 'Payroll approved and posted to finance.' }); }
    catch (e) { dialogs.toast?.({ title: e.message || 'Could not approve.', tone: 'error' }); }
    finally { setBusy(false); }
  };

  /* Voiding says a run should be read as though it never happened, so the dialog has to
     say plainly what that claim does NOT undo — a posted finance entry, and above all any
     salary already sent. The server refuses the money case unless it is acknowledged; this
     asks for that acknowledgement rather than letting the refusal arrive as an error. */
  const doVoid = async () => {
    const pay = run.payment || {};
    const moved = (pay.paid || 0) + (pay.sent || 0);

    const body = moved
      ? `${moved} payment${moved === 1 ? '' : 's'} have already left for this run `
        + `(${pay.paid || 0} confirmed, ${pay.sent || 0} awaiting confirmation). `
        + 'Voiding does NOT recall them — the money stays gone and the run will record that it went. '
        + 'Recover it separately. Say why this is being voided.'
      : run.financeEntryId
        ? 'This run has already posted to finance. Voiding it here does NOT reverse that entry — that is a deliberate finance correction, not a side effect. Say why.'
        : 'Say why this run is being voided.';

    const reason = await dialogs.prompt({
      title: moved ? 'Void a run that has already paid people' : 'Void this payroll run',
      body,
      tone: moved ? 'danger' : undefined,
      confirmPhrase: moved ? 'PAID' : 'VOID',
    });
    if (!reason) return;
    setBusy(true);
    try {
      const r = await voidPayrollRun(id, reason, moved > 0);
      await load(); onChanged?.();
      if (r?.paidAlready || r?.sentAlready) {
        dialogs.toast?.({
          title: 'Voided — money had already gone out',
          body: `${r.paidAlready} confirmed and ${r.sentAlready} in flight. Recovering it is a separate job.`,
          tone: 'info',
        });
      }
    } catch (e) { dialogs.toast?.({ title: e.message || 'Could not void.', tone: 'error' }); }
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

      <PaymentsPanel runId={id} run={run} onChanged={() => { load(); onChanged?.(); }} />

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
          <b className="t1">Computing, approving and paying are three separate steps.</b> A run works out what each
          person is owed and posts the cost to Finance; nobody is paid until you open an approved run and pay it.
          Staff on M-Pesa are paid over Daraja; anyone on bank transfer comes out in a file you upload.
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
