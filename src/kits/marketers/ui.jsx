/* ui.jsx — Marketers app theme + shared primitives. Purple+gold, light/dark. */
import React from 'react';
import { ksh } from './econ.js';
const { useState, useEffect, createContext, useContext } = React;

/* ---------- theme ---------- */
export const ThemeCtx = createContext({ dark:false, toggle:()=>{}, accent:'gold', setAccent:()=>{} });
export function useTheme(){ return useContext(ThemeCtx); }

export function ThemeProvider({ children }){
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('ym_mk_theme');
    if (s) return s === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  // accent for the EARNINGS treatment — gold (brand) vs indigo (product).
  const [accent, setAccentS] = useState(() => localStorage.getItem('ym_mk_accent') || 'gold');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ym_mk_theme', dark ? 'dark' : 'light');
  }, [dark]);
  const setAccent = (a) => { setAccentS(a); localStorage.setItem('ym_mk_accent', a); };
  return (
    <ThemeCtx.Provider value={{ dark, toggle:()=>setDark(d=>!d), accent, setAccent }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// resolve the earnings accent to concrete colors
export function useEarn(){
  const { accent } = useTheme();
  return accent === 'indigo'
    ? { fg:'var(--purple)', bg:'var(--purple-soft)', line:'var(--line2)', label:'indigo' }
    : { fg:'var(--gold)',   bg:'var(--gold-bg)',    line:'var(--gold-line)', label:'gold' };
}

/* ---------- atoms ---------- */
export const Icon = ({ name, brand=false, className='', style }) => (
  <i className={`${brand?'fab':'fas'} fa-${name} ${className}`} style={style} aria-hidden="true" />
);

export const Logo = ({ size=30, white=false }) => {
  const { dark } = useTheme();
  const src = (white || dark) ? '/assets/logo-white.png' : '/assets/logo.png';
  // width:auto + block + shrink-0 keeps the wordmark's aspect ratio and stops
  // flex parents from stretching it.
  return <img src={src} alt="YoteMarket" className="block flex-shrink-0 self-start"
    style={{ height:size, width:'auto' }} />;
};

export const Card = ({ children, className='', style, flat=false, onClick }) => (
  <div onClick={onClick} className={`${flat?'card-flat':'card'} ${className}`} style={style}>{children}</div>
);

export function Btn({ kind='primary', size='md', icon, brandIcon, iconRight, children, onClick, disabled, type='button', className='', style }){
  const sizes = { sm:'text-sm px-3 py-2', md:'text-sm px-4 py-2.5', lg:'text-base px-6 py-3' };
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl cursor-pointer transition-all border-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const kinds = {
    primary:  'text-white hover:brightness-110',
    gold:     'hover:brightness-105',
    soft:     'hover:brightness-95',
    outline:  'bg-transparent hover:bg-[var(--surface2)]',
    ghost:    'bg-transparent hover:bg-[var(--surface2)]',
    whatsapp: 'text-white hover:brightness-110',
    mpesa:    'text-white hover:brightness-110',
  };
  const st = { ...style };
  if (kind==='primary')  st.background = 'var(--grad)';
  if (kind==='gold')    { st.background = 'var(--gold-bright)'; st.color = '#3A2606'; }
  if (kind==='soft')    { st.background = 'var(--surface2)'; st.color = 'var(--t1)'; st.border='1px solid var(--line2)'; }
  if (kind==='outline') { st.border = '1px solid var(--purple)'; st.color = 'var(--purple)'; }
  if (kind==='ghost')    st.color = 'var(--t2)';
  if (kind==='whatsapp') st.background = '#25D366';
  if (kind==='mpesa')    st.background = '#009B3A';
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={st}
      className={`${base} ${sizes[size]} ${kinds[kind]} ${className}`}>
      {icon && <Icon name={icon} />}{brandIcon && <Icon name={brandIcon} brand />}
      {children}{iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export const Pill = ({ tone='ok', children }) => (
  <span className={`pill pill-${tone==='verified'?'ok':tone==='paid'?'ok':tone}`}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background:'currentColor' }} />{children}
  </span>
);

export const Avatar = ({ src, name, size=40, ring }) => {
  const [failed, setFailed] = useState(false);
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div className="relative inline-block flex-shrink-0" style={{ width:size, height:size }}>
      {src && !failed
        ? <img src={src} alt={name} loading="lazy" onError={()=>setFailed(true)} className="w-full h-full rounded-full object-cover" style={ring?{boxShadow:`0 0 0 2px ${ring}`}:null} />
        : <div className="w-full h-full rounded-full flex items-center justify-center font-bold"
            style={{ background:'var(--purple-soft)', color:'var(--purple)', fontSize:size*0.38, boxShadow:ring?`0 0 0 2px ${ring}`:null }}>{initials}</div>}
    </div>
  );
};

/* stat tile */
export function Stat({ label, value, sub, icon, tone='purple', earn=false }){
  const e = useEarn();
  const tones = {
    purple:{ bg:'var(--purple-soft)', fg:'var(--purple)' },
    green: { bg:'var(--green-bg)', fg:'var(--green)' },
    gold:  { bg:'var(--gold-bg)', fg:'var(--gold)' },
    plain: { bg:'var(--surface2)', fg:'var(--t2)' },
  };
  const c = earn ? { bg:e.bg, fg:e.fg } : tones[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm t3">{label}</div>
          <div className="text-2xl font-bold t1 mt-1 num" style={earn?{color:e.fg}:null}>{value}</div>
          {sub && <div className="text-xs t3 mt-1.5">{sub}</div>}
        </div>
        {icon && <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background:c.bg, color:c.fg }}><Icon name={icon} /></div>}
      </div>
    </Card>
  );
}

/* progress bar */
export const Bar = ({ pct, color }) => (
  <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'var(--bg2)' }}>
    <div className="h-full rounded-full transition-all duration-500" style={{ width:`${Math.min(100,Math.max(0,pct))}%`, background: color || 'var(--grad)' }} />
  </div>
);

/* rank medal */
export const Medal = ({ rank }) => {
  const colors = { 1:['#F4B530','#7A5A06'], 2:['#C7CBD4','#3F4451'], 3:['#D9925A','#5E3414'] };
  const c = colors[rank];
  if (!c) return <span className="num font-bold t3 w-7 text-center inline-block">{rank}</span>;
  return <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold num"
    style={{ background:c[0], color:c[1] }}>{rank}</span>;
};

export const ThemeToggle = () => {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} title="Toggle theme" aria-label="Toggle theme"
      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
      style={{ background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>
      <Icon name={dark?'sun':'moon'} />
    </button>
  );
};
