/* index.jsx — Merchant dashboard shell: theme, in-app router, sidebar, toast.
   Native React port of the design prototype. */
import React from 'react';
import './dashboard.css';
import { ThemeCtx, FA } from './primitives.jsx';
import { MerchantProvider, useMerchant, useEntitlements } from './merchant.jsx';
import { Sidebar, MobileNav, TopBar, Footer, navForRole } from './layout.jsx';
import { UpgradeScreen } from './Upgrade.jsx';
import { SCREEN_FEATURE } from '../../lib/entitlements.js';
import { Overview } from './overview.jsx';
import { Products, AddProductModal } from './products.jsx';
import { Sales, Wallet, Subscription, Settings, Chat, Assistant, Insight } from './extras.jsx';
import { Disputes } from './disputes.jsx';
import { Broadcast } from './broadcast.jsx';
import { PosSetup } from './possetup.jsx';
import { FeedManager } from './feedmgr.jsx';
import { DeliverySettings } from './delivery.jsx';
import { TeamManager } from './team.jsx';
import { DashboardTour, isTourDone, markTourDone } from './Tour.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useChatPush } from '../../lib/push.js';
const { useState, useEffect, useRef } = React;

const SCREENS = { overview:Overview, pos:PosSetup, assistant:Assistant, insight:Insight, products:Products, feed:FeedManager, followers:Broadcast, delivery:DeliverySettings, sales:Sales, wallet:Wallet, refunds:Disputes, chat:Chat, subscription:Subscription, team:TeamManager, settings:Settings };
const LABELS = { overview:'Overview', pos:'Point of sale', assistant:'YoteAI', insight:'YoteMarket Insight', products:'My Products', feed:'YoteFeed', followers:'Followers', delivery:'Delivery', sales:'Sales', wallet:'Wallet', refunds:'Refunds', chat:'Chats', subscription:'Subscription', team:'Team', settings:'Settings' };

/* Renders the active screen, gated by the signed-in user's store role (an employee
   who lands on a screen they can't see is snapped back to the overview). */
function GuardedScreen({ active, setActive, screenProps }){
  const { role } = useMerchant();
  const ent = useEntitlements();
  const allowed = navForRole(role).map((n) => n.key);
  useEffect(() => { if (!allowed.includes(active)) setActive('overview'); }, [active, role]); // eslint-disable-line
  const key = allowed.includes(active) ? active : 'overview';
  // Plan gate: a premium screen the merchant's plan doesn't unlock shows the
  // upgrade screen instead (owner-scoped — employees pass through, see useEntitlements).
  const feat = SCREEN_FEATURE[key];
  if (feat && !ent.can(feat)) return <UpgradeScreen feature={feat} currentTier={ent.tier} onNav={setActive} />;
  const Screen = SCREENS[key] || Overview;
  return <Screen {...screenProps} />;
}

function Toast({ toast }){
  if(!toast) return null;
  return <div role="status" aria-live="polite" style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:200, background:'#111827', color:'#fff', borderRadius:12, padding:'13px 18px', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:10, boxShadow:'var(--m-shadow-float)' }}><FA i="fa-circle-check" style={{ color:'#6ee7b7' }} /> {toast.msg}</div>;
}

/* Lives inside MerchantProvider so it can read the merchant role — auto-runs the
   guided tour once for a new merchant, and renders it when opened (auto or via
   the top-bar “?”). */
function TourController({ open, setOpen, setActive }){
  const { uid, role } = useMerchant();
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || !role) return undefined;      // wait until the store role resolves
    if (isTourDone(uid)) { auto.current = true; return undefined; }
    auto.current = true;
    const t = setTimeout(() => setOpen(true), 900);   // let the shell paint first
    return () => clearTimeout(t);
  }, [role, uid, setOpen]);
  if (!open) return null;
  return <DashboardTour setActive={setActive} onClose={() => { setOpen(false); markTourDone(uid); }} />;
}

export default function DashboardApp(){
  const { user } = useAuth();
  const [theme, setTheme] = useState(()=>localStorage.getItem('ym_dash_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  const [active, setActive] = useState('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [toast, setToastS] = useState(null);
  const timer = useRef(null);
  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ym_dash_theme', theme); }, [theme]);
  useEffect(()=>()=>clearTimeout(timer.current), []);
  const toastFn = (msg)=>{ clearTimeout(timer.current); setToastS({ msg, key:Date.now() }); timer.current=setTimeout(()=>setToastS(null), 2600); };

  // Register the merchant's browser for chat/order push; toast foreground messages.
  useChatPush(user, (payload)=>toastFn(payload?.notification?.title || 'New message'));

  // A thread the merchant chose to start (Followers → Message). Handed to the Chat
  // screen so it opens on that customer; cleared the moment they navigate elsewhere,
  // or coming back to Chats later would keep re-opening an old conversation.
  const [chatStart, setChatStart] = useState(null);
  const go = (key) => { if (key !== 'chat') setChatStart(null); setActive(key); };

  const props = { onAdd:()=>setAddOpen(true), onCopyLink:()=>toastFn('Store link copied to clipboard!'), onOpenProducts:()=>go('products'), onNav:go, onTour:()=>setTourOpen(true), toast:toastFn,
    onOpenChat:(conv)=>{ setChatStart(conv); setActive('chat'); }, startConv:chatStart };

  return (
    <MerchantProvider>
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <div data-screen-label={'Dashboard — '+LABELS[active]} style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        <TopBar onMenu={()=>setMenu(true)} onChange={go} onHelp={()=>setTourOpen(true)} />
        <MobileNav active={active} onChange={go} />
        <main style={{ flex:1, padding:'28px 0' }}>
          <div className="wrap dash-shell" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:28, alignItems:'start' }}>
            <aside className="dash-aside" style={{ position:'sticky', top:88, maxHeight:'calc(100dvh - 108px)', overflowY:'auto' }}><Sidebar active={active} onChange={go} /></aside>
            <div style={{ minWidth:0 }}><GuardedScreen active={active} setActive={go} screenProps={props} /></div>
          </div>
        </main>

        {menu && (
          <div style={{ position:'fixed', inset:0, zIndex:90 }} onClick={e=>e.target===e.currentTarget&&setMenu(false)}>
            <div style={{ position:'absolute', inset:0, background:'rgba(8,10,24,.5)' }} />
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:300, background:'var(--m-bg)', padding:16, overflowY:'auto' }}>
              <button onClick={()=>setMenu(false)} className="icon-btn" aria-label="Close menu" style={{ marginBottom:12 }}><FA i="fa-xmark" /></button>
              <Sidebar active={active} onChange={k=>{ go(k); setMenu(false); }} onClose={()=>setMenu(false)} />
            </div>
          </div>
        )}

        <Footer />
        {addOpen && <AddProductModal onClose={()=>setAddOpen(false)} onSave={p=>{ setAddOpen(false); toastFn(`Published "${p.name||'new product'}"`); }} />}
        <TourController open={tourOpen} setOpen={setTourOpen} setActive={setActive} />
        <Toast toast={toast} />
      </div>
      <style>{`@media (max-width:900px){ .dash-shell{ grid-template-columns:1fr !important; } .dash-aside{ display:none !important; } }`}</style>
    </ThemeCtx.Provider>
    </MerchantProvider>
  );
}
