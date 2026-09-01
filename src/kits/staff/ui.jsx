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
  // Solid kinds use --on-accent, NOT a hardcoded #fff: dark-theme accents are light
  // pastels, so white text on them was ~1.5:1 contrast — the "white on white" buttons.
  if (kind==='primary'){ st.background='var(--pri)'; st.color='var(--on-accent)'; }
  if (kind==='soft'){ st.background='var(--surface2)'; st.color='var(--t1)'; st.border='1px solid var(--line2)'; }
  if (kind==='outline'){ st.border='1px solid var(--pri)'; st.color='var(--pri)'; }
  if (kind==='ghost'){ st.color='var(--t2)'; }
  if (kind==='success'){ st.background='var(--green)'; st.color='var(--on-accent)'; }
  if (kind==='danger'){ st.background='var(--red)'; st.color='var(--on-accent)'; }
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
      {/* Centred against the text when the title stands alone — the chip is 40px and a
          single title line is nearer 30, so top-aligning left it visibly hanging. With a
          subtitle the chip stays top-aligned so it pairs with the TITLE rather than
          drifting to the middle of a block that may run to several lines. */}
      <div className={`flex gap-3 ${sub ? 'items-start' : 'items-center'}`}>
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

/* ── Shared data primitives (consistent tables / modals / empty states) ────── */

/* BackendError — shown when a staff read FAILS against a real backend. The console
   deliberately shows nothing rather than demo figures in that case (see
   useStaffResource), so this says plainly that the numbers are missing, not zero. */
export function BackendError({ error, onRetry }){
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4"
      style={{ background:'var(--red-bg)', border:'1px solid var(--red)', color:'var(--red)' }}>
      <Icon name="triangle-exclamation" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">Couldn’t load live data</div>
        <div className="text-xs mt-0.5" style={{ opacity:.9 }}>{String(error)} — this screen is blank rather than showing stale or sample figures. Don’t treat it as zero.</div>
      </div>
      {onRetry && <Btn kind="soft" size="sm" icon="rotate" onClick={onRetry}>Retry</Btn>}
    </div>
  );
}

// EmptyState — one look for every "nothing here" moment.
export function EmptyState({ icon='inbox', title='Nothing here yet.', sub, tone='t3' }){
  const tones = { t3:['var(--surface2)','var(--t3)'], green:['var(--green-bg)','var(--green)'], amber:['var(--amber-bg)','var(--amber)'], red:['var(--red-bg)','var(--red)'] };
  const c = tones[tone] || tones.t3;
  return (
    <div className="px-5 py-10 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background:c[0], color:c[1] }}><Icon name={icon} className="text-xl"/></div>
      <div className="font-semibold t1">{title}</div>
      {sub && <div className="text-sm t3 mt-1 max-w-md mx-auto">{sub}</div>}
    </div>
  );
}

/* DataTable — config-driven table with the house header/row styling, its own
   horizontal-scroll wrapper and a built-in empty state. Optional column sorting
   (set `sort:true` or a `sortValue(row)`) and pagination (`pageSize`).
   columns: [{ key, header, align?, width?, render?(row), sort?, sortValue?(row), csvValue?(row), csv? }]. */
export function DataTable({ columns, rows, keyField='id', onRowClick, empty, minWidth=520, pageSize, initialSort }){
  const [sort, setSort] = useState(initialSort || null); // { key, dir }
  const [page, setPage] = useState(0);
  const total0 = (rows || []).length;
  useEffect(() => { setPage(0); }, [total0, sort && sort.key, sort && sort.dir]);

  const sortable = (c) => c.sort === true || typeof c.sortValue === 'function';
  let view = rows || [];
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      const val = (r) => (col.sortValue ? col.sortValue(r) : r[col.key]);
      view = [...view].sort((a, b) => {
        const av = val(a); const bv = val(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = (typeof av === 'number' && typeof bv === 'number')
          ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sort.dir === 'desc' ? -cmp : cmp;
      });
    }
  }
  const total = view.length;
  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const p = Math.min(page, pages - 1);
  const pageRows = pageSize ? view.slice(p * pageSize, p * pageSize + pageSize) : view;
  const toggleSort = (c) => { if (sortable(c)) setSort((s) => (s && s.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' })); };

  if (!rows || rows.length === 0) return empty || <EmptyState />;
  return (
    <div>
      <div className="overflow-x-auto no-bar">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead><tr className="t3" style={{ textAlign:'left', background:'var(--surface2)' }}>
            {columns.map((c) => {
              const on = sort && sort.key === c.key;
              // A sortable header is a real <button> so it's keyboard-operable, and the
              // <th> carries aria-sort so screen readers announce the current order.
              return (
                <th key={c.key} className="px-4 py-2.5 font-semibold select-none"
                  aria-sort={sortable(c) ? (on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  style={{ textAlign:c.align||'left', whiteSpace:'nowrap', width:c.width }}>
                  {sortable(c) ? (
                    <button type="button" onClick={() => toggleSort(c)}
                      title={`Sort by ${typeof c.header === 'string' ? c.header : c.key}`}
                      style={{ background:'none', border:'none', padding:0, margin:0, font:'inherit', color:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center' }}>
                      {c.header}
                      <Icon name={on ? (sort.dir === 'asc' ? 'caret-up' : 'caret-down') : 'sort'} className="ml-1.5" style={{ opacity: on ? 0.8 : 0.35 }} />
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr></thead>
          <tbody>{pageRows.map((r, i) => (
            <tr key={r[keyField] ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{ borderTop:'1px solid var(--line)', cursor:onRowClick ? 'pointer' : 'default' }}>
              {columns.map((c) => <td key={c.key} className="px-4 py-3" style={{ textAlign:c.align||'left' }}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {pageSize && total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 text-xs t3" style={{ borderTop:'1px solid var(--line)' }}>
          <span className="num">{p * pageSize + 1}–{Math.min(total, (p + 1) * pageSize)} of {total}</span>
          <div className="flex items-center gap-1.5">
            <button disabled={p === 0} onClick={() => setPage(p - 1)} className="px-2.5 py-1 rounded-md font-semibold disabled:opacity-40" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}><Icon name="chevron-left"/></button>
            <span className="num px-1">Page {p + 1} / {pages}</span>
            <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className="px-2.5 py-1 rounded-md font-semibold disabled:opacity-40" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}><Icon name="chevron-right"/></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Download rows as a CSV. Uses each column's `csvValue(row)` when given, else its
   `key`; columns with `csv:false` (e.g. an Actions column) are skipped. */
export function exportCsv(filename, columns, rows){
  const cols = columns.filter((c) => c.csv !== false && (c.csvValue || (!c.render && c.key)));
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [cols.map((c) => esc(c.header)).join(',')];
  (rows || []).forEach((r) => lines.push(cols.map((c) => esc(c.csvValue ? c.csvValue(r) : r[c.key])).join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Modal — one shell for every dialog: overlay + panel + header (icon/title/close)
// + scrollable body + optional footer. Escape and backdrop-click close it.
export function Modal({ title, subtitle, icon, onClose, children, footer, maxWidth=520 }){
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background:'rgba(8,12,24,.55)', backdropFilter:'blur(3px)' }}>
      <div className="rounded-2xl overflow-hidden flex flex-col w-full" style={{ maxWidth, maxHeight:'86vh', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -18px rgba(0,0,0,.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--line)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name={icon}/></div>}
            <div className="min-w-0"><div className="font-bold t1 truncate">{title}</div>{subtitle && <div className="text-xs t3 truncate">{subtitle}</div>}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center t3 flex-shrink-0" style={{ background:'var(--surface2)' }} aria-label="Close"><Icon name="xmark"/></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 flex items-center gap-2 justify-end" style={{ borderTop:'1px solid var(--line)' }}>{footer}</div>}
      </div>
    </div>
  );
}
