/* primitives.jsx — Merchant dashboard primitives + theme context (shared YoteMarket look). */
import React from 'react';
const { createContext, useContext, useState } = React;

export const ThemeCtx = createContext({ theme:'light', setTheme:()=>{} });
export const useTheme = () => useContext(ThemeCtx);

export const FA = ({ i, brand=false, style, className='' }) => (
  <i className={`${brand?'fab':'fas'} ${i.startsWith('fa-')?i:'fa-'+i} ${className}`} style={style} aria-hidden="true" />
);

export const Card = ({ children, className='', style, onClick }) => (
  <div onClick={onClick} className={`ym-card ${className}`} style={style}>{children}</div>
);

export function Btn({ kind='primary', size='md', icon, brandIcon, iconRight, children, onClick, disabled, type='button', className='', style }){
  const cls = `ym-btn ym-btn-${kind} ${size==='sm'?'ym-btn-sm':''} ${className}`;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style}>
    {icon && <FA i={icon} />}{brandIcon && <FA i={brandIcon} brand />}{children}{iconRight && <FA i={iconRight} />}
  </button>;
}

export const Pill = ({ tone='active', children }) => <span className={`ym-pill ym-pill-${tone}`}><span style={{ width:6, height:6, borderRadius:9999, background:'currentColor' }} />{children}</span>;

export const Avatar = ({ src, name, size=38 }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={name||''} loading="lazy" onError={()=>setFailed(true)} style={{ width:size, height:size, borderRadius:9999, objectFit:'cover', flexShrink:0 }} />;
  }
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:9999, background:'var(--m-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>{initials}</div>;
};

export function Thumb({ icon, tint='#7c3aed', size=44, radius=12 }){
  return <div className="ym-img" style={{ width:size, height:size, borderRadius:radius, flexShrink:0, background:`linear-gradient(135deg, ${tint}2e, ${tint}55)` }}>
    <FA i={icon} style={{ fontSize:Math.round(size*0.4), color:tint, position:'relative' }} />
  </div>;
}

export function Stat({ label, value, delta, up, icon, tone='#7c3aed' }){
  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div className="ym-cap">{label}</div>
          <div style={{ fontSize:24, fontWeight:800, color:'var(--m-fg1)', marginTop:4 }}>{value}</div>
          {delta && <div style={{ fontSize:12, marginTop:8, fontWeight:600, display:'flex', alignItems:'center', gap:5, color: up?'var(--m-success)':'var(--m-danger)' }}><FA i={up?'fa-arrow-up':'fa-arrow-down'} /> {delta} <span style={{ color:'var(--m-fg4)', fontWeight:400 }}>vs last week</span></div>}
        </div>
        <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, background:tone+'22', color:tone }}><FA i={icon} /></div>
      </div>
    </Card>
  );
}

export function SectionCard({ title, sub, action, onAction, children }){
  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--m-border)' }}>
        <div><div className="ym-h2" style={{ fontSize:17 }}>{title}</div>{sub && <div className="ym-cap" style={{ marginTop:2 }}>{sub}</div>}</div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export const ThemeToggle = () => { const { theme, setTheme } = useTheme(); return <button className="icon-btn" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label="Toggle theme"><FA i={theme==='dark'?'fa-sun':'fa-moon'} /></button>; };

export const Logo = ({ size=28 }) => { const { theme } = useTheme(); return <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:size }} />; };

// Aliases used across the kit.
export { FA as Icon, Btn as Button, Pill as StatusPill };
