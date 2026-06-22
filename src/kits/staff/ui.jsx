/* ui.jsx — Staff console theme + primitives. Indigo/neutral, light/dark. */
import React from 'react';
const { useState, useEffect, createContext, useContext } = React;

export const ThemeCtx = createContext({ dark:false, toggle:()=>{} });
export const useTheme = () => useContext(ThemeCtx);
export function ThemeProvider({ children }){
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('ym_staff_theme');
    if (s) return s==='dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('ym_staff_theme', dark?'dark':'light'); }, [dark]);
  return <ThemeCtx.Provider value={{ dark, toggle:()=>setDark(d=>!d) }}>{children}</ThemeCtx.Provider>;
}

export const Icon = ({ name, brand=false, className='', style }) => (
  <i className={`${brand?'fab':'fas'} fa-${name} ${className}`} style={style} aria-hidden="true" />
);
export const Logo = ({ size=28 }) => {
  const { dark } = useTheme();
  return <img src={dark?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{height:size}} />;
};
export const Card = ({ children, className='', style, onClick }) => (
  <div onClick={onClick} className={`card ${className}`} style={style}>{children}</div>
);

export function Btn({ kind='primary', size='md', icon, brandIcon, iconRight, children, onClick, disabled, type='button', className='', style }){
  const sizes = { sm:'text-sm px-3 py-1.5', md:'text-sm px-4 py-2', lg:'text-base px-5 py-2.5' };
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg cursor-pointer transition-all border-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const st = { ...style };
  if (kind==='primary'){ st.background='var(--pri)'; st.color='#fff'; }
  if (kind==='soft'){ st.background='var(--surface2)'; st.color='var(--t1)'; st.border='1px solid var(--line2)'; }
  if (kind==='outline'){ st.border='1px solid var(--pri)'; st.color='var(--pri)'; }
  if (kind==='ghost'){ st.color='var(--t2)'; }
  if (kind==='success'){ st.background='var(--green)'; st.color='#fff'; }
  if (kind==='danger'){ st.background='var(--red)'; st.color='#fff'; }
  const hov = kind==='soft'||kind==='ghost' ? 'hover:brightness-95' : 'hover:brightness-110';
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={st} className={`${base} ${sizes[size]} ${hov} ${className}`}>
      {icon && <Icon name={icon}/>}{brandIcon && <Icon name={brandIcon} brand/>}{children}{iconRight && <Icon name={iconRight}/>}
    </button>
  );
}

export const Pill = ({ tone='ok', children }) => (
  <span className={`pill pill-${tone}`}><span className="w-1.5 h-1.5 rounded-full" style={{background:'currentColor'}}/>{children}</span>
);

export const Avatar = ({ src, name, size=38, ring }) => {
  const [failed, setFailed] = useState(false);
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div className="relative inline-block flex-shrink-0" style={{width:size,height:size}}>
      {src && !failed ? <img src={src} alt={name} loading="lazy" onError={()=>setFailed(true)} className="w-full h-full rounded-full object-cover" style={ring?{boxShadow:`0 0 0 2px ${ring}`}:null}/>
        : <div className="w-full h-full rounded-full flex items-center justify-center font-bold" style={{background:'var(--pri-soft)',color:'var(--pri)',fontSize:size*0.38}}>{initials}</div>}
    </div>
  );
};

export function Stat({ label, value, sub, icon, tone='pri', deltaUp, delta }){
  const tones = {
    pri:{bg:'var(--pri-soft)',fg:'var(--pri)'}, green:{bg:'var(--green-bg)',fg:'var(--green)'},
    amber:{bg:'var(--amber-bg)',fg:'var(--amber)'}, blue:{bg:'var(--blue-bg)',fg:'var(--blue)'},
    red:{bg:'var(--red-bg)',fg:'var(--red)'},
  };
  const c = tones[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm t3">{label}</div>
          <div className="text-2xl font-bold t1 mt-1 num">{value}</div>
          {delta && <div className="text-xs mt-2 flex items-center gap-1 font-semibold" style={{color:deltaUp?'var(--green)':'var(--red)'}}>
            <Icon name={deltaUp?'arrow-up':'arrow-down'}/>{delta}<span className="t3 font-normal">vs last month</span></div>}
          {sub && !delta && <div className="text-xs t3 mt-1.5">{sub}</div>}
        </div>
        {icon && <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:c.bg,color:c.fg}}><Icon name={icon}/></div>}
      </div>
    </Card>
  );
}

export const Bar = ({ pct, color }) => (
  <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--bg2)'}}>
    <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,Math.max(0,pct))}%`, background:color||'var(--pri)'}}/>
  </div>
);

export function SectionHead({ icon, title, sub, action }){
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-start gap-3">
        {icon && <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--pri-soft)',color:'var(--pri)'}}><Icon name={icon}/></div>}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold t1 leading-tight">{title}</h1>
          {sub && <p className="text-sm t3 mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Seg({ value, onChange, options, fmt }){
  return (
    <div className="inline-flex rounded-lg p-1 flex-wrap gap-1" style={{background:'var(--surface2)',border:'1px solid var(--line)'}}>
      {options.map(o=>(
        <button key={o} onClick={()=>onChange(o)} className="px-3 py-1.5 rounded-md text-sm font-semibold transition"
          style={value===o?{background:'var(--surface)',color:'var(--pri)',boxShadow:'var(--shadow)'}:{color:'var(--t3)'}}>{fmt?fmt(o):o}</button>
      ))}
    </div>
  );
}

export const ThemeToggle = () => {
  const { dark, toggle } = useTheme();
  return <button onClick={toggle} title="Toggle theme" aria-label="Toggle theme" className="w-9 h-9 rounded-full flex items-center justify-center"
    style={{background:'var(--surface2)',color:'var(--t2)',border:'1px solid var(--line)'}}><Icon name={dark?'sun':'moon'}/></button>;
};

export const kes = n => 'KSh ' + Number(Math.round(n)).toLocaleString('en-KE');
