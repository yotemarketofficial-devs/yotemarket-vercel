/* index.jsx — Merchant dashboard shell: theme, in-app router, sidebar, toast.
   Native React port of the design prototype. */
import React from 'react';
import './dashboard.css';
import { ThemeCtx, FA } from './primitives.jsx';
import { MerchantProvider } from './merchant.jsx';
import { Sidebar, TopBar, Footer } from './layout.jsx';
import { Overview } from './overview.jsx';
import { Products, AddProductModal } from './products.jsx';
import { Sales, Wallet, Subscription, Settings, Chat, Assistant, Insight } from './extras.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useChatPush } from '../../lib/push.js';
const { useState, useEffect, useRef } = React;

const SCREENS = { overview:Overview, assistant:Assistant, insight:Insight, products:Products, sales:Sales, wallet:Wallet, chat:Chat, subscription:Subscription, settings:Settings };
const LABELS = { overview:'Overview', assistant:'YoteAI', insight:'YoteMarket Insight', products:'My Products', sales:'Sales', wallet:'Wallet', chat:'Chats', subscription:'Subscription', settings:'Settings' };

function Toast({ toast }){
  if(!toast) return null;
  return <div role="status" aria-live="polite" style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:200, background:'#111827', color:'#fff', borderRadius:12, padding:'13px 18px', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:10, boxShadow:'var(--m-shadow-float)' }}><FA i="fa-circle-check" style={{ color:'#6ee7b7' }} /> {toast.msg}</div>;
}

export default function DashboardApp(){
  const { user } = useAuth();
  const [theme, setTheme] = useState(()=>localStorage.getItem('ym_dash_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  const [active, setActive] = useState('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToastS] = useState(null);
  const timer = useRef(null);
  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ym_dash_theme', theme); }, [theme]);
  useEffect(()=>()=>clearTimeout(timer.current), []);
  const toastFn = (msg)=>{ clearTimeout(timer.current); setToastS({ msg, key:Date.now() }); timer.current=setTimeout(()=>setToastS(null), 2600); };

  // Register the merchant's browser for chat/order push; toast foreground messages.
  useChatPush(user, (payload)=>toastFn(payload?.notification?.title || 'New message'));

  const Screen = SCREENS[active] || Overview;
  const props = { onAdd:()=>setAddOpen(true), onCopyLink:()=>toastFn('Store link copied to clipboard!'), onOpenProducts:()=>setActive('products'), toast:toastFn };

  return (
    <MerchantProvider>
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <div data-screen-label={'Dashboard — '+LABELS[active]} style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        <TopBar onMenu={()=>setMenu(true)} onChange={setActive} />
        <main style={{ flex:1, padding:'28px 0' }}>
          <div className="wrap dash-shell" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:28, alignItems:'start' }}>
            <aside className="dash-aside" style={{ position:'sticky', top:88 }}><Sidebar active={active} onChange={setActive} /></aside>
            <div style={{ minWidth:0 }}><Screen {...props} /></div>
          </div>
        </main>

        {menu && (
          <div style={{ position:'fixed', inset:0, zIndex:90 }} onClick={e=>e.target===e.currentTarget&&setMenu(false)}>
            <div style={{ position:'absolute', inset:0, background:'rgba(8,10,24,.5)' }} />
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:300, background:'var(--m-bg)', padding:16, overflowY:'auto' }}>
              <button onClick={()=>setMenu(false)} className="icon-btn" aria-label="Close menu" style={{ marginBottom:12 }}><FA i="fa-xmark" /></button>
              <Sidebar active={active} onChange={k=>{ setActive(k); setMenu(false); }} onClose={()=>setMenu(false)} />
            </div>
          </div>
        )}

        <Footer />
        {addOpen && <AddProductModal onClose={()=>setAddOpen(false)} onSave={p=>{ setAddOpen(false); toastFn(`Published "${p.name||'new product'}"`); }} />}
        <Toast toast={toast} />
      </div>
      <style>{`@media (max-width:900px){ .dash-shell{ grid-template-columns:1fr !important; } .dash-aside{ display:none !important; } }`}</style>
    </ThemeCtx.Provider>
    </MerchantProvider>
  );
}
