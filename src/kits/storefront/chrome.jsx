/* chrome.jsx — Storefront header, category nav, footer, cart drawer. */
import React from 'react';
import { useYM, FA, Thumb, QtyStepper } from './ui.jsx';
import { ymProduct, ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useUnreadCount } from '../../lib/chat.js';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import YoteFeedMark from '../../components/YoteFeedMark.jsx';
const { useState: useSC } = React;

export function Header(){
  const { nav, reset, cartCount, theme, setTheme, openCart, account, openAuth, signOut } = useYM();
  const { user } = useAuth();
  const unread = useUnreadCount(user);
  const [acct, setAcct] = useSC(false);
  return (
    <header style={{ position:'sticky', top:0, zIndex:60, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
      <div className="wrap ym-hdr" style={{ height:68, display:'flex', alignItems:'center', gap:20 }}>
        <button onClick={()=>reset('home')} style={{ border:'none', background:'none', cursor:'pointer', flexShrink:0 }}>
          <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:28, display:'block' }} />
        </button>
        <button onClick={()=>nav('search')} className="ym-hdr-search" style={{ flex:1, maxWidth:520, height:46, borderRadius:9999, border:'none', cursor:'pointer',
          background:'var(--m-surface-2)', display:'flex', alignItems:'center', gap:11, padding:'0 18px', fontFamily:'inherit', fontSize:14.5, color:'var(--m-fg3)' }}>
          <FA i="fa-magnifying-glass" style={{ color:'var(--m-primary)', fontSize:15 }} /> Search the mall…
        </button>
        <div className="ym-hdr-spacer" style={{ flex:1 }} />
        <button onClick={()=>nav('feed')} className="icon-btn" aria-label="YoteFeed"><YoteFeedMark size={22} /></button>
        <button onClick={()=>nav('ai')} className="icon-btn" aria-label="Ask YoteAI" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)' }}><YoteAiMark size={25} color="#fff" /></button>
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
                    {scr==='ai'
                      ? <span style={{ width:18, display:'inline-flex', justifyContent:'center', color:'var(--m-fg3)' }}><YoteAiMark size={16} color="currentColor" /></span>
                      : <FA i={ic} style={{ width:18, color:'var(--m-fg3)' }} />} {l}
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
      <style>{`
        @media (max-width:640px){
          .acct-name{ display:none; }
          /* Header wraps to two rows on phones: logo + actions on top, full-width search below.
             Fixes the squeeze from cramming logo + search + 6 icons into one narrow row. */
          .ym-hdr{ flex-wrap:wrap; gap:8px !important; row-gap:10px; height:auto !important; padding-top:12px !important; padding-bottom:12px !important; }
          /* Search drops to its own full-width second row; the flex spacer keeps the
             logo on the left and the action icons on the right of the top row. */
          .ym-hdr-search{ order:10; flex-basis:100% !important; max-width:none !important; }
          .ym-hdr .icon-btn{ width:40px; height:40px; }
        }`}</style>
    </header>
  );
}

/* A footer link — internal (runs an action) or external (real href, new tab). */
function FLink({ label, onClick, href }){
  const style = { marginBottom:10, cursor:'pointer', color:'var(--m-fg3)', textDecoration:'none', display:'block', background:'none', border:'none', padding:0, fontFamily:'inherit', fontSize:'inherit', textAlign:'left' };
  if (href) return <a className="ym-sub ym-flink" href={href} target={href.startsWith('/')?undefined:'_blank'} rel="noreferrer" style={style}>{label}</a>;
  return <button className="ym-sub ym-flink" onClick={onClick} style={style}>{label}</button>;
}

export function Footer(){
  const { theme, reset, nav, requireAuth, openCart } = useYM();
  const go = (screen) => reset(screen);              // public screens
  const goAuth = (screen, params) => requireAuth(() => reset(screen, params)); // account-gated
  const SOCIAL = [
    { i:'fa-facebook-f', url:'https://www.facebook.com/yotemarket' },
    { i:'fa-instagram',  url:'https://www.instagram.com/yotemarket' },
    { i:'fa-whatsapp',   url:'https://wa.me/254720730861' },
    { i:'fa-x-twitter',  url:'https://x.com/yotemarket' },
  ];
  return (
    <footer style={{ background:'var(--m-surface)', borderTop:'1px solid var(--m-border)', marginTop:48 }}>
      <div className="wrap ym-footer-grid" style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', gap:32, padding:'48px 24px 32px' }}>
        <div>
          <button onClick={()=>reset('home')} aria-label="Back to YoteMarket home" style={{ border:'none', background:'none', cursor:'pointer', padding:0, display:'block', marginBottom:14 }}>
            <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:26, display:'block' }} />
          </button>
          <p className="ym-sub" style={{ maxWidth:300 }}>Kenya's virtual mall — shop hundreds of local stores, chat &amp; negotiate in the app messenger, pay with M-Pesa, and collect at your nearest hub.</p>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            {SOCIAL.map(s=>(
              <a key={s.i} href={s.url} target="_blank" rel="noreferrer" className="icon-btn" aria-label={s.i.replace('fa-','')} style={{ width:36, height:36, fontSize:14 }}><FA i={s.i} brand /></a>
            ))}
          </div>
        </div>
        <div>
          <div className="ym-h3" style={{ marginBottom:14 }}>Shop</div>
          <FLink label="Categories" onClick={()=>go('home')} />
          <FLink label="Search products" onClick={()=>go('search')} />
          <FLink label="Ask YoteAI" onClick={()=>nav('ai')} />
          <FLink label="Your cart" onClick={openCart} />
        </div>
        <div>
          <div className="ym-h3" style={{ marginBottom:14 }}>Account</div>
          <FLink label="My wallet" onClick={()=>goAuth('profile', { focus:'wallet' })} />
          <FLink label="Track an order" onClick={()=>goAuth('orders')} />
          <FLink label="Messages" onClick={()=>goAuth('messages')} />
          <FLink label="Profile & YotePoints" onClick={()=>goAuth('profile')} />
        </div>
        <div>
          <div className="ym-h3" style={{ marginBottom:14 }}>Company</div>
          <FLink label="Sell on YoteMarket" href="/dashboard" />
          <FLink label="Become a rider" href="/rider" />
          <FLink label="Help center" href="/help" />
          <FLink label="FAQs" href="/help#faqs" />
          <FLink label="Contact us" href="/contact" />
          <FLink label="Terms of Service" href="/terms" />
          <FLink label="Privacy Policy" href="/privacy" />
        </div>
      </div>
      <div className="wrap" style={{ borderTop:'1px solid var(--m-border)', padding:'18px 24px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <span className="ym-cap">© 2026 YoteMarket — Shop Local. Delivered Fast.</span>
        <span className="ym-cap" style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <a href="mailto:general@yotemarket.com" className="ym-flink" style={{ color:'inherit', textDecoration:'none' }}>general@yotemarket.com</a> ·
          <a href="tel:+254720730861" className="ym-flink" style={{ color:'inherit', textDecoration:'none' }}>0720 730 861</a>
        </span>
      </div>
      <style>{`.ym-flink:hover{ color:var(--m-primary) !important; } @media (max-width:720px){ .ym-footer-grid{ grid-template-columns:1fr 1fr !important; } }`}</style>
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
