/* auth.jsx — Marketers scout app: SIGN-IN ONLY.
   Signing in is never signing up. Applying to the program is a separate flow on the
   recruitment landing (/marketers#apply) — this app has no application form, so a
   sign-in can't quietly turn into one. A signed-in non-scout is sent to apply. */
import React from 'react';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState: useSA } = React;

const APPLY_URL = '/marketers#apply';

/* The real multi-colour Google mark — same asset the shopper/merchant auth uses, so
   the three sign-ins look like one product (a brand glyph would not match). */
function GoogleMark(){
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" style={{ flexShrink: 0 }} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/* Brand panel — same banner treatment as the shopper/merchant AuthPanel (a purple
   scrim over /assets/marketing/banner.png), so all three sign-ins read as one product.
   Only the copy is scout-specific. */
function BrandPanel(){
  return (
    <div className="hidden lg:flex flex-col justify-between text-white p-10 relative overflow-hidden" style={{
      minHeight:'100%',
      backgroundImage:"linear-gradient(180deg,rgba(26,6,64,.82) 0%,rgba(42,14,100,.6) 55%,rgba(26,6,64,.4) 100%), url('/assets/marketing/banner.png')",
      backgroundSize:'cover',
      backgroundPosition:'center 40%',
    }}>
      <div className="relative"><Logo size={32} white /></div>
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[.3em]" style={{color:'var(--gold-bright)'}}>Marketer Program</div>
        <h1 className="font-extrabold mt-3" style={{fontSize:40,lineHeight:1.05,textShadow:'0 2px 14px rgba(16,6,50,.6)'}}>Stack checkpoints.<br/>Get hired.</h1>
        <p className="mt-4 text-white/85 max-w-sm">Refer merchants to YoteMarket's virtual mall, earn cash at every checkpoint, and climb the leaderboard. Top scouts get the call.</p>
        <div className="flex gap-2.5 mt-6 flex-wrap">
          {['KSH 300 to qualify','Cash out at KSH 500','M-Pesa payouts'].map(t=>(
            <span key={t} className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)'}}>{t}</span>
          ))}
        </div>
      </div>
      <div className="relative text-sm text-white/75">Easy Ordering • Secure Payments • Fast Deliveries</div>
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

/* SIGN IN ONLY. No account creation here — "New scout?" links out to the application
   on the landing. Mirrors the shopper/merchant AuthPanel: Google mark, show/hide
   password, forgot-password, role="alert" errors, terms footer. */
export function AuthScreen(){
  const { signInEmail, signInGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useSA('');
  const [password, setPassword] = useSA('');
  const [showPw, setShowPw] = useSA(false);
  const [busy, setBusy] = useSA(false);
  const [err, setErr] = useSA('');
  const [notice, setNotice] = useSA('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true); setErr(''); setNotice('');
    try { await signInEmail(email.trim(), password); }
    catch (ex) { setErr(ex.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setErr(''); setNotice('');
    // redirectTo keeps in-app browsers landing back on the scout app after the
    // full-page Google redirect.
    try { await signInGoogle({ redirectTo: '/marketers/app' }); }
    catch (ex) { if (ex.code !== 'cancelled') setErr(ex.message || 'Google sign-in failed.'); }
  };
  const forgot = async () => {
    setErr(''); setNotice('');
    try { await resetPassword(email.trim()); setNotice(`Reset link sent to ${email.trim()} — check your inbox.`); }
    catch (ex) { setErr(ex.message || 'Could not send a reset link.'); }
  };

  return (
    <AuthShell>
      <form className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup" onSubmit={submit}>
        <h2 className="text-2xl font-bold t1">Scout sign in</h2>
        <p className="t3 text-sm mt-1">Welcome back. Sign in to track your referrals and earnings.</p>

        <button type="button" onClick={google} disabled={busy}
          className="w-full mt-7 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5"
          style={{ border:'1px solid var(--line2)', color:'var(--t1)', background:'var(--surface)' }}>
          <GoogleMark /> Sign in with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background:'var(--line2)' }} />
          <span className="text-xs t3">or with email</span>
          <div className="flex-1 h-px" style={{ background:'var(--line2)' }} />
        </div>

        <div className="space-y-4">
          <Field label="Email" type="email" inputMode="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <label className="block text-xs font-semibold t3 uppercase tracking-wide">Password</label>
              <button type="button" onClick={forgot} disabled={busy} className="text-xs font-semibold accent" style={{ border:'none', background:'none', cursor:'pointer', padding:0 }}>Forgot password?</button>
            </div>
            <div className="relative">
              <input className="ym-input" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight:44 }} />
              <button type="button" onClick={()=>setShowPw(v=>!v)} aria-label={showPw?'Hide password':'Show password'} aria-pressed={showPw}
                className="absolute top-0 bottom-0 right-0 w-11 flex items-center justify-center t3"
                style={{ background:'none', border:'none', cursor:'pointer' }}>
                <Icon name={showPw ? 'eye-slash' : 'eye'} />
              </button>
            </div>
          </div>
        </div>

        {notice && <div role="status" className="mt-4 text-sm flex items-center gap-2" style={{color:'var(--green)'}}><Icon name="circle-check"/>{notice}</div>}
        {err && <div role="alert" className="mt-4 text-sm flex items-center gap-2" style={{color:'var(--red)'}}><Icon name="circle-exclamation"/>{err}</div>}

        <Btn type="submit" kind="primary" size="lg" className="w-full mt-6" icon={busy?'spinner':undefined} disabled={busy}>{busy?'Signing in…':'Sign in'}</Btn>

        <p className="text-center text-sm t3 mt-6">New scout? <a href={APPLY_URL} className="font-semibold accent">Apply to join the program →</a></p>
        <p className="text-center text-xs t3 mt-4">
          By continuing you agree to our <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold accent">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold accent">Privacy Policy</a>.
        </p>
      </form>
    </AuthShell>
  );
}

/* Signed in, but this account isn't on the scout roll.
   This REPLACED an onboarding form that used to appear here. That form made signing
   in silently become signing up — and duplicated the real application on the landing.
   Sign-in stays sign-in: we tell them plainly and send them to the one application. */
export function NotAScoutScreen({ email, onSignOut }){
  return (
    <AuthShell>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup text-center">
        <div className="w-16 h-16 rounded-2xl grad flex items-center justify-center text-white text-3xl mb-5 mx-auto"><Icon name="id-badge"/></div>
        <h2 className="text-2xl font-bold t1">You're not a scout yet</h2>
        <p className="t3 text-sm mt-2 leading-relaxed">
          This dashboard is for approved marketers{email ? <> — <b className="t1">{email}</b> isn't one yet</> : ''}.
          Apply to the program and we'll review it within 24 hours.
        </p>
        <Btn kind="primary" size="lg" className="w-full mt-6" icon="rocket" onClick={()=>window.location.assign(APPLY_URL)}>
          Apply to join the program
        </Btn>
        <button onClick={onSignOut} className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{border:'1px solid var(--line2)', color:'var(--t1)'}}>
          <Icon name="right-from-bracket"/> Sign out
        </button>
        <p className="text-center text-xs t3 mt-4">Already applied? You'll get an SMS and email the moment you're approved — then sign back in here.</p>
      </div>
    </AuthShell>
  );
}

/* Signed in with a marketer record that isn't approved yet. The scout dashboard is
   gated to APPROVED (active) marketers only — applicants wait here for review,
   rejected applicants are told, and both can sign out. */
export function StatusScreen({ profile, onSignOut }){
  const rejected = profile?.status === 'rejected';
  return (
    <AuthShell>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup text-center">
        <div className="w-16 h-16 rounded-2xl grad flex items-center justify-center text-white text-3xl mb-5 mx-auto">
          <Icon name={rejected ? 'circle-xmark' : 'hourglass-half'} />
        </div>
        <h2 className="text-2xl font-bold t1">{rejected ? 'Application not approved' : 'Application under review'}</h2>
        <p className="t3 text-sm mt-2 leading-relaxed">
          {rejected
            ? 'Thanks for your interest in the YoteMarket Marketer Program. Your application wasn’t approved this time — you’re welcome to reapply as the program grows.'
            : 'Thanks for applying! Our team reviews scout applications within 24 hours. You’ll get an SMS and email the moment you’re approved — then sign back in here to open your scout dashboard.'}
        </p>
        <div className="mt-6 rounded-xl p-3.5 text-sm flex items-center gap-2.5" style={{background:'var(--surface2)', color:'var(--t2)'}}>
          <Icon name={rejected ? 'circle-info' : 'clock'} style={{color:'var(--purple)'}} />
          <span>Signed in as <b className="t1">{profile?.email || profile?.name || 'scout'}</b> · status: {rejected ? 'not approved' : 'pending review'}</span>
        </div>
        <button onClick={onSignOut} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{border:'1px solid var(--line2)', color:'var(--t1)'}}>
          <Icon name="right-from-bracket"/> Sign out
        </button>
      </div>
    </AuthShell>
  );
}
