/* index.jsx — Staff console shell: secure login gate, sidebar, confidential strip, routing.
   Native React port of the design prototype (Tailwind utilities + scoped theme CSS). */
import React from 'react';
import './staff.css';
import './tailwind.css';
import { ThemeProvider, Logo, Icon, Avatar, ThemeToggle } from './ui.jsx';
import { StaffLogin, StaffDenied, StaffSplash } from './auth.jsx';
import { Analytics, Approvals, Applications, Scouts, Logistics, Wallet, Moderation, ReviewModeration, Team } from './screens.jsx';
import { Economics } from './economics.jsx';
import { Promotions } from './promotions.jsx';
import { People, Finance, Legal } from './departments.jsx';
import { Intelligence } from './intelligence.jsx';
import { Accounts } from './accounts.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useStaffClaims, fetchReports, fetchReviewReports, fetchPayouts, fetchMerchantFollows } from './service.js';
const { useState: useSApp, useEffect: useEApp } = React;

const NAV = [
  { key:'analytics',    icon:'gauge-high',     label:'Overview',               section:'Operations' },
  { key:'approvals',    icon:'user-check',     label:'Merchant approvals',     section:'Operations' },
  { key:'logistics',    icon:'truck-fast',     label:'Orders & logistics',     section:'Operations' },
  { key:'moderation',   icon:'comment-slash',  label:'Chat moderation',        section:'Operations' },
  { key:'reviews',      icon:'star-half-stroke', label:'Review moderation',     section:'Operations' },

  { key:'applications', icon:'briefcase',      label:'Marketer applications',  section:'Growth' },
  { key:'scouts',       icon:'people-group',   label:'Scouts & payouts',       section:'Growth' },
  { key:'wallet',       icon:'wallet',         label:'Subscriptions & wallet', section:'Growth' },
  { key:'promotions',   icon:'tags',           label:'Promotions & offers',    section:'Growth', adminOnly:true },

  { key:'intelligence', icon:'chart-pie',      label:'Business intelligence',  section:'Company', adminOnly:true },
  { key:'people',       icon:'users',          label:'People & HR',            section:'Company' },
  { key:'finance',      icon:'chart-line',     label:'Finance',                section:'Company' },
  { key:'legal',        icon:'gavel',          label:'Legal',                  section:'Company' },

  { key:'accounts',     icon:'address-book',   label:'Accounts',               section:'Admin', adminOnly:true },
  { key:'team',         icon:'user-shield',    label:'Team & roles',           section:'Admin', adminOnly:true },
  { key:'economics',    icon:'scale-balanced', label:'Pricing & economics',    section:'Admin', lock:true },
];
const SCREENS = { analytics:Analytics, approvals:Approvals, applications:Applications, scouts:Scouts, logistics:Logistics, wallet:Wallet, promotions:Promotions, intelligence:Intelligence, people:People, finance:Finance, legal:Legal, accounts:Accounts, moderation:Moderation, reviews:ReviewModeration, team:Team, economics:Economics };
const LABELS = Object.fromEntries(NAV.map(n=>[n.key,n.label]));

function Sidebar({ active, go, onClose, onSignOut, isAdmin }){
  const items = NAV.filter(n => !n.adminOnly || isAdmin);
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center justify-between">
        <button onClick={()=>{go('analytics'); onClose&&onClose();}} className="flex items-center gap-2.5" style={{ background:'none', border:'none', cursor:'pointer', padding:0 }} aria-label="Go to overview"><Logo size={26} /><span className="text-xs font-semibold t3 border-l pl-2.5 b-line">Ops</span></button>
        <button onClick={onClose} className="lg:hidden t3 w-8 h-8" aria-label="Close menu"><Icon name="xmark"/></button>
      </div>
      <nav className="px-3 flex flex-col gap-0.5 flex-1 overflow-y-auto pb-3">
        {items.map((n,i)=>{
          const on = active===n.key;
          const newSection = n.section && n.section !== (items[i-1] && items[i-1].section);
          return (
            <React.Fragment key={n.key}>
              {newSection && <div className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase t3" style={{letterSpacing:'.08em'}}>{n.section}</div>}
              <button onClick={()=>{go(n.key); onClose&&onClose();}}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={ on?{background:'var(--pri-soft)',color:'var(--pri)'}:{color:'var(--t2)'}}>
                <Icon name={n.icon} className="w-5 text-center" style={{color: on?'var(--pri)':'var(--t3)'}} />
                <span className="flex-1 text-left">{n.label}</span>
                {n.badge>0 && <span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{background:'var(--amber)'}}>{n.badge}</span>}
                {n.lock && <Icon name="lock" className="text-xs" style={{color:'var(--red)'}} />}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <div className="p-3">
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold t2" style={{background:'var(--surface2)'}}>
          <Icon name="grid-2" className="w-5 text-center t3"/> All subdomains
        </a>
        <button onClick={onSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold t2 w-full mt-1">
          <Icon name="right-from-bracket" className="w-5 text-center t3"/> Sign out
        </button>
      </div>
    </div>
  );
}

/* Quick-jump command palette — type to filter sections and Enter/click to navigate. */
function QuickSearch({ items, go }){
  const [q, setQ] = useSApp('');
  const [open, setOpen] = useSApp(false);
  const ql = q.trim().toLowerCase();
  const matches = ql ? items.filter(n => n.label.toLowerCase().includes(ql) || (n.section||'').toLowerCase().includes(ql)) : [];
  const pick = (key) => { go(key); setQ(''); setOpen(false); };
  return (
    <div className="relative hidden md:block" style={{ width:230 }}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm" style={{ pointerEvents:'none' }}/>
      <input value={q} onChange={e=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        onKeyDown={e=>{ if(e.key==='Enter' && matches[0]){ pick(matches[0].key); } else if(e.key==='Escape'){ setOpen(false); e.currentTarget.blur(); } }}
        className="ym-input pl-9 py-2 text-sm" style={{ width:'100%' }} placeholder="Jump to a section…" aria-label="Search sections" />
      {open && ql && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50" style={{ background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)' }}>
          {matches.length ? matches.slice(0,7).map(n=>(
            <button key={n.key} onMouseDown={()=>pick(n.key)} className="staff-pop-item flex items-center gap-3 w-full px-3.5 py-2.5 text-sm text-left" style={{ background:'none', border:'none', cursor:'pointer' }}>
              <Icon name={n.icon} className="w-4 text-center t3"/>
              <span className="flex-1 t1 font-semibold">{n.label}</span>
              <span className="text-[11px] t3">{n.section}</span>
            </button>
          )) : <div className="px-3.5 py-3 text-sm t3">No section matches “{q}”.</div>}
        </div>
      )}
      <style>{`.staff-pop-item:hover{ background:var(--surface2); }`}</style>
    </div>
  );
}

/* Notifications bell — real pending counts across the staff queues; click to jump. */
function NotificationsBell({ go }){
  const [items, setItems] = useSApp([]);
  const [open, setOpen] = useSApp(false);
  useEApp(() => {
    let alive = true;
    Promise.allSettled([fetchReports(), fetchReviewReports(), fetchPayouts(), fetchMerchantFollows()]).then(res => {
      if (!alive) return;
      const [reports, reviews, payouts, follows] = res.map(r => (r.status==='fulfilled' && Array.isArray(r.value)) ? r.value : []);
      setItems([
        reports.length && { key:'moderation', icon:'comment-slash', label:'Chat reports', count:reports.length },
        reviews.length && { key:'reviews', icon:'star-half-stroke', label:'Review reports', count:reviews.length },
        payouts.length && { key:'scouts', icon:'wallet', label:'Scout payouts', count:payouts.length },
        follows.length && { key:'scouts', icon:'user-check', label:'Follow proofs', count:follows.length },
      ].filter(Boolean));
    });
    return () => { alive = false; };
  }, []);
  const total = items.reduce((a,i)=>a+i.count, 0);
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="w-9 h-9 rounded-full flex items-center justify-center t2 relative" style={{background:'var(--surface2)',border:'1px solid var(--line)'}} aria-label={`Notifications${total?` (${total} pending)`:''}`}>
        <Icon name="bell"/>
        {total>0 && <span className="absolute -top-1 -right-1 num text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" style={{background:'var(--red)'}}>{total>9?'9+':total}</span>}
      </button>
      {open && (<>
        <div className="fixed inset-0 z-40" onClick={()=>setOpen(false)} />
        <div className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ width:256, background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--line)' }}><span className="font-bold t1 text-sm">Needs attention</span>{total>0 && <span className="num text-xs t3">{total}</span>}</div>
          {items.length ? items.map((n,i)=>(
            <button key={i} onClick={()=>{ go(n.key); setOpen(false); }} className="staff-pop-item flex items-center gap-3 w-full px-4 py-3 text-left" style={{ background:'none', border:'none', cursor:'pointer' }}>
              <Icon name={n.icon} className="w-4 text-center" style={{ color:'var(--pri)' }}/>
              <span className="flex-1 t1 text-sm font-semibold">{n.label}</span>
              <span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{ background:'var(--amber)' }}>{n.count}</span>
            </button>
          )) : <div className="px-4 py-6 text-sm t3 text-center"><Icon name="circle-check" style={{ color:'var(--green)' }}/><div className="mt-1">All clear — nothing pending.</div></div>}
        </div>
        <style>{`.staff-pop-item:hover{ background:var(--surface2); }`}</style>
      </>)}
    </div>
  );
}

function App(){
  const { user, loading, isStaff, role } = useStaffClaims();
  const { signOutUser } = useAuth();
  const [active, setActive] = useSApp('analytics');
  const [menu, setMenu] = useSApp(false);

  if (loading) return <StaffSplash />;
  if (!user) return <StaffLogin />;
  if (!isStaff) return <StaffDenied email={user.email} onSignOut={signOutUser} />;

  const staffName = user.displayName || (user.email ? user.email.split('@')[0] : 'Staff');
  const staffRole = role === 'admin' ? 'Operations Admin' : 'Moderator';
  const activeNav = NAV.find(n => n.key === active);
  const visibleNav = NAV.filter(n => !n.adminOnly || role === 'admin');
  const effective = (activeNav && activeNav.adminOnly && role !== 'admin') ? 'analytics' : active;
  const Screen = SCREENS[effective] || Analytics;
  return (
    <div className="min-h-screen bg-page" data-screen-label={'Staff — '+LABELS[active]}>
      <div className="flex">
        <aside className="hidden lg:block w-[260px] flex-shrink-0 sticky top-0 h-screen" style={{background:'var(--surface)', borderRight:'1px solid var(--line)'}}>
          <Sidebar active={active} go={setActive} onSignOut={signOutUser} isAdmin={role==='admin'} />
        </aside>

        {menu && (<div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0" style={{background:'rgba(8,12,24,.5)'}} onClick={()=>setMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px]" style={{background:'var(--surface)'}}><Sidebar active={active} go={setActive} onClose={()=>setMenu(false)} onSignOut={signOutUser} isAdmin={role==='admin'} /></div>
        </div>)}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 h-16" style={{background:'var(--surface)', borderBottom:'1px solid var(--line)'}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>setMenu(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center t2" style={{background:'var(--surface2)'}} aria-label="Menu"><Icon name="bars"/></button>
              <span className="text-sm font-semibold t3 hidden sm:flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs" style={{background:'var(--pri-soft)',color:'var(--pri)'}}>staff.yotemarket.com</span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{background:'var(--surface2)',color:'var(--t3)'}} title="Internal staff & admins only — not visible to merchants, riders, marketers or shoppers."><Icon name="lock" className="text-[10px]"/> Confidential · Internal</span>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <QuickSearch items={visibleNav} go={setActive} />
              <NotificationsBell go={setActive} />
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-1">
                <Avatar src={user.photoURL} name={staffName} size={34} />
                <div className="hidden sm:block leading-tight"><div className="text-sm font-semibold t1">{staffName}</div><div className="text-xs t3">{staffRole}</div></div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-7 max-w-[1240px] mx-auto"><Screen isAdmin={role==='admin'} /></main>

          <footer className="px-7 py-6 text-xs t3 flex flex-col sm:flex-row justify-between gap-2 max-w-[1240px] mx-auto">
            <span>© 2026 Yote Market Limited — Internal Operations</span>
            <span>Source: Internal Pricing &amp; Unit Economics v2 · single source of truth: economics.js</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function StaffApp(){
  return <ThemeProvider><App /></ThemeProvider>;
}
