/* auth.jsx — Staff console secure login + access states (real Firebase auth). */
import React from 'react';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState } = React;

/* The console's departments, shown so a signing-in operator can see at a glance that
   this is the right portal. Duplicated (not imported from index.jsx) on purpose —
   index.jsx imports this file, so importing back would be a cycle. Labels only; the
   real nav + its admin-only gating still live in WORKSPACES. */
const DEPTS = ['Command', 'Marketplace', 'Logistics', 'Trust & Safety', 'Support', 'Growth', 'Finance', 'People', 'Legal'];

export function StaffLogin(){
  const { signInEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email || !password || busy) return;
    setBusy(true); setErr(''); setNotice('');
    try {
      await signInEmail(email, password);
      // The claims hook (onAuthStateChanged) re-evaluates and routes to the console.
    } catch (ex) {
      setErr(ex.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  // Same self-service reset the shopper/merchant/scout sign-ins offer. Firebase only
  // delivers to a registered inbox, so this reveals nothing about who is staff.
  const forgot = async () => {
    setErr(''); setNotice('');
    if (!email.trim()) { setErr('Enter your staff email first, then choose “Forgot password?”.'); return; }
    try {
      await resetPassword(email.trim());
      setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (ex) {
      setErr(ex.message || 'Could not send a reset link.');
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 relative" style={{ overflow:'hidden' }}>
      {/* brand glow — token-based so it reads correctly in BOTH themes (a hardcoded
          dark palette would break the console's light mode + its theme toggle) */}
      <div aria-hidden="true" className="pointer-events-none absolute" style={{
        left:'50%', top:0, width:520, height:520, transform:'translate(-50%,-45%)',
        background:'radial-gradient(circle, var(--pri-soft), transparent 68%)', opacity:.85 }} />

      <div className="w-full relative" style={{maxWidth:404}}>
        <div className="flex justify-center mb-6"><Logo size={34} /></div>

        <form className="card p-8 fadeup" onSubmit={submit}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl text-white mb-3" style={{background:'var(--pri)'}}><Icon name="shield-halved"/></div>
            <h2 className="text-xl font-bold t1">Staff Portal</h2>
            <p className="text-sm t3 mt-1">Internal operations console · authorised personnel only</p>

            {/* department legend */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {DEPTS.map((d) => (
                <span key={d} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium t3"
                  style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>{d}</span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5" htmlFor="staff-email">Staff email</label>
              <input id="staff-email" className="ym-input" type="email" inputMode="email" autoComplete="username"
                value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yotemarket.com" />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold t3 uppercase tracking-wide" htmlFor="staff-pw">Password</label>
                <button type="button" onClick={forgot} disabled={busy} className="text-xs font-semibold"
                  style={{ border:'none', background:'none', cursor:'pointer', padding:0, color:'var(--pri)' }}>Forgot password?</button>
              </div>
              {/* show/hide parity with the shopper, merchant and scout sign-ins, which
                  all had a reveal toggle while this console did not */}
              <div className="relative">
                <input id="staff-pw" className="ym-input" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight:44 }} />
                <button type="button" onClick={()=>setShowPw(v=>!v)} aria-label={showPw?'Hide password':'Show password'} aria-pressed={showPw}
                  className="absolute top-0 bottom-0 right-0 w-11 flex items-center justify-center t3"
                  style={{ background:'none', border:'none', cursor:'pointer' }}>
                  <Icon name={showPw ? 'eye-slash' : 'eye'} />
                </button>
              </div>
            </div>
          </div>

          {notice && <div role="status" className="mt-4 text-sm flex items-start gap-2" style={{color:'var(--green)'}}><Icon name="circle-check" className="mt-0.5"/>{notice}</div>}
          {err && <div role="alert" className="mt-4 text-sm flex items-start gap-2" style={{color:'var(--red)'}}><Icon name="circle-exclamation" className="mt-0.5"/>{err}</div>}

          <Btn type="submit" kind="primary" size="lg" className="w-full mt-6" icon={busy?'spinner':'lock-open'} disabled={busy}>{busy?'Signing in…':'Sign in securely'}</Btn>

          <div className="flex items-center gap-2 mt-6">
            <div className="h-px flex-1" style={{ background:'var(--line)' }} />
            <span className="text-[10px] font-semibold tracking-widest t3">RESTRICTED ACCESS</span>
            <div className="h-px flex-1" style={{ background:'var(--line)' }} />
          </div>
          <p className="text-center text-xs t3 mt-3 flex items-center gap-2 justify-center">
            <Icon name="lock"/> Admin &amp; moderator accounts only
          </p>
        </form>

        <div className="flex items-center justify-between mt-5 px-1">
          <span className="text-xs t3">© 2026 Yote Market Limited</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

/* Signed in, but the account carries no staff claim. */
export function StaffDenied({ email, onSignOut }){
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full text-center" style={{maxWidth:420}}>
        <div className="flex justify-center mb-6"><Logo size={34} /></div>
        <div className="card p-8 fadeup">
          <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl text-white mb-3" style={{background:'var(--red)'}}><Icon name="ban"/></div>
          <h2 className="text-xl font-bold t1">Access restricted</h2>
          <p className="text-sm t3 mt-2">{email ? <><span className="font-semibold t2">{email}</span> isn’t </> : 'This account isn’t '}an authorised staff account. Ask an admin to grant you the <span className="font-semibold t2">admin</span> or <span className="font-semibold t2">moderator</span> role.</p>
          <Btn kind="soft" size="md" className="mt-6" icon="right-from-bracket" onClick={onSignOut}>Sign out</Btn>
        </div>
      </div>
    </div>
  );
}

export function StaffSplash(){
  return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <Icon name="spinner" className="fa-spin text-2xl" style={{color:'var(--pri)'}} />
    </div>
  );
}
