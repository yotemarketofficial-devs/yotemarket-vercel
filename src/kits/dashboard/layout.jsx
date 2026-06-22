/* layout.jsx — Merchant dashboard sidebar, topbar, footer (aligned theme). */
import React from 'react';
import { FA, Avatar, Logo, ThemeToggle } from './primitives.jsx';
import { SHOP, ksh, SUBSCRIPTION } from './data.js';

export const NAV = [
  { key:'overview', icon:'fa-gauge-high', label:'Dashboard' },
  { key:'sales', icon:'fa-cash-register', label:'Sales' },
  { key:'products', icon:'fa-box', label:'My Products' },
  { key:'wallet', icon:'fa-wallet', label:'Wallet' },
  { key:'chat', icon:'fa-comments', label:'Chats', badge:2 },
  { key:'subscription', icon:'fa-id-card', label:'Subscription' },
  { key:'settings', icon:'fa-gear', label:'Settings' },
];

export function Sidebar({ active, onChange, onClose }){
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="ym-card" style={{ padding:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:16, borderBottom:'1px solid var(--m-border)' }}>
          <Avatar src={SHOP.photo} name={SHOP.owner} size={52} />
          <div style={{ minWidth:0 }}>
            <div className="ym-h3" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{SHOP.name}</div>
            <div className="ym-cap">{SHOP.role} · {SHOP.area}</div>
          </div>
        </div>
        <nav style={{ display:'flex', flexDirection:'column', gap:4, marginTop:14 }}>
          {NAV.map(n=>{
            const on = active===n.key;
            return (
              <button key={n.key} onClick={()=>{ onChange(n.key); onClose&&onClose(); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 12px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, textAlign:'left',
                  background: on?'var(--m-surface-3)':'transparent', color: on?'var(--m-primary)':'var(--m-fg2)' }}>
                <FA i={n.icon} style={{ width:18, textAlign:'center', color: on?'var(--m-primary)':'var(--m-fg3)' }} />
                <span style={{ flex:1 }}>{n.label}</span>
                {n.badge && <span style={{ minWidth:20, height:20, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{n.badge}</span>}
              </button>
            );
          })}
        </nav>
        <a href="/" className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:12 }}><FA i="fa-grip" /> All subdomains</a>
      </div>

      {/* subscription card — brand gradient */}
      <div className="ym-card" style={{ padding:18, background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'#fff', fontWeight:700, fontSize:14 }}><FA i="fa-crown" style={{ color:'var(--m-amber)' }} /> {SUBSCRIPTION.plan} plan</div>
        <div style={{ color:'rgba(255,255,255,.8)', fontSize:12.5, margin:'6px 0 12px' }}>{ksh(SUBSCRIPTION.price)}/mo · renews {SUBSCRIPTION.next}</div>
        <div style={{ height:7, borderRadius:9999, background:'rgba(255,255,255,.18)', overflow:'hidden' }}><div style={{ width:(SUBSCRIPTION.deliveriesUsed/SUBSCRIPTION.deliveriesCap*100)+'%', height:'100%', background:'linear-gradient(90deg,var(--m-amber),#fff)' }} /></div>
        <div style={{ color:'rgba(255,255,255,.8)', fontSize:11.5, marginTop:7 }}>{SUBSCRIPTION.deliveriesUsed}/{SUBSCRIPTION.deliveriesCap} bundled deliveries used</div>
      </div>
    </div>
  );
}

export function TopBar({ onMenu, onChange }){
  return (
    <header style={{ position:'sticky', top:0, zIndex:40, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
      <div className="wrap" style={{ height:64, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onMenu} className="icon-btn" aria-label="Menu" style={{ display:'none' }} data-menu><FA i="fa-bars" /></button>
          <Logo size={28} />
          <span className="ym-cap" style={{ borderLeft:'1px solid var(--m-border)', paddingLeft:12, fontWeight:600 }}>Merchant</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>window.open('/storefront','_blank')} className="ym-btn ym-btn-ghost ym-btn-sm view-shop"><FA i="fa-store" /> View storefront</button>
          <button className="icon-btn" aria-label="Notifications"><FA i="fa-bell" /><span style={{ position:'absolute', top:8, right:8, width:8, height:8, borderRadius:9999, background:'var(--m-danger)', border:'2px solid var(--m-surface)' }} /></button>
          <ThemeToggle />
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Avatar src={SHOP.photo} name={SHOP.owner} size={36} />
            <div className="acct" style={{ lineHeight:1.2 }}><div className="ym-h3" style={{ fontSize:13.5 }}>{SHOP.first}</div><div className="ym-cap">{SHOP.role}</div></div>
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
        <span className="ym-cap" style={{ display:'flex', gap:16 }}><a href="#">Help center</a><a href="#">Status</a><a href="#">Terms</a></span>
      </div>
    </footer>
  );
}
