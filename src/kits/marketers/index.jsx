/* index.jsx — Marketers (scout) app shell: auth gate, sidebar nav, routing.
   Native React port of the design prototype (Tailwind utilities + scoped theme CSS). */
import React from 'react';
import './marketers.css';
import './tailwind.css';
import { ThemeProvider, Logo, Icon, Avatar, ThemeToggle } from './ui.jsx';
import { Login, Signup } from './auth.jsx';
import { Dashboard, Referrals, Leaderboard, Payouts, Simulator, Profile } from './screens.jsx';
import { ME, VERIFIED_COUNT, PENDING_COUNT } from './data.js';
import { calcEarnings, ksh } from './econ.js';
const { useState: useSApp } = React;

const NAV = [
  { key:'dashboard',  icon:'gauge-high',  label:'Dashboard' },
  { key:'referrals',  icon:'users',       label:'My referrals', badge: PENDING_COUNT },
  { key:'leaderboard',icon:'trophy',      label:'Leaderboard' },
  { key:'payouts',    icon:'wallet',      label:'Payouts' },
  { key:'simulator',  icon:'calculator',  label:'Simulator' },
  { key:'profile',    icon:'user-gear',   label:'Profile' },
];
const SCREENS = { dashboard:Dashboard, referrals:Referrals, leaderboard:Leaderboard, payouts:Payouts, simulator:Simulator, profile:Profile };
const LABELS = Object.fromEntries(NAV.map(n=>[n.key,n.label]));

function Sidebar({ active, go, onClose }){
  const earn = calcEarnings(VERIFIED_COUNT);
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center justify-between">
        <Logo size={28} />
        <button onClick={onClose} className="lg:hidden t3 w-8 h-8" aria-label="Close menu"><Icon name="xmark"/></button>
      </div>
      <div className="px-3">
        <div className="rounded-2xl p-4 grad text-white mb-4">
          <div className="text-xs" style={{color:'rgba(255,255,255,.75)'}}>Earnings this cycle</div>
          <div className="num font-extrabold mt-0.5" style={{fontSize:24,color:'var(--gold-bright)'}}>{ksh(earn.total)}</div>
          <div className="text-xs mt-1" style={{color:'rgba(255,255,255,.7)'}}>{VERIFIED_COUNT} verified merchants</div>
        </div>
      </div>
      <nav className="px-3 flex flex-col gap-1 flex-1">
        {NAV.map(n=>{
          const on = active===n.key;
          return (
            <button key={n.key} onClick={()=>{go(n.key); onClose&&onClose();}}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={ on?{background:'var(--purple-soft)',color:'var(--purple)'}:{color:'var(--t2)'}}>
              <Icon name={n.icon} className="w-5 text-center" style={{color: on?'var(--purple)':'var(--t3)'}} />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge>0 && <span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{background:'var(--gold)'}}>{n.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3">
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors t2" style={{background:'var(--surface2)'}}>
          <Icon name="grid-2" className="w-5 text-center t3"/> All subdomains
        </a>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors t2 w-full mt-1">
          <Icon name="right-from-bracket" className="w-5 text-center t3"/> Sign out
        </button>
      </div>
    </div>
  );
}

function App(){
  const [auth, setAuth] = useSApp('login'); // login | signup | app
  const [active, setActive] = useSApp('dashboard');
  const [menu, setMenu] = useSApp(false);

  if (auth==='login')  return <Login onLogin={()=>setAuth('app')} onSwitch={()=>setAuth('signup')} />;
  if (auth==='signup') return <Signup onDone={()=>setAuth('app')} onSwitch={()=>setAuth('login')} />;

  const Screen = SCREENS[active] || Dashboard;
  return (
    <div className="min-h-screen bg-page" data-screen-label={'Marketers — '+LABELS[active]}>
      <div className="flex">
        {/* desktop sidebar */}
        <aside className="hidden lg:block w-[260px] flex-shrink-0 sticky top-0 h-screen" style={{background:'var(--surface)', borderRight:'1px solid var(--line)'}}>
          <Sidebar active={active} go={setActive} />
        </aside>

        {/* mobile drawer */}
        {menu && (<div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0" style={{background:'rgba(20,8,37,.5)'}} onClick={()=>setMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px]" style={{background:'var(--surface)'}}><Sidebar active={active} go={setActive} onClose={()=>setMenu(false)} /></div>
        </div>)}

        <div className="flex-1 min-w-0">
          {/* topbar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 h-16" style={{background:'var(--surface)', borderBottom:'1px solid var(--line)'}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>setMenu(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center t2" style={{background:'var(--surface2)'}} aria-label="Menu"><Icon name="bars"/></button>
              <span className="text-sm font-semibold t3 hidden sm:flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs" style={{background:'var(--purple-soft)',color:'var(--purple)'}}>marketers.yotemarket.com</span>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="w-9 h-9 rounded-full flex items-center justify-center t2 relative" style={{background:'var(--surface2)',border:'1px solid var(--line)'}} aria-label="Notifications">
                <Icon name="bell"/><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{background:'var(--gold)'}}/>
              </button>
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-1">
                <Avatar src={ME.photo} name={ME.name} size={34} />
                <div className="hidden sm:block leading-tight">
                  <div className="text-sm font-semibold t1">{ME.first}</div>
                  <div className="text-xs t3">{ME.county}</div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-7 max-w-[1180px] mx-auto"><Screen go={setActive} /></main>

          <footer className="px-7 py-6 text-xs t3 flex flex-col sm:flex-row justify-between gap-2 max-w-[1180px] mx-auto">
            <span>© 2026 YoteMarket — Marketer Program · Founding cohort</span>
            <span className="flex gap-4"><a className="accent" href="#">Marketer terms</a><a className="accent" href="#">Help</a><span className="t3">v1.0</span></span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function MarketersApp(){
  return <ThemeProvider><App /></ThemeProvider>;
}
