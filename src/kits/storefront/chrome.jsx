/* chrome.jsx — Storefront header, category nav, footer, cart drawer. */
import React from 'react';
import { useYM, FA, Thumb, QtyStepper } from './ui.jsx';
import { ymProduct, ymPrice, ymStore } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useUnreadCount } from '../../lib/chat.js';
import { SOCIAL_LINKS } from '../../lib/socials.js';
import { useMerchantAccess } from '../../lib/merchantAccess.js';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import YoteFeedMark from '../../components/YoteFeedMark.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
const { useState: useSC } = React;

/* One row in the account menu. Either moves around inside the storefront (onClick) or
   is a real link to another YoteMarket app (href) — an <a> there, so a merchant can
   middle-click / long-press "My store" into its own tab and keep shopping in this one. */
const acctIcon = { width:18, color:'var(--m-fg3)' };
function AcctRow({ icon, label, sub, href, onClick, style, className }){
  const base = { display:'flex', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', border:'none', background:'none',
    cursor:'pointer', fontFamily:'inherit', fontSize:14, color:'var(--m-fg2)', borderRadius:10, textAlign:'left', boxSizing:'border-box', ...style };
  const body = <>{icon}<span style={{ minWidth:0 }}>{label}
    {sub && <span className="ym-cap" style={{ display:'block', lineHeight:1.35, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</span>}
  </span></>;
  if (href) return <a className={className} href={href} onClick={onClick} style={{ ...base, textDecoration:'none' }}>{body}</a>;
  return <button className={className} onClick={onClick} style={base}>{body}</button>;
}

export function Header(){
  const { nav, reset, cartCount, theme, setTheme, openCart, account, openAuth, signOut, startTour } = useYM();
  const { user } = useAuth();
  const unread = useUnreadCount(user, 'shopper');
  const merchant = useMerchantAccess(user);
  const [acct, setAcct] = useSC(false);
  return (
    <header style={{ position:'sticky', top:0, zIndex:60, background:'var(--m-nav-bg)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:'1px solid var(--m-border)' }}>
      <div className="wrap ym-hdr" style={{ height:68, display:'flex', alignItems:'center', gap:20 }}>
        <button onClick={()=>reset('home')} style={{ border:'none', background:'none', cursor:'pointer', flexShrink:0 }}>
          <img className="ym-hdr-logo" src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:28, display:'block' }} />
        </button>
        <button data-tour="search" onClick={()=>nav('search')} className="ym-hdr-search" style={{ flex:1, maxWidth:520, height:46, borderRadius:9999, border:'none', cursor:'pointer',
          background:'var(--m-surface-2)', display:'flex', alignItems:'center', gap:11, padding:'0 18px', fontFamily:'inherit', fontSize:14.5, color:'var(--m-fg3)' }}>
          <FA i="fa-magnifying-glass" style={{ color:'var(--m-primary)', fontSize:15 }} /> Search the mall…
        </button>
        <div className="ym-hdr-spacer" style={{ flex:1 }} />
        {/* Every action lives in ONE flex box so the row can never split mid-way and
            drop the account control onto a line of its own, left-aligned and with its
            menu hanging off the left edge of the screen — which is what happened when
            these were direct children of the wrapping header row. */}
        <div className="ym-hdr-actions" style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
        {/* Secondary actions collapse into the account menu on phones (see the mobile
            media query below) — the header keeps AI, messages, alerts, cart + account. */}
        <button data-tour="feed" onClick={()=>nav('feed')} className="icon-btn ym-hdr-collapse" aria-label="YoteFeed"><YoteFeedMark size={22} /></button>
        {account.hasAccount && <button onClick={()=>nav('following')} className="icon-btn ym-hdr-collapse" aria-label="Following"><FA i="fa-heart" /></button>}
        <button data-tour="ai" onClick={()=>nav('ai')} className="icon-btn" aria-label="Ask YoteAI" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)' }}><YoteAiMark size={25} color="#fff" /></button>
        <button data-tour="messages" onClick={()=>nav('messages')} className="icon-btn" aria-label="Messages">
          <FA i="fa-comments" />
          {unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-secondary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', border:'2px solid var(--m-bg)' }}>{unread>9?'9+':unread}</span>}
        </button>
        {/* Notification bell — hidden entirely when signed out (nothing to show), so it
            is never a dead control. Tapping a row routes to the thing it's about.
            audience="shopper": this same account's STORE notifications (a new refund
            request, a comment on a store post, a buyer's message) belong in the merchant
            dashboard, not here while they're out shopping. */}
        {account.hasAccount && (
          <NotificationBell user={user} audience="shopper" onOpenNotification={(n)=>{
            const d = n.data || {};
            if (n.type === 'chat' && d.convId) { nav('messages'); return; }
            if (n.type === 'order' || n.type === 'dispute') { nav('orders'); return; }
            if (n.type === 'post_comment') { nav('following'); return; }
            if (n.type === 'support') { nav('profile'); return; }
          }} />
        )}
        {/* Signed in, the phone header hands theme over to the account menu row below.
            Signed out there is no menu to hand it to, so it stays in the header — a
            guest on a phone must still be able to switch the mall out of dark mode. */}
        <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className={'icon-btn' + (account.hasAccount ? ' ym-hdr-collapse' : '')} aria-label="Toggle theme"><FA i={theme==='dark'?'fa-sun':'fa-moon'} /></button>
        <button data-tour="cart" onClick={openCart} className="icon-btn" aria-label="Cart">
          <FA i="fa-cart-shopping" />
          {cartCount>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:20, height:20, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', border:'2px solid var(--m-bg)' }}>{cartCount}</span>}
        </button>
        {account.hasAccount ? (
          <div style={{ position:'relative' }}>
            <button data-tour="account" onClick={()=>setAcct(a=>!a)} style={{ display:'flex', alignItems:'center', gap:8, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
              {account.photo
                ? <img className="ym-hdr-avatar" src={account.photo} alt="" style={{ width:38, height:38, borderRadius:9999, objectFit:'cover' }} />
                : <div className="ym-hdr-avatar" style={{ width:38, height:38, borderRadius:9999, background:'var(--m-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>{account.initials}</div>}
              <span className="ym-h3 acct-name" style={{ fontSize:14 }}>{account.first}</span>
            </button>
            {acct && (<>
              <div onClick={()=>setAcct(false)} style={{ position:'fixed', inset:0, zIndex:70 }} />
              {/* max-width keeps the panel inside the screen on the narrowest phones,
                  where 230px + the header's own padding would spill off the edge. */}
              <div className="ym-card anim-fade" style={{ position:'absolute', right:0, top:48, width:230, maxWidth:'calc(100vw - 28px)', zIndex:71, padding:8, boxShadow:'var(--m-shadow-float)' }}>
                <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--m-border)', marginBottom:6 }}>
                  <div className="ym-h3">{account.name}</div><div className="ym-cap">{account.email || account.phone || 'Signed in'}</div>
                </div>
                <AcctRow icon={<FA i="fa-user" style={acctIcon} />} label="My profile" onClick={()=>{ setAcct(false); nav('profile'); }} />
                {/* Merchants shop the mall too — this is their one tap back into their own
                    store instead of typing /dashboard. Only rendered when they really have
                    one (merchants/{uid} or an active store_staff/{uid}), so it's never a
                    dead link; cashiers go to the POS terminal, which is where they work. */}
                {merchant.isMerchant && (
                  <AcctRow icon={<FA i="fa-store" style={acctIcon} />} href={merchant.href} onClick={()=>setAcct(false)}
                    label={merchant.role==='cashier' ? 'Store terminal' : 'My store'}
                    sub={merchant.storeName || ymStore(merchant.storeId)?.name || undefined} />
                )}
                {[['fa-heart','Following','following'],[null,'YoteFeed','feed'],['fa-box','My orders','orders'],['fa-comments','Messages','messages'],['fa-wand-magic-sparkles','Ask YoteAI','ai']].map(([ic,l,scr])=>(
                  /* Messages carries its unread count here too: on a phone the header's
                     messages button is collapsed into this menu, so without it the count
                     would have nowhere to show. */
                  <AcctRow key={l} label={scr==='messages' && unread>0 ? `${l} · ${unread>9?'9+':unread}` : l} onClick={()=>{ setAcct(false); nav(scr); }}
                    icon={scr==='ai'
                      ? <span style={{ width:18, display:'inline-flex', justifyContent:'center', color:'var(--m-fg3)' }}><YoteAiMark size={16} color="currentColor" /></span>
                      : scr==='feed'
                      ? <span style={{ width:18, display:'inline-flex', justifyContent:'center' }}><YoteFeedMark size={14} /></span>
                      : <FA i={ic} style={acctIcon} />} />
                ))}
                {/* Replay of the welcome tour — the storefront has no "?" button, so this
                    is how anyone (not just a brand-new signup) can see it again. */}
                <AcctRow icon={<FA i="fa-circle-question" style={acctIcon} />} label="Take the tour" onClick={()=>{ setAcct(false); startTour && startTour(); }} />
                {/* The phone header drops its theme button (no room); this row is where
                    it goes. Hidden on desktop, where the header button is still there. */}
                <AcctRow style={{ display:'none' }} className="acct-theme" icon={<FA i={theme==='dark'?'fa-sun':'fa-moon'} style={acctIcon} />}
                  label={theme==='dark' ? 'Light mode' : 'Dark mode'} onClick={()=>{ setAcct(false); setTheme(theme==='dark'?'light':'dark'); }} />
                <AcctRow icon={<FA i="fa-arrow-right-from-bracket" style={{ width:18 }} />} label="Sign out"
                  onClick={()=>{ setAcct(false); signOut(); }} style={{ color:'var(--m-inactive-fg)', marginTop:4, borderTop:'1px solid var(--m-border)' }} />
              </div>
            </>)}
          </div>
        ) : (
          <button onClick={openAuth} className="ym-btn ym-btn-primary ym-btn-sm ym-hdr-signin" style={{ flexShrink:0 }}><FA i="fa-right-to-bracket" /> <span className="ym-signin-label">Sign in</span></button>
        )}
        </div>
      </div>
      <style>{`
        .ym-hdr-actions{ gap:20px; }
        @media (max-width:640px){
          .acct-name{ display:none; }
          /* Header is exactly two rows on phones: [logo · actions] then a full-width
             search. Only the search is allowed to wrap — the actions sit in their own
             flex box, so the account button always ends the top row on the right. */
          .ym-hdr{ flex-wrap:wrap; gap:10px !important; row-gap:10px; height:auto !important; padding-top:10px !important; padding-bottom:10px !important; }
          /* Search drops to its own full-width second row; the flex spacer keeps the
             logo on the left and the action icons on the right of the top row. */
          .ym-hdr-search{ order:10; flex-basis:100% !important; max-width:none !important; height:44px; }
          .ym-hdr .ym-hdr-actions{ gap:8px; }
          .ym-hdr .icon-btn{ width:40px; height:40px; }
          .ym-hdr-logo{ height:24px !important; }
          /* Declutter: YoteFeed, Following and (when signed in) the theme toggle move
             into the account menu, so the phone header keeps the essentials — AI,
             messages, alerts, cart and the account itself — on one row. */
          .ym-hdr .ym-hdr-collapse{ display:none !important; }
          .acct-theme{ display:flex !important; }
        }
        /* Narrow phones: the controls scale down instead of one of them being dropped
           or the row wrapping. 320px is the floor we lay out for. */
        @media (max-width:400px){
          .ym-hdr .ym-hdr-actions{ gap:6px; }
          .ym-hdr .icon-btn{ width:36px; height:36px; font-size:15px; }
          .ym-hdr .ym-hdr-avatar{ width:34px !important; height:34px !important; }
        }
        /* The sign-in pill gives up its label rather than pushing the row wide enough
           to wrap; the arrow icon plus its position still read as "sign in". */
        @media (max-width:370px){
          .ym-hdr .ym-hdr-signin{ padding:0 11px; }
          .ym-hdr .ym-signin-label{ display:none; }
        }`}</style>
    </header>
  );
}

/* A footer link — internal (runs an action) or external (real href, new tab). */
function FLink({ label, onClick, href }){
  /* padding, not margin: a 13.5px line of text is a ~20px tap target, which is under
     every touch guideline. The padding makes the hit area ~36px without opening the
     column up visually. */
  const style = { marginBottom:1, cursor:'pointer', color:'var(--m-fg3)', textDecoration:'none', display:'block', background:'none', border:'none', padding:'8px 0', fontFamily:'inherit', fontSize:'inherit', textAlign:'left' };
  if (href) return <a className="ym-sub ym-flink" href={href} target={href.startsWith('/')?undefined:'_blank'} rel="noreferrer" style={style}>{label}</a>;
  return <button className="ym-sub ym-flink" onClick={onClick} style={style}>{label}</button>;
}

export function Footer(){
  const { theme, setTheme, reset, nav, requireAuth, openCart } = useYM();
  const go = (screen) => reset(screen);              // public screens
  const goAuth = (screen, params) => requireAuth(() => reset(screen, params)); // account-gated
  return (
    <footer style={{ background:'var(--m-surface)', borderTop:'1px solid var(--m-border)', marginTop:48 }}>
      <div className="wrap ym-footer-grid" style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', gap:32, padding:'48px 24px 32px' }}>
        <div>
          <button onClick={()=>reset('home')} aria-label="Back to YoteMarket home" style={{ border:'none', background:'none', cursor:'pointer', padding:0, display:'block', marginBottom:14 }}>
            <img src={theme==='dark'?'/assets/logo-white.png':'/assets/logo.png'} alt="YoteMarket" style={{ height:26, display:'block' }} />
          </button>
          <p className="ym-sub" style={{ maxWidth:300 }}>Kenya's virtual mall — shop hundreds of local stores, chat &amp; negotiate in the app messenger, pay with M-Pesa, and collect at your nearest hub.</p>
          <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap', alignItems:'center' }}>
            {SOCIAL_LINKS.map(s=>(
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="icon-btn" aria-label={s.label} style={{ width:36, height:36, fontSize:14 }}><FA i={s.icon} brand /></a>
            ))}
            {/* The phone header has no room for the theme button and a signed-out
                shopper has no account menu to hold it, so the footer carries it. */}
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="icon-btn ym-footer-theme"
              aria-label="Toggle theme" style={{ width:36, height:36, fontSize:14 }}><FA i={theme==='dark'?'fa-sun':'fa-moon'} /></button>
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
      <style>{`
        .ym-flink:hover{ color:var(--m-primary) !important; }
        /* Fluid: four columns while there's room for them, then two, then one — no
           hardcoded jump from a 4-up desktop footer to a squashed phone one. */
        .ym-footer-grid{ grid-template-columns:repeat(auto-fit, minmax(min(190px,100%), 1fr)) !important; }
        @media (min-width:900px){ .ym-footer-grid{ grid-template-columns:1.6fr 1fr 1fr 1fr !important; } }
        @media (max-width:560px){ .ym-footer-grid{ padding:32px 14px 24px !important; gap:22px !important; } }
        /* Desktop keeps the header's theme button, so the footer one would be a duplicate. */
        @media (min-width:641px){ .ym-footer-theme{ display:none !important; } }`}</style>
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
