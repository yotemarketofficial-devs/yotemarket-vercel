/* index.jsx — YotePOS: the Point-of-sale register as its own full-screen subsystem
   (/pos). Reuses the dashboard's register + merchant context/styling, but with a
   focused POS shell. Sign-in + subscription gating comes from MerchantGate; the
   device lock lives in the register itself. */
import React from 'react';
import '../dashboard/dashboard.css';
import { ThemeCtx, FA } from '../dashboard/primitives.jsx';
import { MerchantProvider, useShop, useMerchant } from '../dashboard/merchant.jsx';
import MerchantGate from '../dashboard/MerchantGate.jsx';
import { Pos } from '../dashboard/pos.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState, useEffect, useRef } = React;

function Toast({ toast }){
  if (!toast) return null;
  return <div role="status" aria-live="polite" style={{ position:'fixed', top:74, left:'50%', transform:'translateX(-50%)', zIndex:200, background:'#111827', color:'#fff', borderRadius:12, padding:'13px 18px', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:10, boxShadow:'var(--m-shadow-float)' }}><FA i="fa-circle-check" style={{ color:'#6ee7b7' }} /> {toast.m}</div>;
}

function PosShell(){
  const shop = useShop();
  const { role } = useMerchant();
  const { signOutUser } = useAuth();
  const [toast, setToastS] = useState(null);
  const t = useRef(null);
  const toastFn = (m) => { clearTimeout(t.current); setToastS({ m, k: Date.now() }); t.current = setTimeout(() => setToastS(null), 2600); };
  useEffect(() => () => clearTimeout(t.current), []);
  const roleLbl = ({ owner:'Owner', manager:'Manager', cashier:'Cashier' })[role] || 'Staff';
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--m-bg)' }}>
      <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
        <div style={{ maxWidth:1120, margin:'0 auto', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <span style={{ width:34, height:34, borderRadius:10, background:'var(--m-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--m-glow)', flexShrink:0 }}><FA i="fa-store" /></span>
            <div style={{ minWidth:0 }}>
              <div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{shop.name} · POS</div>
              <div className="ym-cap">{roleLbl}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href="/dashboard" className="ym-btn ym-btn-ghost ym-btn-sm"><FA i="fa-gauge-high" /> Dashboard</a>
            <button onClick={signOutUser} className="ym-btn ym-btn-ghost ym-btn-sm" aria-label="Sign out"><FA i="fa-arrow-right-from-bracket" /></button>
          </div>
        </div>
      </header>
      <main style={{ flex:1, padding:'20px 16px' }}>
        <div style={{ maxWidth:1120, margin:'0 auto' }}><Pos toast={toastFn} /></div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}

export default function PosApp(){
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ym_dash_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } });
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); try { localStorage.setItem('ym_dash_theme', theme); } catch { /* */ } }, [theme]);
  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <MerchantGate>
        <MerchantProvider><PosShell /></MerchantProvider>
      </MerchantGate>
    </ThemeCtx.Provider>
  );
}
