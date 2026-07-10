/* layout.jsx — Merchant dashboard sidebar, topbar, footer (aligned theme). */
import React from 'react';
import { FA, Avatar, Logo, ThemeToggle } from './primitives.jsx';
import { ksh } from './data.js';
import { useShop, useSubCard, useMerchant } from './merchant.jsx';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import YoteFeedMark from '../../components/YoteFeedMark.jsx';

// `roles` = which store roles see the item. owner = all; manager = everything except
// money (wallet/subscription) & team; cashier = POS + orders + chat.
const ALL = ['owner', 'manager', 'cashier'];
const OM = ['owner', 'manager'];
export const NAV = [
  { key:'overview', icon:'fa-gauge-high', label:'Dashboard', roles:ALL },
  { key:'pos', icon:'fa-store', label:'Point of sale', roles:ALL },
  { key:'assistant', icon:'fa-wand-magic-sparkles', mark:'ai', label:'YoteAI', roles:OM },
  { key:'insight', icon:'fa-lightbulb', label:'YoteMarket Insight', roles:OM },
  { key:'sales', icon:'fa-cash-register', label:'Sales', roles:OM },
  { key:'products', icon:'fa-box', label:'My Products', roles:OM },
  { key:'feed', icon:'fa-clapperboard', mark:'feed', label:'YoteFeed', roles:OM },
  { key:'delivery', icon:'fa-truck-fast', label:'Delivery', roles:OM },
  { key:'chat', icon:'fa-comments', label:'Chats', roles:ALL },
  { key:'wallet', icon:'fa-wallet', label:'Wallet', roles:['owner'] },
  { key:'subscription', icon:'fa-id-card', label:'Subscription', roles:['owner'] },
  { key:'team', icon:'fa-user-group', label:'Team', roles:['owner'] },
  { key:'settings', icon:'fa-gear', label:'Settings', roles:['owner'] },
];

/** Nav items visible to a role ('owner' when unknown/demo). */
export const navForRole = (role) => NAV.filter((n) => n.roles.includes(role || 'owner'));

/* Nav icon — the YoteAI/YoteFeed brand marks for those items, else the FA glyph. */
function NavIcon({ n, color, size = 18 }){
  if (n.mark === 'ai') return <span style={{ width:size, display:'inline-flex', justifyContent:'center', color }}><YoteAiMark size={size - 1} color="currentColor" /></span>;
  if (n.mark === 'feed') return <span style={{ width:size, display:'inline-flex', justifyContent:'center' }}><YoteFeedMark size={size - 4} /></span>;
  return <FA i={n.icon} style={{ width:size, textAlign:'center', color }} />;
}

/* Mobile primary nav — a sticky, horizontally-scrollable strip of pills shown under
   the top bar on narrow screens (the sidebar is hidden there). Always visible so a
   merchant can switch sections without opening the drawer. */
export function MobileNav({ active, onChange }){
  const { role } = useMerchant();
  const items = navForRole(role);
  return (
    <div className="dash-mobilenav">
      <div className="dash-mobilenav-in" role="tablist" aria-label="Sections">
        {items.map((n) => {
          const on = active === n.key;
          return (
            <button key={n.key} role="tab" aria-selected={on} onClick={() => onChange(n.key)} className={'dmn-pill' + (on ? ' on' : '')}>
              <NavIcon n={n} size={16} color={on ? '#fff' : 'var(--m-fg3)'} /> {n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ active, onChange, onClose }){
  const shop = useShop();
  const subc = useSubCard();
  const { role } = useMerchant();
  const items = navForRole(role);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="ym-card" style={{ padding:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:16, borderBottom:'1px solid var(--m-border)' }}>
          <Avatar src={shop.photo} name={shop.owner} size={52} />
          <div style={{ minWidth:0 }}>
            <div className="ym-h3" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{shop.name}</div>
            <div className="ym-cap">{({ owner:'Owner', manager:'Manager', cashier:'Cashier' })[role] || shop.role}{shop.area ? ' · ' + shop.area : ''}</div>
          </div>
        </div>
        <nav style={{ display:'flex', flexDirection:'column', gap:4, marginTop:14 }}>
          {items.map(n=>{
            const on = active===n.key;
            return (
              <button key={n.key} data-tour={n.key} onClick={()=>{ onChange(n.key); onClose&&onClose(); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 12px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, textAlign:'left',
                  background: on?'var(--m-surface-3)':'transparent', color: on?'var(--m-primary)':'var(--m-fg2)' }}>
                <NavIcon n={n} color={on ? 'var(--m-primary)' : 'var(--m-fg3)'} />
                <span style={{ flex:1 }}>{n.label}</span>
                {n.badge && <span style={{ minWidth:20, height:20, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{n.badge}</span>}
              </button>
            );
          })}
        </nav>
        <a href="/" className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:12 }}><FA i="fa-grip" /> All subdomains</a>
      </div>

      {/* subscription card — brand gradient */}
      <div className="ym-card" style={{ padding:18, background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)', cursor:'pointer' }} onClick={()=>onChange&&onChange('subscription')}>
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'#fff', fontWeight:700, fontSize:14 }}><FA i="fa-crown" style={{ color:'var(--m-amber)' }} /> {subc.active ? (subc.kind==='software' ? subc.plan + ' · Software' : subc.plan + ' plan') : 'No active plan'}</div>
        <div style={{ color:'rgba(255,255,255,.8)', fontSize:12.5, margin:'6px 0 12px' }}>{subc.active ? `${ksh(subc.price)}/mo · renews ${subc.next}` : 'Choose a plan to start selling'}</div>
        {subc.active && subc.kind!=='software' ? (<>
          <div style={{ height:7, borderRadius:9999, background:'rgba(255,255,255,.18)', overflow:'hidden' }}><div style={{ width:(subc.deliveriesCap ? subc.deliveriesUsed/subc.deliveriesCap*100 : 0)+'%', height:'100%', background:'linear-gradient(90deg,var(--m-amber),#fff)' }} /></div>
          <div style={{ color:'rgba(255,255,255,.8)', fontSize:11.5, marginTop:7 }}>{subc.deliveriesUsed}/{subc.deliveriesCap} bundled deliveries used{subc.range ? ' · ' + subc.range : ''}</div>
        </>) : (
          <div style={{ color:'rgba(255,255,255,.8)', fontSize:11.5 }}>{subc.active ? 'Software-only plan' : 'Tap to subscribe'}</div>
        )}
      </div>
    </div>
  );
}

export function TopBar({ onMenu, onChange, onHelp }){
  const shop = useShop();
  return (
    <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
      <div className="wrap" style={{ height:64, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onMenu} className="icon-btn" aria-label="Menu" style={{ display:'none' }} data-menu><FA i="fa-bars" /></button>
          <button onClick={()=>onChange&&onChange('overview')} aria-label="Go to overview" style={{ border:'none', background:'none', cursor:'pointer', padding:0, display:'flex' }}><Logo size={28} /></button>
          <span className="ym-cap" style={{ borderLeft:'1px solid var(--m-border)', paddingLeft:12, fontWeight:600 }}>Merchant</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>window.open('/storefront','_blank')} className="ym-btn ym-btn-ghost ym-btn-sm view-shop"><FA i="fa-store" /> View storefront</button>
          {onHelp && <button onClick={onHelp} className="icon-btn" aria-label="Take a tour" title="Take a tour"><FA i="fa-circle-question" /></button>}
          <button onClick={()=>onChange&&onChange('chat')} className="icon-btn" aria-label="Messages" title="Messages"><FA i="fa-bell" /></button>
          <ThemeToggle />
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Avatar src={shop.photo} name={shop.owner} size={36} />
            <div className="acct" style={{ lineHeight:1.2 }}><div className="ym-h3" style={{ fontSize:13.5 }}>{shop.first}</div><div className="ym-cap">{shop.role}</div></div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width:900px){ header [data-menu]{ display:flex !important; } } @media (max-width:560px){ .view-shop,.acct{ display:none !important; } }`}</style>
    </header>
  );
}

export function Footer(){
  return (
    <footer style={{ borderTop:'1px solid var(--m-border)', background:'var(--m-surface)', marginTop:40 }}>
      <div className="wrap" style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <span className="ym-cap">© 2026 YoteMarket — Merchant Dashboard</span>
        <span className="ym-cap" style={{ display:'flex', gap:16 }}><a href="/help?topic=selling">Help center</a><a href="/help?topic=selling#faqs">Seller FAQs</a><a href="/terms" target="_blank" rel="noreferrer">Terms</a></span>
      </div>
    </footer>
  );
}
