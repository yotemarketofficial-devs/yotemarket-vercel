/* auth.jsx — Marketers real Firebase sign-in / sign-up + scout onboarding. */
import React from 'react';
import { COUNTIES } from './data.js';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { registerMarketer } from './service.js';
const { useState: useSA } = React;

function BrandPanel(){
  return (
    <div className="hidden lg:flex flex-col justify-between grad text-white p-10 relative overflow-hidden" style={{minHeight:'100%'}}>
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full" style={{background:'radial-gradient(circle, rgba(244,181,48,.4), transparent 70%)'}} />
      <div className="absolute -left-10 bottom-10 w-56 h-56 rounded-full" style={{background:'radial-gradient(circle, rgba(160,32,240,.5), transparent 70%)'}} />
      <div className="relative"><Logo size={32} white /></div>
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[.3em]" style={{color:'var(--gold-bright)'}}>Marketer Program</div>
        <h1 className="font-extrabold mt-3" style={{fontSize:40,lineHeight:1.05}}>Stack checkpoints.<br/>Get hired.</h1>
        <p className="mt-4 text-white/80 max-w-sm">Refer merchants to YoteMarket's virtual mall, earn cash at every checkpoint, and climb the leaderboard. Top scouts get the call.</p>
        <div className="flex gap-2.5 mt-6 flex-wrap">
          {['KSH 300 to qualify','Cash out at KSH 500','M-Pesa payouts'].map(t=>(
            <span key={t} className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{background:'rgba(255,255,255,.14)'}}>{t}</span>
          ))}
        </div>
      </div>
      <div className="relative text-sm text-white/70">Easy Ordering • Secure Payments • Fast Deliveries</div>
    </div>
  );
}

function AuthShell({ children }){
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 sm:p-8">
      <div className="card overflow-hidden w-full grid lg:grid-cols-2" style={{maxWidth:960, minHeight:560}}>
        <BrandPanel />
        <div className="p-7 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="lg:hidden"><Logo size={26} /></div>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }){
  return (
    <div>
      <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">{label}</label>
      <input className="ym-input" {...props} />
    </div>
  );
}

/* Unified Firebase auth: sign in, or create an account + scout profile in one go. */
export function AuthScreen(){
  const { signInEmail, registerEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useSA('signin'); // signin | signup
  const [name, setName] = useSA('');
  const [email, setEmail] = useSA('');
  const [password, setPassword] = useSA('');
  const [phone, setPhone] = useSA('');
  const [county, setCounty] = useSA('Nairobi');
  const [busy, setBusy] = useSA(false);
  const [err, setErr] = useSA('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter your full name.');
        await registerEmail(name.trim(), email.trim(), password);
        // Now authenticated — create the scout profile. If this throws, the app
        // shell shows the onboarding step as a fallback.
        await registerMarketer({ name: name.trim(), phone: phone.trim(), county });
      } else {
        await signInEmail(email.trim(), password);
      }
      // The app shell observes auth state and advances to the dashboard.
    } catch (ex) { setErr(ex.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setErr('');
    try { await signInGoogle(); } catch (ex) { if (ex.code !== 'cancelled') setErr(ex.message || 'Google sign-in failed.'); }
  };

  const signup = mode === 'signup';
  return (
    <AuthShell>
      <form className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup" onSubmit={submit}>
        <h2 className="text-2xl font-bold t1">{signup ? 'Become a scout' : 'Welcome back, scout'}</h2>
        <p className="t3 text-sm mt-1">{signup ? 'Create your account and start referring merchants.' : 'Sign in to track your referrals and earnings.'}</p>

        <div className="space-y-4 mt-7">
          {signup && <Field label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />}
          <Field label="Email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
          <Field label="Password" type="password" autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'Min. 6 characters':'••••••••'} />
          {signup && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone (M-Pesa)" className="ym-input num" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XX XXX XXX" />
              <div>
                <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">County</label>
                <select className="ym-input" value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
              </div>
            </div>
          )}
        </div>

        {err && <div className="mt-4 text-sm flex items-center gap-2" style={{color:'var(--red)'}}><Icon name="circle-exclamation"/>{err}</div>}
        <Btn type="submit" kind="primary" size="lg" className="w-full mt-6" icon={busy?'spinner':undefined} disabled={busy}>{busy?'Please wait…':(signup?'Create account':'Sign in')}</Btn>
        <button type="button" onClick={google} className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{border:'1px solid var(--line2)',color:'var(--t1)'}}><Icon name="google" brand/> Continue with Google</button>
        <p className="text-center text-sm t3 mt-5">
          {signup
            ? <>Already a scout? <button type="button" onClick={()=>{ setMode('signin'); setErr(''); }} className="font-semibold accent">Sign in</button></>
            : <>New here? <button type="button" onClick={()=>{ setMode('signup'); setErr(''); }} className="font-semibold accent">Become a scout</button></>}
        </p>
      </form>
    </AuthShell>
  );
}

/* Signed in (e.g. via Google) but no marketer profile yet → collect scout details. */
export function OnboardScreen({ defaultName = '', onDone }){
  const [name, setName] = useSA(defaultName);
  const [phone, setPhone] = useSA('');
  const [county, setCounty] = useSA('Nairobi');
  const [busy, setBusy] = useSA(false);
  const [err, setErr] = useSA('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy || !name.trim()) return;
    setBusy(true); setErr('');
    try {
      const { marketer } = await registerMarketer({ name: name.trim(), phone: phone.trim(), county });
      onDone(marketer);
    } catch (ex) { setErr(ex.message || 'Could not complete signup.'); setBusy(false); }
  };

  return (
    <AuthShell>
      <form className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup" onSubmit={submit}>
        <div className="w-14 h-14 rounded-2xl grad flex items-center justify-center text-white text-2xl mb-4"><Icon name="rocket"/></div>
        <h2 className="text-2xl font-bold t1">Set up your scout profile</h2>
        <p className="t3 text-sm mt-1">One step to join the founding cohort and get your referral link.</p>
        <div className="space-y-4 mt-6">
          <Field label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
          <Field label="Phone (M-Pesa)" className="ym-input num" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XX XXX XXX" />
          <div>
            <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Primary county</label>
            <select className="ym-input" value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
          </div>
        </div>
        {err && <div className="mt-4 text-sm flex items-center gap-2" style={{color:'var(--red)'}}><Icon name="circle-exclamation"/>{err}</div>}
        <Btn type="submit" kind="primary" size="lg" className="w-full mt-6" icon={busy?'spinner':'rocket'} disabled={busy}>{busy?'Creating…':'Join the program'}</Btn>
      </form>
    </AuthShell>
  );
}
