/* auth.jsx — Role-based sign-in / sign-up for the YoteMarket web storefront.
   Wired to real Firebase Auth (email + Google) via useAuth(), with a guest
   fallback. Shoppers enter the storefront; merchants/riders route to their app. */
import React from 'react';
import { FA } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState: useSA } = React;

export const ROLES = [
  { id:'shopper', label:'Shopper', icon:'fa-bag-shopping', desc:'Shop 200+ local stores' },
  { id:'merchant', label:'Merchant', icon:'fa-store', desc:'Sell from your own storefront' },
  { id:'rider', label:'Rider', icon:'fa-motorcycle', desc:'Deliver & earn from hubs' },
];
const ROLE_DEST = { merchant:'/dashboard', rider:'/rider' };

function BrandPanel({ theme, onTheme }){
  return (
    <div style={{ position:'relative', overflow:'hidden', backgroundImage:'var(--m-banner)', backgroundSize:'cover', backgroundPosition:'center 40%',
      display:'flex', flexDirection:'column', justifyContent:'space-between', padding:40, color:'#fff', minHeight:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <img src="/assets/logo-white.png" alt="YoteMarket" style={{ height:32, filter:'drop-shadow(0 3px 12px rgba(16,6,50,.6))' }} />
        <button onClick={onTheme} className="icon-btn" aria-label="Toggle theme" style={{ background:'rgba(255,255,255,.16)', color:'#fff' }}><FA i={theme==='dark'?'fa-sun':'fa-moon'} /></button>
      </div>
      <div>
        <div style={{ fontSize:13, letterSpacing:'.18em', textTransform:'uppercase', fontWeight:700, color:'var(--m-amber)' }}>Kenya's Virtual Mall</div>
        <div style={{ fontSize:38, fontWeight:800, lineHeight:1.1, marginTop:14, textShadow:'0 2px 14px rgba(16,6,50,.6)' }}>
          Connect, Trade &amp; <span style={{ color:'var(--m-amber)' }}>Earn</span> in Kenya's Social Marketplace
        </div>
        <div style={{ display:'flex', gap:8, marginTop:24, flexWrap:'wrap' }}>
          {['Easy Ordering','Secure Payments','Fast Deliveries'].map(t=>(
            <span key={t} style={{ fontSize:13.5, fontWeight:600, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', padding:'7px 14px', borderRadius:9999 }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.75)' }}>general@yotemarket.com · 0720 730 861</div>
    </div>
  );
}

export function Auth({ onShopper, theme, onTheme }){
  const { signInEmail, registerEmail, signInGoogle, continueAsGuest } = useAuth();
  const [mode, setMode] = useSA('signin');
  const [role, setRole] = useSA('shopper');
  const [busy, setBusy] = useSA(false);
  const [err, setErr] = useSA('');
  const [name, setName] = useSA('Wanjiru Kamau');
  const [email, setEmail] = useSA('wanjiru.k@gmail.com');
  const [phone, setPhone] = useSA('0720 730 861');
  const [password, setPassword] = useSA('shopper1234');

  const finish = () => {
    if (ROLE_DEST[role]) { window.location.assign(ROLE_DEST[role]); return; }
    onShopper();
  };

  const submit = async (provider) => {
    setErr('');
    setBusy(true);
    try {
      if (provider === 'google') await signInGoogle();
      else if (provider === 'guest') continueAsGuest();
      else if (mode === 'register') await registerEmail(name, email, password);
      else await signInEmail(email, password);
      finish();
    } catch (e) {
      setErr(e.message || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'var(--m-bg)' }}>
      <div className="ym-card" style={{ width:'100%', maxWidth:980, minHeight:600, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden', boxShadow:'var(--m-shadow-float)' }}>
        <div className="auth-brand"><BrandPanel theme={theme} onTheme={onTheme} /></div>
        <div style={{ padding:'44px 44px', display:'flex', flexDirection:'column', justifyContent:'center', overflowY:'auto' }}>
          <div style={{ maxWidth:380, width:'100%', margin:'0 auto' }} className="anim-up">
            <h2 className="ym-h1" style={{ fontSize:26 }}>{mode==='signin'?'Welcome back':'Create your account'}</h2>
            <p className="ym-sub" style={{ marginTop:6 }}>{mode==='signin'?'Sign in to continue shopping the mall.':'Join Kenya’s virtual mall in a few taps.'}</p>

            {/* mode tabs */}
            <div style={{ display:'flex', gap:4, background:'var(--m-surface-2)', borderRadius:9999, padding:4, margin:'22px 0' }}>
              {[['signin','Sign in'],['register','Register']].map(([id,label])=>(
                <button key={id} onClick={()=>{ setMode(id); setErr(''); }} style={{ flex:1, height:42, borderRadius:9999, border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:14.5, fontWeight:600, transition:'all .2s',
                  background: mode===id?'var(--m-primary-deep)':'transparent', color: mode===id?'#fff':'var(--m-fg3)' }}>{label}</button>
              ))}
            </div>

            {/* role selection */}
            <div style={{ marginBottom:18 }}>
              <span className="ym-label">{mode==='register'?'I want to join as':'Sign in as'}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {ROLES.map(r=>(
                  <button key={r.id} onClick={()=>setRole(r.id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', textAlign:'left',
                    borderRadius:14, cursor:'pointer', fontFamily:'inherit', transition:'all .2s', background:'var(--m-surface)',
                    border: role===r.id?'2px solid var(--m-primary)':'2px solid var(--m-border)' }}>
                    <div style={{ width:44, height:44, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0,
                      background: role===r.id?'var(--m-primary)':'var(--m-surface-3)', color: role===r.id?'#fff':'var(--m-primary)' }}><FA i={r.icon} /></div>
                    <div style={{ flex:1 }}><div className="ym-h3">{r.label}</div><div className="ym-cap">{r.desc}</div></div>
                    {role===r.id && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:18 }} />}
                  </button>
                ))}
              </div>
              {role!=='shopper' && <div className="ym-cap" style={{ marginTop:8, display:'flex', gap:6, alignItems:'center' }}><FA i="fa-arrow-up-right-from-square" /> Opens the {role} {role==='merchant'?'dashboard':'app'} after sign-in.</div>}
            </div>

            {/* fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {mode==='register' && <div><label className="ym-label">Full name</label><input className="ym-input" value={name} onChange={e=>setName(e.target.value)} /></div>}
              <div><label className="ym-label">Email</label><input className="ym-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" autoComplete="email" /></div>
              {mode==='register' && <div><label className="ym-label">Phone number (M-Pesa)</label><input className="ym-input" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" /></div>}
              <div><label className="ym-label">Password</label><input className="ym-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} /></div>
              {mode==='signin' && <button type="button" style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13.5, fontWeight:600, color:'var(--m-link)', alignSelf:'flex-end' }}>Forgot password?</button>}

              {err && <div role="alert" style={{ display:'flex', gap:9, alignItems:'center', background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', borderRadius:11, padding:'11px 14px', fontSize:13.5, fontWeight:500 }}><FA i="fa-circle-exclamation" /> {err}</div>}

              <button className="ym-btn ym-btn-primary" disabled={busy} onClick={()=>submit()} style={{ marginTop:4 }}>
                {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Please wait…</> : (mode==='signin'?'Sign in':'Create account')}
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'2px 0' }}>
                <div style={{ flex:1, height:1, background:'var(--m-border)' }} /><span className="ym-cap">or</span><div style={{ flex:1, height:1, background:'var(--m-border)' }} />
              </div>

              <button className="ym-btn" disabled={busy} onClick={()=>submit('google')} style={{ background:'var(--m-surface)', color:'var(--m-fg1)', border:'1.5px solid var(--m-border)', boxShadow:'var(--m-shadow-card)' }}>
                <svg width="19" height="19" viewBox="0 0 48 48" style={{ flexShrink:0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                {mode==='signin'?'Sign in with Google':'Sign up with Google'}
              </button>
              <button className="ym-btn ym-btn-ghost" disabled={busy} onClick={()=>submit('guest')}>Continue as guest</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width:780px){ .auth-brand{ display:none; } }`}</style>
    </div>
  );
}
