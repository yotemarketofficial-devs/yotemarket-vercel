/* auth.jsx — Staff console secure login. */
import React from 'react';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';

export function StaffLogin({ onLogin }){
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full" style={{maxWidth:400}}>
        <div className="flex justify-center mb-6"><Logo size={34} /></div>
        <div className="card p-8 fadeup">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl text-white mb-3" style={{background:'var(--pri)'}}><Icon name="shield-halved"/></div>
            <h2 className="text-xl font-bold t1">Staff sign in</h2>
            <p className="text-sm t3 mt-1">Internal operations console · authorised personnel only</p>
          </div>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Staff email</label>
              <input className="ym-input" defaultValue="a.kamau@yotemarket.com" /></div>
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" className="ym-input" defaultValue="ops-secure-2026" /></div>
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">2FA code</label>
              <input className="ym-input num tracking-[.4em]" defaultValue="••••••" /></div>
          </div>
          <Btn kind="primary" size="lg" className="w-full mt-6" icon="lock-open" onClick={onLogin}>Sign in securely</Btn>
          <div className="flex items-center gap-2 justify-center mt-5 text-xs t3">
            <Icon name="lock"/> Sessions are logged and audited
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 px-1">
          <span className="text-xs t3">© 2026 YoteMarket Limited</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
