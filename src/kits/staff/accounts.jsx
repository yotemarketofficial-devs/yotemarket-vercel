/* accounts.jsx — Staff portal: the full account directory. Every user across the
   platform (shoppers, merchants, riders, staff/admins) with role, verification and
   provider. Search + role filter; row click opens the per-user console drawer.
   Admin-only. (The old sandbox "credit test balance" action was removed — it minted
   fake withdrawable money; reverse any it issued in Admin › Maintenance.) */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Avatar, Icon, DataTable, EmptyState, exportCsv, Modal, kes } from './ui.jsx';
import { staffListUsers } from '../../lib/firebase.js';
import { fetchUserDetail, setUserDisabled, addStaffNote, setStaffRole, setUserRole, sendPasswordReset, revokeUserSessions, deleteUserAccount, sendVerificationEmails } from './service.js';
import { useDialogs } from './dialogs.jsx';
import { toMillis, fmtDay } from '../../lib/dates.js';
import { needsVerification, chunk, tally, describeTally, tallyIsError, describeCallError, refusedBeforeSending } from '../../lib/verify-emails.js';
import { MessageButton } from './comms.jsx';
const { useState, useEffect, useCallback, useRef, useSyncExternalStore } = React;

const ROLE_TONE = { admin:'red', staff:'amber', merchant:'blue', rider:'ok', shopper:'ok' };
// 'unverified' is not a role: it is the accounts the verification button would email
// (an address, not verified, not disabled — see lib/verify-emails.js).
const FILTERS = [['all','All'],['merchant','Merchants'],['shopper','Shoppers'],['rider','Riders'],['staff','Staff'],['unverified','Unverified']];
const inFilter = (u, f) => f === 'all' || (f === 'unverified' ? needsVerification(u) : u.roles.includes(f));
// Auth sends `created` as an RFC-1123 string ("Tue, 06 Oct 2026 13:00:00 GMT"), which the
// table would sort as TEXT — by weekday name. Dates go through lib/dates.js for both the
// sort key and the cell.
const fmtDate = fmtDay;

/* The bulk verification run lives OUTSIDE the component. The staff shell mounts one
   screen at a time, so leaving Accounts mid-run unmounted it: the summary — failures
   included — was lost, and coming back offered the button again while the first run was
   still sending. This store keeps progress and the last summary until the next run. */
const verifyRun = { state: { running: false, done: 0, total: 0, summary: null }, subs: new Set() };
const setVerifyRun = (patch) => { verifyRun.state = { ...verifyRun.state, ...patch }; verifyRun.subs.forEach((f) => f()); };
const subscribeVerifyRun = (f) => { verifyRun.subs.add(f); return () => verifyRun.subs.delete(f); };
const useVerifyRun = () => useSyncExternalStore(subscribeVerifyRun, () => verifyRun.state);

/* Send in requests of 25. The server hands back any it ran out of time for
   (`notAttempted`) and those go next. A request that fails outright stops the run: if the
   server refused it before touching anyone (not deployed, another admin's run, no
   permission) its accounts are "not attempted"; otherwise nobody can say whether they
   were emailed, and the summary says exactly that rather than guessing. */
async function runVerification(uids) {
  if (verifyRun.state.running) return;
  setVerifyRun({ running: true, done: 0, total: uids.length, summary: null });
  const results = [];
  const queue = chunk(uids);
  let lost = 0;
  let stopped = '';
  while (queue.length) {
    const batch = queue.shift();
    try {
      // The run lease is per call. If it's held for a moment (a single send from a
      // drawer, a call just finishing) wait and retry rather than abandoning the run.
      let r;
      for (let attempt = 0; ; attempt++) {
        try { r = await sendVerificationEmails(batch); break; } catch (e) {
          if (!/aborted/.test(String((e && e.code) || '')) || attempt >= 3) throw e;
          await new Promise((res) => setTimeout(res, 5000));
        }
      }
      results.push(...((r && r.results) || []));
      const back = (r && Array.isArray(r.notAttempted)) ? r.notAttempted : [];
      if (back.length) queue.unshift(...chunk(back));
    } catch (e) {
      stopped = describeCallError(e);
      if (refusedBeforeSending(e)) queue.unshift(batch); else lost += batch.length;
      break;
    }
    setVerifyRun({ done: results.length + lost });
  }
  const notAttempted = queue.reduce((a, b) => a + b.length, 0);
  const t = tally(results, { lost, notAttempted });
  setVerifyRun({ running: false, summary: {
    ok: !stopped && !tallyIsError(t),
    text: [stopped, describeTally(t)].filter(Boolean).join(' '),
    // The directory is stale if the server found accounts that changed since it loaded.
    refresh: Boolean(t.verified || t.other),
  } });
}

export function Accounts(){
  const { confirm } = useDialogs();
  const [users, setUsers] = useState([]);
  const run = useVerifyRun();
  const [truncated, setTruncated] = useState(false);
  const [source, setSource] = useState('auth');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [consoleU, setConsoleU] = useState(null);   // user open in the console drawer

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await staffListUsers();
      const src = r.source || 'auth';
      setUsers(r.users || []); setSource(src); setTruncated(Boolean(r.truncated));
      // The Firestore fallback has no Auth data: "unverified" is unknown there, not zero.
      if (src !== 'auth') setFilter((f) => (f === 'unverified' ? 'all' : f));
    }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load accounts.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ql = q.trim().toLowerCase();
  const rows = users.filter(u =>
    inFilter(u, filter) &&
    (!ql || (u.email||'').toLowerCase().includes(ql) || (u.name||'').toLowerCase().includes(ql) || (u.uid||'').toLowerCase().includes(ql)));
  const count = (f) => users.filter((u) => inFilter(u, f)).length;
  const filters = source === 'auth' ? FILTERS : FILTERS.filter(([k]) => k !== 'unverified');

  // Reload once a run that found stale rows finishes — but not for a summary that was
  // already showing when this screen mounted (the mount load covers that).
  const seenSummary = useRef(run.summary);
  useEffect(() => {
    if (run.summary && run.summary !== seenSummary.current) {
      seenSummary.current = run.summary;
      if (run.summary.refresh) load();
    }
  }, [run.summary, load]);

  /* Email every unverified account a fresh "confirm your email". The list only decides
     whom to ASK about — the server re-checks each account against Auth and skips anyone
     verified, disabled, address-less, new, or already sent one in the last 24 hours. */
  const unverified = source === 'auth' ? users.filter(needsVerification) : [];
  const sendAllVerification = async () => {
    const list = unverified.map((u) => u.uid);
    if (!list.length || run.running) return;
    const ok = await confirm({
      title: `Email ${list.length} account${list.length === 1 ? '' : 's'} a link to confirm their address?`,
      icon: 'envelope-circle-check',
      body: 'Each gets the same “Confirm your email” message YoteMarket sends at sign-up. The server checks every account first and skips anyone verified, disabled, signed up in the last day, or sent one through YoteMarket in the last 24 hours.',
      facts: [
        { label: 'Accounts', value: list.length.toLocaleString() },
        { label: 'Sent as', value: 'YoteMarket’s branded verification email' },
        truncated && { label: 'Covers', value: `Only the first ${users.length.toLocaleString()} accounts listed here` },
      ],
      ...(list.length > 1 ? { confirmPhrase: 'SEND' } : {}),
      confirmLabel: 'Send', confirmIcon: 'paper-plane',
    });
    if (!ok) return;
    setMsg(null);
    runVerification(list);
  };

  const columns = [
    { key:'user', header:'User', sortValue:(u)=>(u.name||u.email||'').toLowerCase(), csvValue:(u)=> u.name || (u.email||'').split('@')[0] || u.uid,
      render:(u)=>(
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={u.name || u.email || '?'} size={34} />
          <div className="min-w-0">
            <div className="font-semibold t1 truncate flex items-center gap-2">{u.name || (u.email||'').split('@')[0] || 'User'}{u.disabled && <Pill tone="red">disabled</Pill>}{!u.verified && <span className="text-xs t3 font-normal">unverified</span>}</div>
            <div className="text-xs t3 truncate">{u.email || 'no email'}</div>
          </div>
        </div>) },
    { key:'roles', header:'Roles', csvValue:(u)=>(u.roles||[]).join(' '), render:(u)=>(<div className="flex gap-1 flex-wrap">{u.roles.map(r => <Pill key={r} tone={ROLE_TONE[r]||'ok'}>{r}</Pill>)}</div>) },
    { key:'provider', header:'Provider', sort:true, render:(u)=><span className="t2">{u.provider}</span> },
    { key:'created', header:'Joined', sortValue:(u)=>toMillis(u.created), csvValue:(u)=>fmtDate(u.created), render:(u)=><span className="t3">{fmtDate(u.created)}</span> },
  ];

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="address-book" title="Accounts" sub={truncated ? `The first ${users.length.toLocaleString()} user accounts — the platform has more` : `${users.length} user account${users.length!==1?'s':''} across the platform`}
        action={<div className="flex items-center gap-2">
          {source === 'auth' && (
            <Btn kind="soft" size="md" icon={run.running ? 'spinner' : 'envelope-circle-check'} onClick={sendAllVerification}
              disabled={loading || run.running || !unverified.length}
              title={run.running ? 'A send is already running'
                : truncated ? `Covers only the first ${users.length.toLocaleString()} accounts listed — Auth has more`
                : unverified.length ? 'Email every unverified account a link to confirm their address' : 'Every listed account with an email address is verified'}>
              {run.running ? `Sending… ${run.done}/${run.total}` : `Send verification emails (${unverified.length})`}
            </Btn>
          )}
          <Btn kind="ghost" size="md" icon="file-arrow-down" onClick={()=>exportCsv(`accounts-${new Date().toISOString().slice(0,10)}`, columns, rows)} disabled={!rows.length}>Export</Btn>
          <Btn kind="soft" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Btn>
        </div>} />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}
      {run.summary && !run.running && (
        <div className="text-sm flex items-start gap-2" style={{ color: run.summary.ok ? 'var(--green)' : 'var(--red)' }}>
          <Icon name={run.summary.ok ? 'envelope-circle-check' : 'circle-exclamation'} className="mt-0.5" /><span>{run.summary.text}</span>
        </div>
      )}
      {!loading && truncated && <div className="text-xs flex items-center gap-2" style={{ background:'var(--amber-bg)', color:'var(--amber)', padding:'8px 12px', borderRadius:10 }}><Icon name="triangle-exclamation" />Auth has more accounts than the 5,000 listed here. The Unverified count and “Send verification emails” cover only these.</div>}
      {!loading && source === 'firestore' && <div className="text-xs t3 flex items-center gap-2" style={{ background:'var(--amber-bg)', color:'var(--amber)', padding:'8px 12px', borderRadius:10 }}><Icon name="triangle-exclamation" />Limited directory — the functions service account can't list Auth users, so this is built from Firestore (merchants, riders, staff, profiles). Grant it the "Firebase Authentication Admin" role for the full list + email lookups.</div>}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth:220, maxWidth:420 }}>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by email, name or uid…" className="ym-input pl-9" style={{ width:'100%' }} />
        </div>
        <div className="inline-flex rounded-lg p-1 flex-wrap gap-1" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>
          {filters.map(([k,l]) => (
            <button key={k} onClick={()=>setFilter(k)} className="px-3 py-1.5 rounded-md text-sm font-semibold transition"
              style={filter===k?{ background:'var(--surface)', color:'var(--pri)', boxShadow:'var(--shadow)' }:{ color:'var(--t3)' }}>{l} <span className="num t3">{count(k)}</span></button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="text-sm t3 py-10 text-center"><Icon name="spinner" className="mr-2" />Loading accounts…</div>
          : <DataTable columns={columns} rows={rows} keyField="uid" pageSize={40} minWidth={720}
              initialSort={{ key:'created', dir:'desc' }} onRowClick={setConsoleU}
              empty={<EmptyState icon="user" title="No accounts match." sub="Try a different search or role filter." />} />}
      </Card>
      {consoleU && <UserConsole row={consoleU} onClose={()=>setConsoleU(null)} onChanged={load} />}
    </div>
  );
}

const ROLE_TONE_U = { admin:'red', staff:'amber', merchant:'blue', rider:'ok', shopper:'ok' };
const OSTATUS_TONE = { delivered:'ok', paid:'ok', cancelled:'red', placed:'amber' };
const uFmt = fmtDay;

function UTile({ label, value, sub, tone='pri' }){
  const c = { pri:'var(--pri)', green:'var(--green)', blue:'var(--blue)', amber:'var(--amber)', red:'var(--red)' }[tone];
  return <div className="rounded-xl p-3" style={{ background:'var(--surface2)' }}><div className="text-lg font-bold num" style={{ color:c }}>{value}</div><div className="text-xs t1 font-semibold">{label}</div>{sub && <div className="text-[11px] t3">{sub}</div>}</div>;
}

/* Per-user admin console — dossier + actions (disable/enable, role, note, credit). */
function UserConsole({ row, onClose, onChanged }){
  const { confirm, toast } = useDialogs();
  const uid = row.uid;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');
  const [key, setKey] = useState(0);
  useEffect(() => {
    let alive = true; setErr('');
    fetchUserDetail(uid).then((r)=>{ if (alive) setD(r); }).catch((e)=>{ if (alive) setErr(e.message || 'Could not load this account.'); });
    return () => { alive = false; };
  }, [uid, key]);
  const reload = () => setKey((k)=>k+1);

  const p = (d && d.profile) || {}; const auth = (d && d.auth) || {}; const st = (d && d.stats) || {};
  const roles = (d && d.roles) || row.roles || [];
  const disabled = auth && auth.disabled;

  const toggleDisable = async () => {
    const next = !disabled;
    if (!await confirm({
      title: next ? `Disable ${p.email || uid}?` : `Re-enable ${p.email || uid}?`,
      tone: next ? 'danger' : undefined, icon: next ? 'user-slash' : 'user-check',
      body: next ? "They won't be able to sign in until re-enabled. Their data is untouched." : 'They can sign in again immediately.',
      confirmLabel: next ? 'Disable' : 'Re-enable',
    })) return;
    setBusy('disable');
    try { await setUserDisabled(uid, next); reload(); onChanged && onChanged(); }
    catch (e) { toast({ tone:'error', title: e.message || 'Action failed.' }); }
    finally { setBusy(null); }
  };
  const changeRole = async (role) => {
    if (!p.email) { toast({ tone:'error', title: 'This account has no email on record — role changes are by email.' }); return; }
    const label = role === 'none' ? 'revoke staff access from' : `make ${p.email} a${role==='admin'?'n admin':' moderator'}`;
    if (!await confirm({
      title: role === 'none' ? `Revoke staff access from ${p.email}?` : `Grant ${p.email} ${role} access?`,
      tone: role === 'none' ? 'danger' : undefined, icon:'user-gear',
      body: role === 'none'
        ? 'They lose the staff console immediately. Their user account stays.'
        : 'Department access is set separately in People › Access & roles.',
      confirmLabel: role === 'none' ? 'Revoke' : 'Grant access',
    })) return;
    setBusy('role');
    try { await setStaffRole(p.email, role); reload(); onChanged && onChanged(); }
    catch (e) { toast({ tone:'error', title: e.message || 'Role change failed.' }); }
    finally { setBusy(null); }
  };
  // Remedy for a wrong role: reset to a plain shopper (strips merchant/rider identity).
  // The backend refuses while a live store exists — close it first.
  const resetToShopper = async () => {
    if (!await confirm({ title: `Reset ${p.email || uid} to a plain shopper? This removes their merchant/rider identity. Any store must already be closed.` })) return;
    setBusy('shopper');
    try { await setUserRole(uid, 'shopper'); reload(); onChanged && onChanged(); }
    catch (e) { toast({ tone:'error', title: e.message || 'Could not reset role.' }); }
    finally { setBusy(null); }
  };
  const addNote = async () => {
    const t = note.trim(); if (!t) return;
    setBusy('note');
    try { await addStaffNote('user', uid, t); setNote(''); reload(); }
    catch (e) { toast({ tone:'error', title: e.message || 'Could not add note.' }); }
    finally { setBusy(null); }
  };
  /* Reset password used to fire on one click, with no confirmation, and put a raw
     firebaseapp.com action link on the agent's clipboard (behind a red "error" toast)
     for them to paste into a personal email — a stranger's address sending a bare
     auth link, which is exactly what phishing looks like and what the branded auth
     email exists to avoid. It now asks first, and asks the SERVER to send the same
     branded reset email the self-service flow sends. Only if the server can't send
     does the link come back, and then the toast says plainly what to do with it. */
  const resetPassword = async () => {
    const who = p.email || row.email || 'this account';
    if (!await confirm({
      title: `Email ${who} a password-reset link?`, icon: 'key',
      body: 'It comes from YoteMarket, like the reset email they would get by asking for one themselves. Their current password keeps working until they choose a new one.',
      confirmLabel: 'Send reset email', confirmIcon: 'paper-plane',
    })) return;
    setBusy('reset');
    try {
      const r = await sendPasswordReset(uid, { send: true });
      const email = (r && r.email) || who;
      if (r && r.sent) {
        toast({ tone:'ok', title: `Reset email sent to ${email}.` });
      } else if (r && r.link) {
        if (navigator.clipboard) await navigator.clipboard.writeText(r.link).catch(()=>{});
        toast({ tone:'info', title: `The server didn’t send it${r.sendError ? ` (${r.sendError})` : ''}. A reset link for ${email} is on your clipboard.`,
          body: 'Send it from the support mailbox, not a personal address — a bare sign-in link from an unknown sender reads as phishing and gets ignored.' });
      } else {
        toast({ tone:'error', title: 'The server answered without sending an email or returning a link.' });
      }
    } catch (e) { toast({ tone:'error', title: e.message || 'Could not send a reset email.' }); }
    finally { setBusy(null); }
  };
  const forceSignOut = async () => {
    if (!await confirm({ title: `Sign ${p.email || uid} out of all devices? They'll have to sign in again.` })) return;
    setBusy('revoke');
    try { await revokeUserSessions(uid); toast({ tone:'error', title: 'Done — the user has been signed out of all sessions.' }); }
    catch (e) { toast({ tone:'error', title: e.message || 'Could not sign the user out.' }); }
    finally { setBusy(null); }
  };
  // Right to erasure. The server refuses if it would destroy money, an in-flight
  // order, a live store or the staff trail — each of those has its own flow.
  const eraseAccount = async () => {
    const who = p.email || uid;
    if (!await confirm({ title: `Permanently DELETE ${who}?\n\nThis removes their sign-in and all personal data (profile, addresses, follows, wallet history). Their past orders stay as financial records. This cannot be undone.` })) return;
    if (!await confirm({ title: `Last check — really delete ${who}?` })) return;
    setBusy('delete');
    try { await deleteUserAccount(uid); toast({ tone:'error', title: `${who} has been deleted.` }); onChanged && onChanged(); onClose(); }
    catch (e) { toast({ tone:'error', title: e.message || 'Could not delete the account.' }); setBusy(null); }
  };

  // One account's own "send verification email". Same callable as the bulk button, so
  // the same server-side checks; the toast says what the server actually did.
  const canVerify = !auth.error && auth.verified === false && !!auth.email && !disabled;
  const runningAll = useVerifyRun().running;   // the server runs one send at a time
  const sendVerification = async () => {
    const who = auth.email || p.email || uid;
    if (!await confirm({ title: `Email ${who} a link to confirm their address?`, icon: 'envelope-circle-check',
      body: 'The same “Confirm your email” message YoteMarket sends at sign-up.', confirmLabel: 'Send', confirmIcon: 'paper-plane' })) return;
    setBusy('verify');
    try {
      const r = await sendVerificationEmails([uid]);
      const out = (r && r.results && r.results[0]) || {};
      const why = out.error ? ` (${out.error})` : '';
      switch (out.outcome) {
        case 'sent': toast({ tone:'ok', title:`Verification email sent to ${who}.` }); break;
        case 'recently_sent': toast({ tone:'info', title:`Not sent — ${who} was sent one in the last 24 hours.` }); break;
        case 'recently_requested': toast({ tone:'info', title:`Not sent — ${who} asked for one themselves in the last 24 hours.` }); break;
        case 'recently_unconfirmed': toast({ tone:'info', title:`Not sent — a send to ${who} in the last 24 hours couldn’t be confirmed, so it won’t be repeated until a day has passed.` }); break;
        case 'new_account': toast({ tone:'info', title:`Not sent — ${who} signed up in the last day, so their sign-up email is still fresh.` }); break;
        case 'in_progress': toast({ tone:'info', title:`Not sent — a send to ${who} is still in progress. Try again in a few minutes.` }); break;
        case 'unknown': toast({ tone:'info', title:`Couldn’t confirm the email went${why} — it may have. ${who} won’t be emailed again for 24 hours.` }); break;
        case 'failed': toast({ tone:'error', title:`The email didn’t go${out.error ? `: ${out.error}` : '.'}` }); break;
        case 'already_verified':
          toast({ tone:'ok', title:`${who} has already verified their address.` });
          reload(); onChanged && onChanged();   // the directory row still says unverified
          break;
        default:   // disabled | no_email | not_found — the account changed under us
          toast({ tone:'info', title:`Not sent (${String(out.outcome || 'no answer').replace(/_/g, ' ')}).` });
          reload(); onChanged && onChanged();
      }
    } catch (e) { toast({ tone:'error', title: describeCallError(e) }); }
    finally { setBusy(null); }
  };

  const isStaff = roles.includes('admin') || roles.includes('staff');
  return (
    <Modal title={p.name || row.name || (p.email||'').split('@')[0] || 'User'} subtitle={p.email || row.email || uid} icon="user" onClose={onClose} maxWidth={820}
      footer={
        <div className="flex items-center gap-2 flex-wrap w-full">
          {d && <>
            <Btn kind={disabled?'success':'danger'} size="sm" icon={disabled?'unlock':'ban'} onClick={toggleDisable} disabled={busy==='disable'}>{disabled?'Enable sign-in':'Disable'}</Btn>
            {canVerify && <Btn kind="soft" size="sm" icon={busy==='verify'?'spinner':'envelope-circle-check'} onClick={sendVerification} disabled={busy==='verify' || runningAll}
              title={runningAll ? 'Wait for the bulk send to finish — one send runs at a time' : 'Email them a fresh link to confirm their address'}>Send verification email</Btn>}
            <Btn kind="soft" size="sm" icon={busy==='reset'?'spinner':'key'} onClick={resetPassword} disabled={busy==='reset'}>Reset password</Btn>
            <Btn kind="soft" size="sm" icon={busy==='revoke'?'spinner':'right-from-bracket'} onClick={forceSignOut} disabled={busy==='revoke'} title="Revoke all sessions">Sign out</Btn>
            {!isStaff && <Btn kind="soft" size="sm" icon="user-shield" onClick={()=>changeRole('moderator')} disabled={busy==='role'}>Make staff</Btn>}
            {isStaff && !roles.includes('admin') && <Btn kind="soft" size="sm" icon="crown" onClick={()=>changeRole('admin')} disabled={busy==='role'}>Make admin</Btn>}
            {isStaff && <Btn kind="ghost" size="sm" icon="user-slash" onClick={()=>changeRole('none')} disabled={busy==='role'}>Revoke staff</Btn>}
            {(roles.includes('merchant') || roles.includes('rider')) && <Btn kind="soft" size="sm" icon={busy==='shopper'?'spinner':'user-tag'} onClick={resetToShopper} disabled={busy==='shopper'} title="Fix a wrong role — reset to a plain shopper">Reset to shopper</Btn>}
            <Btn kind="danger" size="sm" icon={busy==='delete'?'spinner':'trash'} onClick={eraseAccount} disabled={busy==='delete'} className="ml-auto" title="Permanently delete this account and its personal data">Delete account</Btn>
            <MessageButton person={{ uid, name: p.name, email: p.email, roles }} kind="ghost" className="ml-auto" />
          </>}
        </div>
      }>
      {!d && !err && <div className="py-10 text-center t3"><Icon name="spinner" className="mr-2"/>Loading account…</div>}
      {err && <EmptyState icon="triangle-exclamation" tone="red" title="Couldn't load this account" sub={err} />}
      {d && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {roles.map((r)=><Pill key={r} tone={ROLE_TONE_U[r]||'ok'}>{r}</Pill>)}
            {disabled && <Pill tone="red">disabled</Pill>}
            {auth.error && <span className="text-xs t3">· auth details unavailable</span>}
            {!auth.error && auth.provider && <span className="text-xs t3">· {auth.provider}{auth.verified?' · verified':' · unverified'}</span>}
            {p.createdAt && <span className="text-xs t3">· joined {uFmt(p.createdAt)}</span>}
            {auth.lastSignIn && <span className="text-xs t3">· last seen {new Date(auth.lastSignIn).toLocaleDateString('en-KE')}</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <UTile label="Orders" value={st.orders||0} sub={`${st.paidOrders||0} paid`} tone="blue" />
            <UTile label="Spend" value={kes(st.spend||0)} tone="green" />
            <UTile label="Wallet" value={kes((d.wallet&&d.wallet.balance)||0)} tone="pri" />
            <UTile label="Points" value={p.points||0} tone="amber" />
          </div>

          {(d.store || d.subscription) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.store && <Card className="p-4"><div className="text-xs t3 font-semibold uppercase mb-1">Merchant</div><div className="font-bold t1 text-sm">{d.store.name||'Store'}</div><div className="text-xs t3 mt-1">Available {kes(d.store.balanceAvailable||0)}{d.store.status?` · ${d.store.status}`:''}</div></Card>}
              {d.subscription && <Card className="p-4"><div className="text-xs t3 font-semibold uppercase mb-1">Subscription</div><div className="font-bold t1 text-sm">{d.subscription.plan||'—'} {d.subscription.status==='active'?<Pill tone="ok">active</Pill>:<Pill tone="amber">{d.subscription.status}</Pill>}</div>{d.subscription.renewsAt&&<div className="text-xs t3 mt-1">renews {uFmt(d.subscription.renewsAt)}</div>}</Card>}
            </div>
          )}

          {d.recentOrders && d.recentOrders.length > 0 && (
            <div>
              <div className="font-bold t1 text-sm mb-2">Recent orders</div>
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--line)' }}>
                {d.recentOrders.map((o,i)=>(
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 text-sm" style={{ borderTop:i?'1px solid var(--line)':'none' }}>
                    <span className="num t3 text-xs" style={{ width:76 }}>{o.orderNo||('#'+String(o.id).slice(-6))}</span>
                    <Pill tone={OSTATUS_TONE[o.status]||'amber'}>{o.status}</Pill>
                    <span className="num font-semibold t1 flex-1" style={{ textAlign:'right' }}>{kes(o.total)}</span>
                    <span className="t3 text-xs hidden sm:block" style={{ width:66, textAlign:'right' }}>{o.at?uFmt(o.at):''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.tickets && d.tickets.length > 0 && (
            <div>
              <div className="font-bold t1 text-sm mb-2">Support tickets</div>
              <div className="space-y-1.5">
                {d.tickets.map((t)=>(
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="num t3 text-xs">{t.ref||''}</span>
                    <span className="flex-1 min-w-0 truncate t2">{t.subject}</span>
                    <Pill tone={t.status==='resolved'||t.status==='closed'?'ok':'amber'}>{t.status}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-bold t1 text-sm mb-2">Internal notes <span className="t3 font-normal">· staff only</span></div>
            <div className="flex items-center gap-2 mb-2">
              <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Add a note about this account…" className="ym-input flex-1" onKeyDown={(e)=>{ if(e.key==='Enter') addNote(); }} />
              <Btn kind="primary" size="sm" icon={busy==='note'?'spinner':'plus'} onClick={addNote} disabled={busy==='note' || !note.trim()}>Add</Btn>
            </div>
            {d.notes && d.notes.length ? (
              <div className="space-y-2">
                {d.notes.map((n)=>(
                  <div key={n.id} className="text-sm rounded-lg p-2.5" style={{ background:'var(--surface2)' }}>
                    <div className="t1">{n.text}</div><div className="text-[11px] t3 mt-1">{n.author} · {n.at?new Date(n.at).toLocaleString('en-KE'):''}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs t3">No notes yet.</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}
