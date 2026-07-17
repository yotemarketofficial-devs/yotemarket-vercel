/* primitives.jsx — Merchant dashboard primitives + theme context (shared YoteMarket look). */
import React from 'react';
const { createContext, useContext, useState } = React;

export const ThemeCtx = createContext({ theme:'light', setTheme:()=>{} });
export const useTheme = () => useContext(ThemeCtx);

/* An icon must NEVER take a screen down. This did `i.startsWith(...)` on the raw
   prop, so any non-string `i` threw "i.startsWith is not a function" and blanked the
   whole view — that's what crashed the POS register. `i` reaches here from live data
   (a product's `icon`) and from pass-through props (Thumb/Stat/Btn), so it can be
   undefined, a number, or a Firestore value; coerce and fall back instead of trusting it. */
const FA_FALLBACK = 'fa-circle-question';
export const FA = ({ i, brand=false, style, className='' }) => {
  let n = typeof i === 'string' ? i.trim() : '';
  if (!n) {
    if (i != null && i !== '' && import.meta.env?.DEV) {
      // Surface the bad call site in dev — the UI stays up either way.
      console.warn('[FA] icon prop is not a string:', i);
    }
    n = FA_FALLBACK;
  }
  return <i className={`${brand?'fab':'fas'} ${n.startsWith('fa-')?n:'fa-'+n} ${className}`} style={style} aria-hidden="true" />;
};

export const Card = ({ children, className='', style, onClick, ...rest }) => (
  <div onClick={onClick} className={`ym-card ${className}`} style={style} {...rest}>{children}</div>
);

export function Btn({ kind='primary', size='md', icon, brandIcon, iconRight, children, onClick, disabled, type='button', className='', style, ...rest }){
  const cls = `ym-btn ym-btn-${kind} ${size==='sm'?'ym-btn-sm':''} ${className}`;
  // `brandIcon` is used TWO ways across the app:
  //   <Btn icon="fa-whatsapp" brandIcon>   → a boolean FLAG: render `icon` as a brand glyph
  //   <Btn brandIcon="fa-whatsapp">        → an icon NAME to render as a brand glyph
  // It used to pass the prop straight to FA, so the boolean form rendered
  // <FA i={true}> → "i.startsWith is not a function" → crashed the POS register when
  // the Devices panel opened. Honour both, and note the flag form is also the only
  // way these icons render correctly (fa-whatsapp/fa-bluetooth-b are `fab`, not `fas`).
  const brandFlag = brandIcon === true;
  const namedBrand = typeof brandIcon === 'string' ? brandIcon : null;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style} {...rest}>
    {icon && <FA i={icon} brand={brandFlag} />}{namedBrand && <FA i={namedBrand} brand />}{children}{iconRight && <FA i={iconRight} />}
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

export function SectionCard({ title, sub, action, onAction, children, ...rest }){
  return (
    <Card style={{ padding:0, overflow:'hidden' }} {...rest}>
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
