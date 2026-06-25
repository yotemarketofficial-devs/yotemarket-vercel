/* index.jsx — Staff console shell: secure login gate, sidebar, confidential strip, routing.
   Native React port of the design prototype (Tailwind utilities + scoped theme CSS). */
import React from 'react';
import './staff.css';
import './tailwind.css';
import { ThemeProvider, Logo, Icon, Avatar, ThemeToggle } from './ui.jsx';
import { StaffLogin, StaffDenied, StaffSplash } from './auth.jsx';
import { Analytics, Approvals, Applications, Scouts, Logistics, Wallet, Moderation } from './screens.jsx';
import { Economics } from './economics.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useStaffClaims } from './service.js';
const { useState: useSApp } = React;

const NAV = [
  { key:'analytics',    icon:'gauge-high',     label:'Overview' },
  { key:'approvals',    icon:'user-check',     label:'Merchant approvals' },
  { key:'applications', icon:'briefcase',      label:'Marketer applications' },
  { key:'scouts',       icon:'people-group',   label:'Scouts & payouts' },
  { key:'logistics',    icon:'truck-fast',     label:'Orders & logistics' },
  { key:'wallet',       icon:'wallet',         label:'Subscriptions & wallet' },
  { key:'moderation',   icon:'comment-slash',  label:'Chat moderation' },
  { key:'economics',    icon:'scale-balanced', label:'Pricing & economics', lock:true },
];
const SCREENS = { analytics:Analytics, approvals:Approvals, applications:Applications, scouts:Scouts, logistics:Logistics, wallet:Wallet, moderation:Moderation, economics:Economics };
const LABELS = Object.fromEntries(NAV.map(n=>[n.key,n.label]));

function Sidebar({ active, go, onClose, onSignOut }){
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><Logo size={26} /><span className="text-xs font-semibold t3 border-l pl-2.5 b-line">Ops</span></div>
        <button onClick={onClose} className="lg:hidden t3 w-8 h-8" aria-label="Close menu"><Icon name="xmark"/></button>
      </div>
      <nav className="px-3 flex flex-col gap-1 flex-1">
        {NAV.map(n=>{
          const on = active===n.key;
          return (
            <button key={n.key} onClick={()=>{go(n.key); onClose&&onClose();}}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={ on?{background:'var(--pri-soft)',color:'var(--pri)'}:{color:'var(--t2)'}}>
              <Icon name={n.icon} className="w-5 text-center" style={{color: on?'var(--pri)':'var(--t3)'}} />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge>0 && <span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{background:'var(--amber)'}}>{n.badge}</span>}
              {n.lock && <Icon name="lock" className="text-xs" style={{color:'var(--red)'}} />}
            </button>
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
  const Screen = SCREENS[active] || Analytics;
  return (
    <div className="min-h-screen bg-page" data-screen-label={'Staff — '+LABELS[active]}>
      {/* confidential strip */}
      <div className="text-white text-xs font-semibold text-center py-1.5 px-4" style={{background:'var(--red)'}}>
        <Icon name="triangle-exclamation" className="mr-1.5"/>
        CONFIDENTIAL — internal staff &amp; admins only. Not visible to merchants, riders, marketers, or shoppers.
      </div>
      <div className="flex">
        <aside className="hidden lg:block w-[260px] flex-shrink-0 sticky top-0 h-screen" style={{background:'var(--surface)', borderRight:'1px solid var(--line)'}}>
          <Sidebar active={active} go={setActive} onSignOut={signOutUser} />
        </aside>

        {menu && (<div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0" style={{background:'rgba(8,12,24,.5)'}} onClick={()=>setMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px]" style={{background:'var(--surface)'}}><Sidebar active={active} go={setActive} onClose={()=>setMenu(false)} onSignOut={signOutUser} /></div>
        </div>)}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 h-16" style={{background:'var(--surface)', borderBottom:'1px solid var(--line)'}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>setMenu(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center t2" style={{background:'var(--surface2)'}} aria-label="Menu"><Icon name="bars"/></button>
              <span className="text-sm font-semibold t3 hidden sm:flex items-center">
                <span className="px-2 py-0.5 rounded-md text-xs" style={{background:'var(--pri-soft)',color:'var(--pri)'}}>staff.yotemarket.com</span>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 t3 text-sm"/>
                <input className="ym-input pl-9 py-2 text-sm" style={{width:200}} placeholder="Search merchants, runs…" />
              </div>
              <button className="w-9 h-9 rounded-full flex items-center justify-center t2 relative" style={{background:'var(--surface2)',border:'1px solid var(--line)'}} aria-label="Notifications">
                <Icon name="bell"/><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{background:'var(--red)'}}/>
              </button>
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-1">
                <Avatar src={user.photoURL} name={staffName} size={34} />
                <div className="hidden sm:block leading-tight"><div className="text-sm font-semibold t1">{staffName}</div><div className="text-xs t3">{staffRole}</div></div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-7 max-w-[1240px] mx-auto"><Screen /></main>

          <footer className="px-7 py-6 text-xs t3 flex flex-col sm:flex-row justify-between gap-2 max-w-[1240px] mx-auto">
            <span>© 2026 YoteMarket Limited — Internal Operations</span>
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
