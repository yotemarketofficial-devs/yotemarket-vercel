/* index.jsx — YotePOS: the Point-of-sale register as its own full-screen subsystem
   (/pos). Reuses the dashboard's register + merchant context/styling, but with a
   focused POS shell (store logo, light/dark, terminal settings). Sign-in +
   subscription gating comes from MerchantGate; the device lock lives in the register.
   Cashiers are routed straight here (they can't use the store dashboard). */
import React from 'react';
import '../dashboard/dashboard.css';
import { ThemeCtx, FA } from '../dashboard/primitives.jsx';
import { MerchantProvider, useShop, useMerchant } from '../dashboard/merchant.jsx';
import MerchantGate from '../dashboard/MerchantGate.jsx';
import { Pos } from '../dashboard/pos.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState, useEffect, useRef, useContext } = React;

function Toast({ toast }){
  if (!toast) return null;
  return <div role="status" aria-live="polite" style={{ position:'fixed', top:74, left:'50%', transform:'translateX(-50%)', zIndex:200, background:'#111827', color:'#fff', borderRadius:12, padding:'13px 18px', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:10, boxShadow:'var(--m-shadow-float)' }}><FA i="fa-circle-check" style={{ color:'#6ee7b7' }} /> {toast.m}</div>;
}

/* A localStorage-backed on/off preference the register reads at sale time. */
function useFlag(key){
  const [on, setOn] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const set = (v) => { setOn(v); try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* */ } };
  return [on, set];
}

function Toggle({ checked, onChange }){
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{ width:44, height:26, borderRadius:9999, border:'none', cursor:'pointer', flexShrink:0, padding:2, background: checked ? 'var(--m-primary)' : 'var(--m-surface-3)', transition:'background .15s' }}>
      <span style={{ display:'block', width:22, height:22, borderRadius:9999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transform: checked ? 'translateX(18px)' : 'translateX(0)', transition:'transform .15s' }} />
    </button>
  );
}

function SettingRow({ icon, title, sub, children }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderTop:'1px solid var(--m-border)' }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FA i={icon} /></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:14 }}>{title}</div>
        {sub && <div className="ym-cap">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/* Terminal settings: appearance + a few sale preferences (persisted per device). */
function PosSettings({ onClose }){
  const { theme, setTheme } = useContext(ThemeCtx);
  const [autoPrint, setAutoPrint] = useFlag('ym_pos_autoprint');
  const [beep, setBeep] = useFlag('ym_pos_beep');
  const [keypad, setKeypadRaw] = useFlag('ym_pos_keypad');
  // Keep the register (which owns the live keypad) in sync when toggled from here.
  const setKeypad = (v) => { setKeypadRaw(v); try { window.dispatchEvent(new CustomEvent('ym-pos-keypad', { detail: v })); } catch { /* */ } };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(8,12,24,.55)' }} />
      <div className="ym-card" style={{ position:'relative', width:'100%', maxWidth:440, padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px' }}>
          <div className="ym-h3"><FA i="fa-gear" style={{ color:'var(--m-primary)', marginRight:8 }} />Terminal settings</div>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>

        <SettingRow icon="fa-circle-half-stroke" title="Appearance" sub="Light or dark — saved on this device.">
          <div style={{ display:'flex', border:'1px solid var(--m-border)', borderRadius:10, overflow:'hidden' }}>
            {[['light', 'fa-sun', 'Light'], ['dark', 'fa-moon', 'Dark']].map(([t, ic, lb]) => (
              <button key={t} onClick={() => setTheme(t)} style={{ padding:'8px 12px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, display:'inline-flex', alignItems:'center', gap:6, background: theme === t ? 'var(--m-primary)' : 'var(--m-surface)', color: theme === t ? '#fff' : 'var(--m-fg2)' }}><FA i={ic} /> {lb}</button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon="fa-print" title="Auto-print receipt" sub="Print automatically after each completed sale.">
          <Toggle checked={autoPrint} onChange={setAutoPrint} />
        </SettingRow>

        <SettingRow icon="fa-volume-high" title="Beep on sale" sub="Play a confirmation tone when a sale completes.">
          <Toggle checked={beep} onChange={setBeep} />
        </SettingRow>

        <SettingRow icon="fa-calculator" title="On-screen keypad" sub="Number pad for touchscreens (also in the register toolbar).">
          <Toggle checked={keypad} onChange={setKeypad} />
        </SettingRow>

        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--m-border)' }}>
          <div className="ym-cap"><FA i="fa-circle-info" style={{ marginRight:6 }} />Scanner &amp; printer connections live in the register's <b>Devices</b> panel.</div>
        </div>
      </div>
    </div>
  );
}

function PosShell(){
  const shop = useShop();
  const { role } = useMerchant();
  const { theme, setTheme } = useContext(ThemeCtx);
  const { signOutUser } = useAuth();
  const [toast, setToastS] = useState(null);
  const [settings, setSettings] = useState(false);
  const t = useRef(null);
  const toastFn = (m) => { clearTimeout(t.current); setToastS({ m, k: Date.now() }); t.current = setTimeout(() => setToastS(null), 2600); };
  useEffect(() => () => clearTimeout(t.current), []);
  const roleLbl = ({ owner:'Owner', manager:'Manager', cashier:'Cashier' })[role] || 'Staff';
  const isCashier = role === 'cashier';
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--m-bg)' }}>
      <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
        <div style={{ maxWidth:1120, margin:'0 auto', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <span style={{ width:36, height:36, borderRadius:10, overflow:'hidden', background: shop.logo ? 'var(--m-surface-2)' : 'var(--m-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: shop.logo ? 'none' : 'var(--m-glow)', flexShrink:0, border: shop.logo ? '1px solid var(--m-border)' : 'none' }}>
              {shop.logo ? <img src={shop.logo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-store" />}
            </span>
            <div style={{ minWidth:0 }}>
              <div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{shop.name} · POS</div>
              <div className="ym-cap">{roleLbl}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="icon-btn" aria-label="Toggle light / dark" title="Light / dark"><FA i={theme === 'dark' ? 'fa-sun' : 'fa-moon'} /></button>
            <button onClick={() => setSettings(true)} className="icon-btn" aria-label="Terminal settings" title="Settings"><FA i="fa-gear" /></button>
            {/* Cashiers are terminal-only — no route back into the store dashboard. */}
            {!isCashier && <a href="/dashboard" className="ym-btn ym-btn-ghost ym-btn-sm"><FA i="fa-gauge-high" /> Dashboard</a>}
            <button onClick={signOutUser} className="icon-btn" aria-label="Sign out" title="Sign out"><FA i="fa-arrow-right-from-bracket" /></button>
          </div>
        </div>
      </header>
      <main style={{ flex:1, padding:'20px 16px' }}>
        <div style={{ maxWidth:1120, margin:'0 auto' }}><Pos toast={toastFn} /></div>
      </main>
      {settings && <PosSettings onClose={() => setSettings(false)} />}
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
