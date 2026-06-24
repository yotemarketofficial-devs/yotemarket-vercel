/* MerchantGate.jsx — gates the merchant dashboard:
   not signed in → sign-in panel; signed in but no store → self-serve store
   signup (registerStore); store but no active subscription → subscribe paywall;
   active subscriber → the dashboard. Demo mode (no backend) shows it directly. */
import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../lib/useAuth.jsx';
import { db, firebaseEnabled, registerStore } from '../../lib/firebase.js';
import { FA, Card, Btn } from './primitives.jsx';
import SubscribeFlow from './SubscribeFlow.jsx';
const { useState, useEffect } = React;

const CATS = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'phones', label: 'Phones & Tablets' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'groceries', label: 'Groceries & Food' },
  { id: 'home', label: 'Home & Furniture' },
  { id: 'beauty', label: 'Health & Beauty' },
  { id: 'kids', label: 'Babies & Kids' },
];

const ipt = { width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid var(--m-border)', background: 'var(--m-surface)', color: 'var(--m-fg1)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const errBox = { display: 'flex', gap: 9, alignItems: 'center', background: 'var(--m-inactive-bg)', color: 'var(--m-inactive-fg)', borderRadius: 11, padding: '11px 14px', fontSize: 13, fontWeight: 500, margin: '14px 0 0' };
const linkBtn = { background: 'none', border: 'none', padding: 0, color: 'var(--m-primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 };

function Shell({ children, wide }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--m-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: wide ? 760 : 460 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label className="ym-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <Shell>
      <div style={{ textAlign: 'center', color: 'var(--m-fg3)' }}>
        <FA i="fa-circle-notch" style={{ fontSize: 28, color: 'var(--m-primary)', animation: 'ym-spin 1s linear infinite' }} />
        <div style={{ marginTop: 12, fontSize: 14 }}>Loading your dashboard…</div>
      </div>
    </Shell>
  );
}

/* ---------- sign in / register ---------- */
function SignInPanel() {
  const { signInEmail, registerEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') await registerEmail(name, email, pass);
      else await signInEmail(email, pass);
      // onAuthStateChanged advances the gate; leave busy true through the transition.
    } catch (e) { setErr(e.message || 'Could not sign in.'); setBusy(false); }
  };
  const google = async () => {
    setErr(''); setBusy(true);
    try { await signInGoogle(); } catch (e) { setErr(e.message || 'Google sign-in failed.'); setBusy(false); }
  };

  return (
    <Shell>
      <Card style={{ padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, margin: '0 auto 14px', background: 'var(--m-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FA i="fa-store" style={{ color: '#fff', fontSize: 22 }} /></div>
          <h1 className="ym-h1" style={{ fontSize: 22 }}>Sell on YoteMarket</h1>
          <p className="ym-sub" style={{ marginTop: 4 }}>Sign in to open your merchant dashboard.</p>
        </div>
        {mode === 'register' && (
          <Field label="Your name"><input style={ipt} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Wanjiru" /></Field>
        )}
        <Field label="Email"><input style={ipt} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" /></Field>
        <Field label="Password"><input style={ipt} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} /></Field>
        {err && <div role="alert" style={errBox}><FA i="fa-circle-exclamation" /> {err}</div>}
        <Btn kind="primary" style={{ width: '100%', marginTop: 16 }} disabled={busy} onClick={submit}>{busy ? 'Please wait…' : (mode === 'register' ? 'Create account' : 'Sign in')}</Btn>
        <Btn kind="ghost" style={{ width: '100%', marginTop: 10 }} disabled={busy} onClick={google}><FA i="fa-google" brand /> Continue with Google</Btn>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--m-fg3)' }}>
          {mode === 'register' ? 'Already have an account? ' : 'New to selling here? '}
          <button style={linkBtn} onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setErr(''); }}>{mode === 'register' ? 'Sign in' : 'Create an account'}</button>
        </div>
      </Card>
    </Shell>
  );
}

/* ---------- store signup ---------- */
function StoreSignupPanel() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('electronics');
  const [area, setArea] = useState('');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!name.trim()) { setErr('Enter your store name.'); return; }
    setBusy(true);
    try {
      const payout = phone.trim() ? { method: 'b2c', phone: phone.trim() } : undefined;
      await registerStore({ name: name.trim(), category, area: area.trim(), tagline: tagline.trim(), ...(payout ? { payout } : {}) });
      // The merchants/{uid} listener in the gate advances to the paywall; keep busy.
    } catch (e) { setErr(e.message || 'Could not create your store.'); setBusy(false); }
  };

  return (
    <Shell>
      <Card style={{ padding: 28 }}>
        <div style={{ marginBottom: 18 }}>
          <h1 className="ym-h1" style={{ fontSize: 22 }}>Set up your store</h1>
          <p className="ym-sub" style={{ marginTop: 4 }}>A few details and your storefront goes live on YoteMarket. No commission — just a monthly plan.</p>
        </div>
        <Field label="Store name"><input style={ipt} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tamasha Electronics" /></Field>
        <Field label="Category">
          <select style={ipt} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Area / location"><input style={ipt} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Nairobi CBD" /></Field>
        <Field label="Tagline (optional)"><input style={ipt} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What you sell, in a line" /></Field>
        <Field label="M-Pesa payout number (optional)"><input style={ipt} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" /></Field>
        {err && <div role="alert" style={errBox}><FA i="fa-circle-exclamation" /> {err}</div>}
        <Btn kind="primary" style={{ width: '100%', marginTop: 16 }} disabled={busy} onClick={submit}>{busy ? 'Creating your store…' : 'Create my store'}</Btn>
        <p className="ym-cap" style={{ textAlign: 'center', marginTop: 10 }}>Next: choose a plan to activate your dashboard.</p>
      </Card>
    </Shell>
  );
}

/* ---------- subscription paywall ---------- */
function SubscribePanel({ expired }) {
  const { signOutUser } = useAuth();
  return (
    <Shell wide>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, margin: '0 auto 14px', background: 'var(--m-grad-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--m-glow)' }}><FA i="fa-crown" style={{ color: 'var(--m-amber)', fontSize: 22 }} /></div>
        <h1 className="ym-h1" style={{ fontSize: 24 }}>{expired ? 'Renew your plan' : 'Choose your plan'}</h1>
        <p className="ym-sub" style={{ marginTop: 6 }}>{expired ? 'Your subscription has lapsed. Re-subscribe to reopen your dashboard.' : 'A subscription activates your dashboard. No sales commission — keep 100% of every sale.'}</p>
      </div>
      <SubscribeFlow />
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button style={linkBtn} onClick={signOutUser}>Sign out</button>
      </div>
    </Shell>
  );
}

export default function MerchantGate({ children }) {
  const { user, hasAccount, loading } = useAuth();
  const uid = user?.uid;
  const [merchant, setMerchant] = useState(undefined); // undefined=loading, null=none
  const [sub, setSub] = useState(undefined);

  useEffect(() => {
    if (!firebaseEnabled || !db || loading) return undefined;
    if (!hasAccount || !uid) { setMerchant(null); setSub(null); return undefined; }
    setMerchant(undefined); setSub(undefined);
    const u1 = onSnapshot(doc(db, 'merchants', uid), (s) => setMerchant(s.exists() ? s.data() : null), () => setMerchant(null));
    const u2 = onSnapshot(doc(db, 'subscriptions', uid), (s) => setSub(s.exists() ? s.data() : null), () => setSub(null));
    return () => { u1(); u2(); };
  }, [uid, hasAccount, loading]);

  if (!firebaseEnabled) return children; // demo mode → dashboard directly
  if (loading) return <Loading />;
  if (!hasAccount || !uid) return <SignInPanel />;
  if (merchant === undefined || sub === undefined) return <Loading />;
  if (!merchant || !merchant.storeId) return <StoreSignupPanel />;
  if (!sub || sub.status !== 'active') return <SubscribePanel expired={sub && sub.status === 'expired'} />;
  return children;
}
