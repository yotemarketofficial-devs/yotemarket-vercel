/* comms.jsx — Staff console: talking TO people.

   Support could only ever ANSWER: a shopper had to open a ticket before staff
   could say anything, and merchants, riders and marketers couldn't be reached at
   all. Two channels close that gap, both landing somewhere the recipient already
   looks rather than in a new inbox nobody checks:

   • Outreach — a real two-way thread. It's stored as a support ticket, so the
     recipient finds it in Help Center → My requests and can REPLY, and staff
     answer it with the existing Support reply flow. One inbox, not two.
   • Broadcasts — a one-way announcement to a whole audience, delivered as a
     durable in-app notification (the bell reads these live) plus a push.

   On phone numbers: signing in with Google does NOT give us one. Firebase Auth
   only fills `phoneNumber` for SMS sign-in, and Google's phone scope needs extra
   consent plus app review and is still empty for most people. So the contact card
   shows the numbers people have actually given US — profile, M-Pesa, payout
   details — each labelled with where it came from. */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Icon, DataTable, Modal, EmptyState, BackendError } from './ui.jsx';
import {
  useStaffResource, fetchUsers, fetchContactCard, messageUser,
  sendBroadcast, fetchBroadcasts, fetchSupportTickets,
} from './service.js';
const { useState, useEffect, useMemo } = React;

const ROLE_TONE = { admin:'red', staff:'red', merchant:'pri', rider:'blue', shopper:'ok', marketer:'amber' };
const fmtWhen = (ms) => (ms ? new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '');
const fmtAgo = (ms) => { if (!ms) return ''; const s = Math.max(0, (Date.now() - ms) / 1000); if (s < 3600) return `${Math.round(s / 60)}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };

/* ══ Outreach: message one person ══════════════════════════════════════════ */
const OUTREACH_TEMPLATES = [
  { label:'Renewal reminder', subject:'Your YoteMarket plan is due for renewal',
    body:'Hi — your plan renews soon. Renewing keeps your bundled deliveries and your store live. You can pay from your dashboard via M-Pesa. Reply here if anything looks wrong and I’ll sort it.' },
  { label:'Verification needed', subject:'One more step to verify your store',
    body:'Hi — we’re reviewing your store and need a little more from you before we can verify it. Reply here and I’ll walk you through exactly what’s missing.' },
  { label:'Rider — badge lapsed', subject:'Your rider badge has lapsed',
    body:'Hi — your badge has lapsed, so runs won’t be offered to you until it’s renewed. You can renew it from the rider app. Reply here if you’re having trouble.' },
  { label:'Order follow-up', subject:'Following up on your recent order',
    body:'Hi — I’m following up on your recent order to make sure everything arrived as expected. Reply here if anything went wrong and I’ll put it right.' },
];

export function Outreach(){
  const { data: dir, live, error, demo, reload: reloadDir } = useStaffResource(fetchUsers, { users:[], total:0 }, [], { pollMs:0 });
  const { data: tix, reload: reloadTix } = useStaffResource(() => fetchSupportTickets(), { tickets:[], counts:{} });
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);

  const users = dir.users || [];
  // Threads WE started — the record of what outreach has gone out and who replied.
  const sent = (tix.tickets || []).filter((t) => t.source === 'staff');

  const ql = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (ql.length < 2) return [];
    return users
      .filter((u) => [u.name, u.email, u.uid, u.phone].some((x) => (x || '').toLowerCase().includes(ql)))
      .slice(0, 25);
  }, [users, ql]);

  return (<div className="fadeup space-y-6">
    <SectionHead icon="paper-plane" title="Message someone"
      sub={demo ? 'No backend configured' : (live ? `Reach any merchant, shopper, rider or marketer — ${users.length.toLocaleString()} accounts` : 'Loading the directory…')} />
    <BackendError error={error} onRetry={reloadDir} />

    <Card className="p-5">
      <label className="text-xs font-semibold t3 uppercase" style={{ letterSpacing:'.06em' }}>Who are you messaging?</label>
      <div className="relative mt-2">
        <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or account id…" className="ym-input pl-9" style={{ width:'100%' }} autoComplete="off" />
      </div>
      {ql.length >= 2 && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border:'1px solid var(--line)' }}>
          {matches.length === 0
            ? <div className="px-4 py-6 text-sm t3 text-center">No account matches “{q}”.</div>
            : matches.map((u, i) => (
              <button key={u.uid} onClick={() => { setPicked(u); setQ(''); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left"
                style={{ borderTop: i ? '1px solid var(--line)' : 'none', background:'none', border:'none', cursor:'pointer' }}>
                <Avatar name={u.name || u.email} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold t1 truncate">{u.name || u.email || u.uid}</span>
                  <span className="block text-xs t3 truncate">{u.email || u.uid}</span>
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">{(u.roles || []).map((r) => <Pill key={r} tone={ROLE_TONE[r] || 'ok'}>{r}</Pill>)}</span>
              </button>
            ))}
        </div>
      )}
      {ql.length === 1 && <div className="text-xs t3 mt-2">Keep typing — at least two characters.</div>}
    </Card>

    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="font-bold t1">Conversations we started</h3>
        <p className="text-xs t3">These live in Support alongside customer-raised tickets — replies land there.</p>
      </div>
      <DataTable minWidth={620} rows={sent} pageSize={10}
        empty={<EmptyState icon="paper-plane" title="No outreach yet." sub="Messages you send appear here with their reply status." />}
        columns={[
          { key:'subject', header:'Subject', render:(t) => (
            <span><span className="font-semibold t1">{t.subject}</span>
              <span className="block text-xs t3 num">{t.ref}</span></span>) },
          { key:'name', header:'To', render:(t) => (
            <span><span className="t1 text-sm">{t.name}</span>
              <span className="block text-xs t3 truncate">{t.email}</span></span>) },
          { key:'lastActor', header:'State', render:(t) => (t.lastActor === 'customer'
            ? <Pill tone="amber">Replied — needs an answer</Pill>
            : <Pill tone={t.status === 'resolved' || t.status === 'closed' ? 'ok' : 'blue'}>{t.status === 'resolved' ? 'Resolved' : t.status === 'closed' ? 'Closed' : 'Sent'}</Pill>) },
          { key:'updatedAt', header:'Last activity', align:'right', sortValue:(t) => t.updatedAt, render:(t) => <span className="text-xs t3">{fmtAgo(t.updatedAt || t.createdAt)}</span> },
        ]} />
    </Card>

    {picked && <ComposeDrawer user={picked} onClose={() => setPicked(null)} onSent={() => { setPicked(null); reloadTix(); }} live={live} />}
  </div>);
}

function ComposeDrawer({ user, onClose, onSent, live }){
  const [card, setCard] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('shopper');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    fetchContactCard(user.uid).then((c) => { if (alive) { setCard(c); if ((c.roles || []).includes('merchant')) setAudience('merchant'); } }).catch(() => {});
    return () => { alive = false; };
  }, [user.uid]);

  const send = async () => {
    setBusy(true); setErr('');
    try { await messageUser({ uid:user.uid, subject:subject.trim(), message:body.trim(), priority, audience }); onSent(); }
    catch (e) { setErr(live ? (e.message || 'Could not send the message.') : 'Connect the backend to send live messages.'); setBusy(false); }
  };

  const roles = (card && card.roles) || user.roles || [];
  const phones = (card && card.phones) || [];
  const reach = (card && card.reachable) || {};

  return (
    <Modal title={(card && card.profile.name) || user.name || user.email || 'Message'} subtitle={(card && card.profile.email) || user.email} icon="paper-plane" onClose={onClose} maxWidth={640}
      footer={
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs t3">{reach.push ? `Will push to ${reach.devices} device${reach.devices === 1 ? '' : 's'}` : 'No push devices — they’ll see it in the app'}</span>
          <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'paper-plane'} onClick={send} disabled={busy || !subject.trim() || body.trim().length < 2} className="ml-auto">Send message</Btn>
        </div>
      }>
      {/* Contact card — every number we legitimately hold, and where it came from. */}
      <div className="rounded-xl p-3 mb-4" style={{ background:'var(--surface2)' }}>
        <div className="flex items-center gap-3">
          <Avatar src={card && card.profile.photoUrl} name={(card && card.profile.name) || user.name} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">{roles.map((r) => <Pill key={r} tone={ROLE_TONE[r] || 'ok'}>{r}</Pill>)}</div>
            <div className="text-xs t3 mt-1 truncate">{(card && card.profile.provider) ? `${card.profile.provider} sign-in` : ''}{card && card.profile.lastSignIn ? ` · last seen ${new Date(card.profile.lastSignIn).toLocaleDateString('en-KE')}` : ''}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[11px] font-semibold t3 uppercase mb-1" style={{ letterSpacing:'.06em' }}>Phone numbers on record</div>
          {!card ? <div className="text-xs t3">Loading…</div>
            : phones.length === 0
              ? <div className="text-xs t3">None. Google sign-in doesn’t provide a phone number — we only hold one once someone gives it to us (profile, an M-Pesa payment, or payout details).</div>
              : <div className="flex flex-col gap-1">{phones.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <a href={`tel:${p.value.replace(/\s+/g, '')}`} className="num font-semibold" style={{ color:'var(--pri)' }}>{p.value}</a>
                  <span className="t3">· {p.source}{p.at ? ` · ${fmtWhen(p.at)}` : ''}</span>
                </div>
              ))}</div>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {OUTREACH_TEMPLATES.map((t) => (
          <button key={t.label} onClick={() => { setSubject(t.subject); setBody(t.body); }}
            className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>+ {t.label}</button>
        ))}
      </div>

      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="ym-input mb-2" style={{ width:'100%' }} maxLength={160} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000}
        placeholder="Write your message… They'll get a notification and can reply — the thread appears in Support."
        className="ym-input" style={{ resize:'vertical', width:'100%' }} />

      <div className="flex items-center gap-3 flex-wrap mt-3 text-xs">
        {roles.includes('merchant') && (<>
          <span className="t3 font-semibold">Send as</span>
          <Seg value={audience} onChange={setAudience} options={['shopper', 'merchant']} fmt={(o) => (o === 'merchant' ? 'Store business' : 'Personal')} />
        </>)}
        <span className="t3 font-semibold">Priority</span>
        <Seg value={priority} onChange={setPriority} options={['normal', 'high', 'urgent']} fmt={(o) => o[0].toUpperCase() + o.slice(1)} />
      </div>
      {roles.includes('merchant') && <div className="text-[11px] t3 mt-1.5">A store owner shops here too — “Store business” puts this in their dashboard bell, “Personal” in their storefront one.</div>}
      {err && <div className="text-sm mt-2 flex items-center gap-2" style={{ color:'var(--red)' }}><Icon name="circle-exclamation" />{err}</div>}
    </Modal>
  );
}

/* ══ Broadcasts: announce to a whole audience ══════════════════════════════ */
const AUDIENCES = [
  { key:'merchants', label:'Merchants', icon:'store', desc:'Everyone running a live store' },
  { key:'riders', label:'Riders', icon:'motorcycle', desc:'The delivery network' },
  { key:'shoppers', label:'Shoppers', icon:'bag-shopping', desc:'Accounts that aren’t merchants, riders or staff' },
  { key:'marketers', label:'Marketers', icon:'bullhorn', desc:'Active scouts' },
  { key:'all', label:'Everyone', icon:'users', desc:'Every account on the platform' },
];
const SEGMENTS = {
  merchants: [['all', 'All merchants'], ['subscribed', 'On an active plan'], ['lapsed', 'Lapsed / no plan']],
  riders: [['all', 'All riders'], ['active', 'Can claim work'], ['blocked', 'Blocked (badge/rating)']],
};

export function Broadcasts(){
  const { data: history, live, error, demo, reload } = useStaffResource(fetchBroadcasts, []);
  const [audience, setAudience] = useState('merchants');
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [count, setCount] = useState(null);   // dry-run recipient count
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const segments = SEGMENTS[audience] || null;
  // Re-count whenever the target changes — you should never be able to press send
  // without knowing how many people it reaches.
  useEffect(() => {
    let alive = true;
    setCount(null);
    if (!live) return undefined;
    sendBroadcast({ audience, filter, title:'count', body:'count', dryRun:true })
      .then((r) => { if (alive) setCount(r); })
      .catch(() => { if (alive) setCount(null); });
    return () => { alive = false; };
  }, [audience, filter, live]);

  const ready = title.trim() && body.trim().length >= 2;

  const doSend = async (testOnly) => {
    if (!testOnly) {
      const n = count && count.recipients;
      const ok = window.confirm(`Send “${title.trim()}” to ${n != null ? n.toLocaleString() : 'every matching'} recipient${n === 1 ? '' : 's'}?\n\nThis notifies them immediately and can't be recalled.`);
      if (!ok) return;
    }
    setBusy(true); setMsg(null);
    try {
      const r = await sendBroadcast({ audience, filter, title:title.trim(), body:body.trim(), testOnly });
      setMsg({ ok:true, text: testOnly
        ? 'Test sent to your own account — check your notifications.'
        : `Sent to ${r.delivered.toLocaleString()} recipient${r.delivered === 1 ? '' : 's'} (${r.pushed.toLocaleString()} push${r.pushed === 1 ? '' : 'es'} delivered).` });
      if (!testOnly) { setTitle(''); setBody(''); reload(); }
    } catch (e) { setMsg({ ok:false, text: live ? (e.message || 'Could not send.') : 'Connect the backend to send a live broadcast.' }); }
    finally { setBusy(false); }
  };

  const rows = Array.isArray(history) ? history : [];

  return (<div className="fadeup space-y-6">
    <SectionHead icon="bullhorn" title="Broadcasts"
      sub={demo ? 'No backend configured' : (live ? 'Announce something to a whole audience — in-app and push' : 'Loading…')} />
    <BackendError error={error} onRetry={reload} />
    {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

    <Card className="p-5 space-y-4">
      <div>
        <label className="text-xs font-semibold t3 uppercase" style={{ letterSpacing:'.06em' }}>Audience</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
          {AUDIENCES.map((a) => {
            const on = audience === a.key;
            return (
              // Reset the segment here rather than in an effect: an effect would let
              // one render fire a recipient count against the previous audience's filter.
              <button key={a.key} onClick={() => { setAudience(a.key); setFilter('all'); }} className="rounded-xl p-3 text-left transition-colors"
                style={on ? { background:'var(--pri-soft)', border:'1px solid var(--pri)' } : { background:'var(--surface2)', border:'1px solid var(--line)' }}>
                <Icon name={a.icon} style={{ color: on ? 'var(--pri)' : 'var(--t3)' }} />
                <div className="text-sm font-semibold mt-1.5" style={{ color: on ? 'var(--pri)' : 'var(--t1)' }}>{a.label}</div>
                <div className="text-[11px] t3 leading-snug mt-0.5">{a.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {segments && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold t3">Narrow to</span>
          <Seg value={filter} onChange={setFilter} options={segments.map((s) => s[0])} fmt={(o) => (segments.find((s) => s[0] === o) || [])[1] || o} />
        </div>
      )}

      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background:'var(--surface2)' }}>
        <Icon name="users" style={{ color:'var(--pri)' }} />
        {count
          ? <span className="text-sm t1"><b className="num">{count.recipients.toLocaleString()}</b> recipient{count.recipients === 1 ? '' : 's'} · <span className="t3 num">{count.reachable.toLocaleString()} reachable by push, the rest see it in-app</span></span>
          : <span className="text-sm t3">{live ? 'Counting recipients…' : 'Recipient count needs a live backend.'}</span>}
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title — shows as the notification headline" className="ym-input" style={{ width:'100%' }} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={300}
        placeholder="The announcement. Keep it short — it has to read well on a lock screen." className="ym-input" style={{ resize:'vertical', width:'100%' }} />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs t3 num">{body.length}/300</span>
        <Btn kind="soft" size="sm" icon="vial" onClick={() => doSend(true)} disabled={busy || !ready} className="ml-auto" title="Send it to your own account first">Send test to me</Btn>
        <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'bullhorn'} onClick={() => doSend(false)} disabled={busy || !ready}>Broadcast</Btn>
      </div>
      {!ready && <div className="text-xs t3">Add a title and a message to enable sending.</div>}
    </Card>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Broadcasts sent" value={rows.length} icon="bullhorn" tone="pri" />
      <Stat label="People reached" value={rows.reduce((a, b) => a + (b.delivered || 0), 0).toLocaleString()} sub="in-app records written" icon="inbox" tone="blue" />
      <Stat label="Push delivered" value={rows.reduce((a, b) => a + (b.pushed || 0), 0).toLocaleString()} icon="mobile-screen" tone="green" />
      <Stat label="Last sent" value={rows.length ? fmtAgo(rows[0].createdAt) : '—'} sub={rows.length ? rows[0].title : 'nothing yet'} icon="clock" tone="amber" />
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-3"><h3 className="font-bold t1">History</h3><p className="text-xs t3">Every broadcast, who sent it and how far it reached</p></div>
      <DataTable minWidth={640} rows={rows} pageSize={10}
        empty={<EmptyState icon="bullhorn" title="No broadcasts yet." sub="Announcements you send appear here with their delivery numbers." />}
        columns={[
          { key:'title', header:'Announcement', render:(b) => (
            <span><span className="font-semibold t1">{b.title}</span><span className="block text-xs t3 truncate" style={{ maxWidth:320 }}>{b.body}</span></span>) },
          { key:'audience', header:'Audience', render:(b) => <Pill tone="pri">{b.audience}{b.filter && b.filter !== 'all' ? ` · ${b.filter}` : ''}</Pill> },
          { key:'delivered', header:'Reached', align:'right', sortValue:(b) => b.delivered, render:(b) => (
            <span className="text-xs"><span className="num t1 font-semibold">{(b.delivered || 0).toLocaleString()}</span>
              <span className="block t3 num">{(b.pushed || 0).toLocaleString()} pushed</span></span>) },
          { key:'sentByEmail', header:'Sent by', render:(b) => <span className="text-xs t3">{b.sentByEmail ? b.sentByEmail.split('@')[0] : '—'}</span> },
          { key:'createdAt', header:'When', align:'right', sortValue:(b) => b.createdAt, render:(b) => <span className="text-xs t3">{fmtWhen(b.createdAt)}</span> },
        ]} />
    </Card>
  </div>);
}
