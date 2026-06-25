/* auth.jsx — Staff console secure login + access states (real Firebase auth). */
import React from 'react';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState } = React;

export function StaffLogin(){
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email || !password || busy) return;
    setBusy(true); setErr('');
    try {
      await signInEmail(email, password);
      // The claims hook (onAuthStateChanged) re-evaluates and routes to the console.
    } catch (ex) {
      setErr(ex.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full" style={{maxWidth:400}}>
        <div className="flex justify-center mb-6"><Logo size={34} /></div>
        <form className="card p-8 fadeup" onSubmit={submit}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl text-white mb-3" style={{background:'var(--pri)'}}><Icon name="shield-halved"/></div>
            <h2 className="text-xl font-bold t1">Staff sign in</h2>
            <p className="text-sm t3 mt-1">Internal operations console · authorised personnel only</p>
          </div>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Staff email</label>
              <input className="ym-input" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yotemarket.com" /></div>
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" autoComplete="current-password" className="ym-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" /></div>
          </div>
          {err && <div className="mt-4 text-sm flex items-center gap-2" style={{color:'var(--red)'}}><Icon name="circle-exclamation"/>{err}</div>}
          <Btn type="submit" kind="primary" size="lg" className="w-full mt-6" icon={busy?'spinner':'lock-open'} disabled={busy}>{busy?'Signing in…':'Sign in securely'}</Btn>
          <div className="flex items-center gap-2 justify-center mt-5 text-xs t3">
            <Icon name="lock"/> Access is restricted to admin &amp; moderator accounts
          </div>
        </form>
        <div className="flex items-center justify-between mt-5 px-1">
          <span className="text-xs t3">© 2026 YoteMarket Limited</span>
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
