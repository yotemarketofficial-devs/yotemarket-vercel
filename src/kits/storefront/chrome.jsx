/* chrome.jsx — Storefront header, category nav, footer, cart drawer. */
import React from 'react';
import { useYM, FA, Thumb, QtyStepper } from './ui.jsx';
import { YM_CATEGORIES, ymProduct, ymPrice } from './data.js';
import { CATEGORY_TREE } from './categories.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useUnreadCount } from '../../lib/chat.js';
const { useState: useSC } = React;

export function Header(){
  const { nav, reset, cartCount, theme, setTheme, openCart, account, openAuth, signOut } = useYM();
  const { user } = useAuth();
  const unread = useUnreadCount(user);
  const [acct, setAcct] = useSC(false);
  const [menu, setMenu] = useSC(false);
  return (
    <header style={{ position:'sticky', top:0, zIndex:60, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
      <div className="wrap" style={{ height:68, display:'flex', alignItems:'center', gap:20 }}>
        <button onClick={()=>reset('home')} style={{ border:'none', background:'none', cursor:'pointer', flexShrink:0 }}>
          <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:28, display:'block' }} />
        </button>
        <button onClick={()=>nav('search')} style={{ flex:1, maxWidth:520, height:46, borderRadius:9999, border:'none', cursor:'pointer',
          background:'var(--m-surface-2)', display:'flex', alignItems:'center', gap:11, padding:'0 18px', fontFamily:'inherit', fontSize:14.5, color:'var(--m-fg3)' }}>
          <FA i="fa-magnifying-glass" style={{ color:'var(--m-primary)', fontSize:15 }} /> Search the mall…
        </button>
        <div style={{ flex:1 }} />
        <button onClick={()=>nav('ai')} className="icon-btn" aria-label="Ask YoteAI" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)' }}><FA i="fa-wand-magic-sparkles" /></button>
        <button onClick={()=>nav('messages')} className="icon-btn" aria-label="Messages">
          <FA i="fa-comments" />
          {unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-secondary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', border:'2px solid var(--m-bg)' }}>{unread>9?'9+':unread}</span>}
        </button>
        <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="icon-btn" aria-label="Toggle theme"><FA i={theme==='dark'?'fa-sun':'fa-moon'} /></button>
        <button onClick={openCart} className="icon-btn" aria-label="Cart">
          <FA i="fa-cart-shopping" />
          {cartCount>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:20, height:20, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', border:'2px solid var(--m-bg)' }}>{cartCount}</span>}
        </button>
        {account.hasAccount ? (
          <div style={{ position:'relative' }}>
            <button onClick={()=>setAcct(a=>!a)} style={{ display:'flex', alignItems:'center', gap:8, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit' }}>
              {account.photo
                ? <img src={account.photo} alt="" style={{ width:38, height:38, borderRadius:9999, objectFit:'cover' }} />
                : <div style={{ width:38, height:38, borderRadius:9999, background:'var(--m-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>{account.initials}</div>}
              <span className="ym-h3 acct-name" style={{ fontSize:14 }}>{account.first}</span>
            </button>
            {acct && (<>
              <div onClick={()=>setAcct(false)} style={{ position:'fixed', inset:0, zIndex:70 }} />
              <div className="ym-card anim-fade" style={{ position:'absolute', right:0, top:48, width:230, zIndex:71, padding:8, boxShadow:'var(--m-shadow-float)' }}>
                <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--m-border)', marginBottom:6 }}>
                  <div className="ym-h3">{account.name}</div><div className="ym-cap">{account.email || account.phone || 'Signed in'}</div>
                </div>
                {[['fa-user','My profile','profile'],['fa-box','My orders','orders'],['fa-comments','Messages','messages'],['fa-wand-magic-sparkles','Ask YoteAI','ai']].map(([ic,l,scr])=>(
                  <button key={l} onClick={()=>{ setAcct(false); if(scr) nav(scr); }} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, color:'var(--m-fg2)', borderRadius:10, textAlign:'left' }}>
                    <FA i={ic} style={{ width:18, color:'var(--m-fg3)' }} /> {l}
                  </button>
                ))}
                <button onClick={()=>{ setAcct(false); signOut(); }} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, color:'var(--m-inactive-fg)', borderRadius:10, marginTop:4, borderTop:'1px solid var(--m-border)' }}>
                  <FA i="fa-arrow-right-from-bracket" style={{ width:18 }} /> Sign out
                </button>
              </div>
            </>)}
          </div>
        ) : (
          <button onClick={openAuth} className="ym-btn ym-btn-primary ym-btn-sm" style={{ flexShrink:0 }}><FA i="fa-right-to-bracket" /> Sign in</button>
        )}
      </div>
      {/* category nav + multilevel mega-menu */}
      <div style={{ borderTop:'1px solid var(--m-border)' }}>
        <div className="wrap scroll-x" style={{ gap:8, padding:'10px 24px' }}>
          <button onClick={()=>setMenu(m=>!m)} className="ym-chip ym-btn-sm" style={{ height:36, flexShrink:0, background:'var(--m-primary-deep)', color:'#fff' }}>
            <FA i={menu?'fa-xmark':'fa-bars-staggered'} /> All categories
          </button>
          {YM_CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>nav('search',{cat:c.id})} className="ym-chip ym-btn-sm" style={{ height:36, flexShrink:0 }}>
              <FA i={c.icon} style={{ fontSize:13, color:c.id==='all'?'var(--m-primary)':c.tint }} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      {menu && (<>
        <div onClick={()=>setMenu(false)} style={{ position:'fixed', inset:0, zIndex:55 }} />
        <div className="ym-card anim-fade" style={{ position:'absolute', left:0, right:0, top:'100%', zIndex:56, margin:'0 16px', padding:'22px 24px', boxShadow:'var(--m-shadow-float)', maxHeight:'72vh', overflowY:'auto', borderRadius:'0 0 18px 18px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'22px 28px' }}>
            {CATEGORY_TREE.map(c=>(
              <div key={c.id}>
                <button onClick={()=>{ setMenu(false); nav('search',{cat:c.id}); }} style={{ display:'flex', alignItems:'center', gap:10, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', padding:0, marginBottom:10, width:'100%', textAlign:'left' }}>
                  <span style={{ width:32, height:32, borderRadius:10, flexShrink:0, background:c.tint+'22', color:c.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}><FA i={c.icon} /></span>
                  <span className="ym-h3" style={{ fontSize:14 }}>{c.label}</span>
                </button>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {c.subs.map(s=>(
                    <button key={s} onClick={()=>{ setMenu(false); nav('search',{cat:c.id, sub:s}); }} className="cat-sub" style={{ textAlign:'left', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--m-fg3)', padding:'5px 0 5px 42px' }}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>)}
      <style>{`@media (max-width:640px){ .acct-name{ display:none; } } .cat-sub:hover{ color:var(--m-primary) !important; }`}</style>
    </header>
  );
}

export function Footer(){
  const { theme } = useYM();
  return (
    <footer style={{ background:'var(--m-surface)', borderTop:'1px solid var(--m-border)', marginTop:48 }}>
      <div className="wrap" style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr', gap:32, padding:'48px 24px 32px' }}>
        <div>
          <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:26, marginBottom:14 }} />
          <p className="ym-sub" style={{ maxWidth:300 }}>Kenya's virtual mall — shop hundreds of local stores, chat &amp; negotiate in the app messenger, pay with M-Pesa, and collect at your nearest hub.</p>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            {['fa-facebook-f','fa-instagram','fa-whatsapp','fa-x-twitter'].map(i=>(
              <a key={i} href="#" className="icon-btn" aria-label={i.replace('fa-','')} style={{ width:36, height:36, fontSize:14 }}><FA i={i} brand /></a>
            ))}
          </div>
        </div>
        <div>
          <div className="ym-h3" style={{ marginBottom:14 }}>Shop</div>
          {['Categories','Featured stores','Hubs near you','Track an order'].map(l=><div key={l} className="ym-sub" style={{ marginBottom:10, cursor:'pointer' }}>{l}</div>)}
        </div>
        <div>
          <div className="ym-h3" style={{ marginBottom:14 }}>Company</div>
          {['Sell on YoteMarket','Become a rider','Help center','Contact us'].map(l=><div key={l} className="ym-sub" style={{ marginBottom:10, cursor:'pointer' }}>{l}</div>)}
        </div>
      </div>
      <div className="wrap" style={{ borderTop:'1px solid var(--m-border)', padding:'18px 24px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <span className="ym-cap">© 2026 YoteMarket — Shop Local. Delivered Fast.</span>
        <span className="ym-cap">general@yotemarket.com · 0720 730 861</span>
      </div>
    </footer>
  );
}

export function CartDrawer(){
  const { cart, cartOpen, closeCart, setCartQty, removeFromCart, nav } = useYM();
  const items = cart.map(c=>({ ...c, p:ymProduct(c.pid) })).filter(x=>x.p);
  const subtotal = items.reduce((s,x)=>s+x.p.price*x.qty,0);
  if(!cartOpen) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:120 }}>
      <div className="anim-fade" onClick={closeCart} style={{ position:'absolute', inset:0, background:'rgba(17,24,39,.45)' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'min(420px, 100%)', background:'var(--m-bg)', boxShadow:'var(--m-shadow-float)', display:'flex', flexDirection:'column', animation:'ym-fade .25s ease' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 22px', borderBottom:'1px solid var(--m-border)' }}>
          <span className="ym-h2">Your cart <span className="ym-cap" style={{ fontWeight:600 }}>· {items.length} item{items.length!==1?'s':''}</span></span>
          <button onClick={closeCart} className="icon-btn" aria-label="Close cart"><FA i="fa-xmark" /></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'14px 22px' }}>
          {items.length===0 ? (
            <div style={{ textAlign:'center', padding:'70px 20px', color:'var(--m-fg3)' }}>
              <FA i="fa-cart-shopping" style={{ fontSize:40, color:'var(--m-fg4)', marginBottom:14 }} />
              <div className="ym-h3">Your cart is empty</div>
              <div className="ym-sub" style={{ marginTop:4 }}>Browse the mall to add items.</div>
            </div>
          ) : items.map(x=>(
            <div key={x.pid} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid var(--m-border)' }}>
              <Thumb icon={x.p.icon} tint={'#7c3aed'} size={64} radius={14} img={x.p.img} />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="ym-h3" style={{ fontSize:14 }}>{x.p.name}</div>
                <div style={{ fontWeight:700, color:'var(--m-fg1)', margin:'4px 0 8px' }}>{ymPrice(x.p.price)}</div>
                <QtyStepper qty={x.qty} onChange={q=>setCartQty(x.pid,q)} onRemove={()=>removeFromCart(x.pid)} />
              </div>
            </div>
          ))}
        </div>
        {items.length>0 && (
          <div style={{ padding:'18px 22px 22px', borderTop:'1px solid var(--m-border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <span className="ym-h3">Subtotal</span><span className="ym-h2" style={{ fontSize:20 }}>{ymPrice(subtotal)}</span>
            </div>
            <button className="ym-btn ym-btn-primary" style={{ width:'100%' }} onClick={()=>{ closeCart(); nav('checkout'); }}>
              <FA i="fa-lock" /> Checkout · {ymPrice(subtotal)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
