/* hub/index.jsx — Hub-store operator console. A dedicated hub account (custom
   claim `hub=<hubId>`) confirms two custody handovers for its hub:
     ② rider → hub  (enter the rider's code)
     ③ hub → shopper (enter the shopper's code)
   Hub operators have no broad Firestore read; everything goes through the
   Admin-SDK callables hubListOrders / confirmHandover, gated by the claim. */
import React from 'react';
import { auth, firebaseEnabled, hubListOrders, confirmHandover, assignHubOperator } from '../../lib/firebase.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { HUBS, findHub } from '../storefront/hubs.js';
const { useState, useEffect, useCallback } = React;

const OWNER_EMAILS = ['007arnogichuche@gmail.com', 'yotemarketofficial@gmail.com'];
const C = {
  page: '#f5f6fa', card: '#ffffff', border: '#e6e8ee', fg1: '#111827', fg3: '#6b7280',
  pri: '#7c3aed', priSoft: '#f1ebfe', ok: '#10b981', amber: '#f59e0b', red: '#ef4444',
};
const FA = ({ i, style }) => <i className={`fas ${i}`} style={style} aria-hidden="true" />;

/* Resolve the hub claim from the ID token (owner/staff fall through to a picker). */
function useHubClaim() {
  const [s, setS] = useState({ user: null, loading: firebaseEnabled, hubId: null, isStaff: false });
  const evaluate = useCallback(async (force = false) => {
    const u = auth?.currentUser || null;
    if (!u) { setS({ user: null, loading: false, hubId: null, isStaff: false }); return; }
    try {
      const t = await u.getIdTokenResult(force);
      const c = t.claims || {};
      const owner = u.emailVerified && OWNER_EMAILS.includes(String(u.email || '').toLowerCase());
      setS({ user: u, loading: false, hubId: c.hub || null, isStaff: c.admin === true || c.moderator === true || owner });
    } catch { setS({ user: u, loading: false, hubId: null, isStaff: false }); }
  }, []);
  useEffect(() => {
    if (!firebaseEnabled || !auth) { setS((p) => ({ ...p, loading: false })); return undefined; }
    const un = auth.onAuthStateChanged(() => evaluate(false));
    return () => un();
  }, [evaluate]);
  return { ...s, refresh: () => evaluate(true) };
}

export default function HubApp() {
  const { loading, user, hubId, isStaff, refresh } = useHubClaim();
  const { signInEmail, signOutUser } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <HubLogin signInEmail={signInEmail} />;
  if (!hubId && !isStaff) return <HubDenied email={user.email} onSignOut={signOutUser} />;
  return <HubConsole fixedHubId={hubId} isStaff={isStaff} email={user.email} onSignOut={signOutUser} refreshClaim={refresh} />;
}

function Shell({ children }) {
  return <div style={{ minHeight: '100vh', background: C.page, color: C.fg1, fontFamily: 'Inter, system-ui, sans-serif' }}>{children}</div>;
}
function Splash() {
  return <Shell><div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FA i="fa-circle-notch" style={{ fontSize: 24, color: C.pri, animation: 'ym-spin 1s linear infinite' }} /></div></Shell>;
}

function HubLogin({ signInEmail }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e?.preventDefault?.(); if (!email || !pw || busy) return;
    setBusy(true); setErr('');
    try { await signInEmail(email, pw); } catch (ex) { setErr(ex.message || 'Sign-in failed.'); } finally { setBusy(false); }
  };
  return (
    <Shell><div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, boxShadow: '0 12px 40px rgba(17,24,39,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px', background: C.pri, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FA i="fa-warehouse" /></div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Hub sign in</h1>
          <p style={{ fontSize: 13, color: C.fg3, marginTop: 4 }}>YoteMarket hub-store console</p>
        </div>
        <label style={lbl}>Hub email</label>
        <input style={ipt} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hub@yotemarket.com" />
        <label style={{ ...lbl, marginTop: 12 }}>Password</label>
        <input style={ipt} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12, display: 'flex', gap: 7, alignItems: 'center' }}><FA i="fa-circle-exclamation" /> {err}</div>}
        <button type="submit" disabled={busy} style={{ ...btn(C.pri), width: '100%', marginTop: 18 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div></Shell>
  );
}

function HubDenied({ email, onSignOut }) {
  return (
    <Shell><div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 30 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px', background: C.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FA i="fa-ban" /></div>
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Not a hub operator</h1>
        <p style={{ fontSize: 13.5, color: C.fg3, marginTop: 8 }}><b>{email}</b> isn't assigned to a hub. Ask an admin to assign your account to a hub from the admin console.</p>
        <button onClick={onSignOut} style={{ ...btn('#eef0f4', C.fg1), marginTop: 18 }}>Sign out</button>
      </div>
    </div></Shell>
  );
}

function HubConsole({ fixedHubId, isStaff, email, onSignOut }) {
  const [pickHub, setPickHub] = useState(fixedHubId || (isStaff ? HUBS[0].id : null));
  const hubId = fixedHubId || pickHub;
  const hub = findHub(hubId);
  const [data, setData] = useState({ orders: [], incoming: 0, atHub: 0, enRoute: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await hubListOrders(fixedHubId ? {} : { hubId });
      setData(r || { orders: [] });
    } catch { /* keep last */ } finally { setLoading(false); }
  }, [hubId, fixedHubId]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const incoming = data.orders.filter((o) => o.status === 'picked_up');
  const ready = data.orders.filter((o) => o.status === 'at_hub');
  const enRoute = data.orders.filter((o) => o.status === 'accepted' || o.status === 'queued');

  return (
    <Shell>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: C.pri, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><FA i="fa-warehouse" /></div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{hub ? hub.name : 'Hub console'}</div>
          <div style={{ fontSize: 12, color: C.fg3 }}>{hub ? hub.area : ''} · {email}</div>
        </div>
        {isStaff && !fixedHubId && (
          <select value={hubId} onChange={(e) => setPickHub(e.target.value)} style={{ ...ipt, width: 'auto', padding: '8px 12px' }}>
            {HUBS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
        <button onClick={load} style={{ ...btn('#eef0f4', C.fg1), padding: '9px 14px' }}><FA i="fa-rotate" /> Refresh</button>
        <button onClick={onSignOut} style={{ ...btn('#eef0f4', C.fg1), padding: '9px 14px' }}><FA i="fa-right-from-bracket" /></button>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <Stat label="En route to you" value={enRoute.length} icon="fa-motorcycle" tint={C.amber} />
          <Stat label="To receive ②" value={incoming.length} icon="fa-inbox" tint={C.pri} />
          <Stat label="Awaiting pickup ③" value={ready.length} icon="fa-box-open" tint={C.ok} />
        </div>

        {isStaff && <AssignOperator hubId={hubId} hubName={hub ? hub.name : ''} flash={flash} />}

        <Section title="Receive from rider ②" sub="Enter the code the rider shows to confirm the parcel arrived at your hub." icon="fa-inbox" empty={!loading && incoming.length === 0} emptyText="No parcels arriving right now.">
          {incoming.map((o) => <OrderRow key={o.id} o={o} leg={2} cta="Confirm received" flash={flash} reload={load} />)}
        </Section>

        <Section title="Hand to shopper ③" sub="Enter the code the shopper shows to release their order." icon="fa-box-open" empty={!loading && ready.length === 0} emptyText="Nothing waiting to be collected.">
          {ready.map((o) => <OrderRow key={o.id} o={o} leg={3} cta="Release order" flash={flash} reload={load} />)}
        </Section>

        {enRoute.length > 0 && (
          <Section title="En route to your hub" sub="Riders are bringing these — no action yet." icon="fa-motorcycle" empty={false}>
            {enRoute.map((o) => (
              <div key={o.id} style={{ ...rowBox, opacity: .8 }}>
                <div style={{ flex: 1 }}><b>{o.code}</b> · {o.items} item{o.items !== 1 ? 's' : ''}<div style={{ fontSize: 12, color: C.fg3 }}>{o.riderName ? `Rider: ${o.riderName}` : 'Awaiting a rider'}</div></div>
                <span style={pill(C.amber)}>{o.status === 'accepted' ? 'Rider assigned' : 'Finding rider'}</span>
              </div>
            ))}
          </Section>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.25)', display: 'flex', gap: 9, alignItems: 'center' }}><FA i="fa-circle-check" style={{ color: '#6ee7b7' }} /> {toast}</div>}
      <style>{`@keyframes ym-spin{to{transform:rotate(360deg)}}`}</style>
    </Shell>
  );
}

function OrderRow({ o, leg, cta, flash, reload }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async () => {
    if (code.trim().length < 3) { setErr('Enter the code'); return; }
    setBusy(true); setErr('');
    try {
      await confirmHandover({ orderId: o.id, leg, code: code.trim() });
      flash(leg === 2 ? `${o.code} received` : `${o.code} released to shopper`);
      reload();
    } catch (e) { setErr(e.message || 'That code didn\'t match.'); setBusy(false); }
  };
  return (
    <div style={rowBox}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{o.code} · <span style={{ color: C.fg3, fontWeight: 500 }}>{o.items} item{o.items !== 1 ? 's' : ''}</span></div>
        <div style={{ fontSize: 12, color: C.fg3 }}>{o.riderName ? `Rider: ${o.riderName}` : ''}</div>
        {err && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{err}</div>}
      </div>
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Code" maxLength={6}
        style={{ width: 88, textAlign: 'center', letterSpacing: 2, fontWeight: 700, ...ipt, padding: '9px 8px' }} />
      <button onClick={submit} disabled={busy} style={{ ...btn(leg === 2 ? C.pri : C.ok), padding: '9px 14px', whiteSpace: 'nowrap' }}>
        {busy ? <FA i="fa-circle-notch" style={{ animation: 'ym-spin 1s linear infinite' }} /> : cta}
      </button>
    </div>
  );
}

function AssignOperator({ hubId, hubName, flash }) {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const assign = async () => {
    if (!email.trim()) { setErr('Enter an email'); return; }
    setBusy(true); setErr('');
    try { await assignHubOperator({ email: email.trim(), hubId, hubName }); flash(`${email.trim()} assigned to ${hubName}`); setEmail(''); }
    catch (e) { setErr(e.message || 'Could not assign.'); } finally { setBusy(false); }
  };
  return (
    <Section title="Assign hub operator · staff" sub="Grant a signed-up account access to operate this hub. They must have signed in once first, then re-open /hub." icon="fa-user-plus" empty={false}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input style={{ ...ipt, flex: 1, minWidth: 200 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@email.com" />
        <button onClick={assign} disabled={busy} style={{ ...btn(C.pri), padding: '11px 16px', whiteSpace: 'nowrap' }}>{busy ? <FA i="fa-circle-notch" style={{ animation: 'ym-spin 1s linear infinite' }} /> : `Assign to ${hubName || 'hub'}`}</button>
      </div>
      {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
    </Section>
  );
}

const Stat = ({ label, value, icon, tint }) => (
  <div style={{ flex: 1, minWidth: 150, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: tint + '22', color: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><FA i={icon} /></div>
    <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    <div style={{ fontSize: 12.5, color: C.fg3 }}>{label}</div>
  </div>
);
function Section({ title, sub, icon, children, empty, emptyText }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <FA i={icon} style={{ color: C.pri }} /><span style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.fg3, marginBottom: 14 }}>{sub}</div>
      {empty ? <div style={{ textAlign: 'center', color: C.fg3, fontSize: 13.5, padding: '20px 0' }}>{emptyText}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 11.5, fontWeight: 700, color: C.fg3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 };
const ipt = { width: '100%', padding: '11px 13px', borderRadius: 11, border: `1px solid ${C.border}`, background: '#fff', color: C.fg1, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const rowBox = { display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 13, border: `1px solid ${C.border}`, background: '#fbfbfd', flexWrap: 'wrap' };
const pill = (c) => ({ background: c + '22', color: c, fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 9999 });
function btn(bg, fg = '#fff') { return { background: bg, color: fg, border: 'none', borderRadius: 11, padding: '11px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }; }
