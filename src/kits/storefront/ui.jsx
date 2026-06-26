/* ui.jsx — Storefront shared primitives (web, mirrors mobile app visual language). */
import React from 'react';
import { ymPrice, ymStore, ymCat } from './data.js';
import { HUBS } from './hubs.js';
const { useState, useEffect, useRef, createContext, useContext } = React;

export const YMContext = createContext(null);
export const useYM = () => useContext(YMContext);

export const FA = ({ i, brand=false, style, className='' }) => (
  <i className={`${brand?'fab':'fas'} ${i} ${className}`} style={style} aria-hidden="true" />
);

export function Stars({ rating, size=13 }){
  const full = Math.floor(rating), half = rating-full>=0.5;
  return (
    <span style={{ color:'#f5a524', display:'inline-flex', gap:1, fontSize:size }}>
      {[0,1,2,3,4].map(i=>{
        const filled = i<full, halfStar = i===full && half;
        return <i key={i} className={`fa-star ${filled||halfStar?'fas':'far'}`} style={{ fontSize:size, color: filled||halfStar?'#f5a524':'var(--m-fg4)' }} />;
      })}
    </span>
  );
}

export function PhotoOverlay({ src, radius }){
  if(!src) return null;
  return <img src={src} alt="" loading="lazy" onError={e=>{ e.target.style.display='none'; }}
    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:radius, zIndex:1 }} />;
}

export function Thumb({ icon, tint='#4f46e5', size=56, radius=14, fs, img }){
  return (
    <div className="ym-img" style={{ width:size, height:size, borderRadius:radius, flexShrink:0, background:`linear-gradient(135deg, ${tint}2e, ${tint}55)` }}>
      <FA i={icon} style={{ fontSize: fs||Math.round(size*0.38), color:tint, position:'relative' }} />
      <PhotoOverlay src={img} radius={radius} />
    </div>
  );
}

export function ProductCard({ p }){
  const { nav, addToCart } = useYM();
  const store = ymStore(p.store);
  const tint = (ymCat(p.cat)||{}).tint || '#4f46e5';
  return (
    <div className="ym-card prod-card" onClick={()=>nav('product',{pid:p.id})}>
      <div className="ym-img" style={{ height:150, background:`linear-gradient(135deg, ${tint}2e, ${tint}55)`, borderRadius:'18px 18px 0 0' }}>
        <FA i={p.icon} style={{ fontSize:48, color:tint, position:'relative' }} />
        <PhotoOverlay src={p.img} radius="18px 18px 0 0" />
        {p.was && <span style={{ position:'absolute', top:10, left:10, zIndex:2, background:'var(--m-danger)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:9999 }}>-{Math.round((1-p.price/p.was)*100)}%</span>}
        {!p.stock && <span style={{ position:'absolute', top:10, right:10, zIndex:2, background:'rgba(17,24,39,.7)', color:'#fff', fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:9999 }}>Out of stock</span>}
      </div>
      <div style={{ padding:'12px 14px 14px' }}>
        <div className="ym-h3 line2" style={{ fontSize:14, height:38 }}>{p.name}</div>
        <div className="ym-cap" style={{ margin:'4px 0 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{store?.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15.5, color:'var(--m-fg1)' }}>{ymPrice(p.price)}</div>
            {p.was && <div className="ym-cap" style={{ textDecoration:'line-through' }}>{ymPrice(p.was)}</div>}
          </div>
          <button onClick={e=>{ e.stopPropagation(); addToCart(p.id); }} aria-label="Add to cart" disabled={!p.stock} style={{
            width:38, height:38, borderRadius:11, border:'none', cursor:p.stock?'pointer':'not-allowed', flexShrink:0,
            background: p.stock?'var(--m-primary-deep)':'var(--m-surface-2)', color:p.stock?'#fff':'var(--m-fg4)', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-plus" /></button>
        </div>
      </div>
    </div>
  );
}

export function StoreCard({ s }){
  const { nav } = useYM();
  return (
    <div className="ym-card store-card" style={{ padding:0 }} onClick={()=>nav('store',{sid:s.id})}>
      <div style={{ height:84, background:`linear-gradient(120deg, ${s.tint}, ${s.tint}99)`, position:'relative', borderRadius:'18px 18px 0 0', overflow:'hidden' }}>
        <FA i={s.icon} style={{ position:'absolute', right:-6, top:-6, fontSize:84, color:'rgba(255,255,255,.18)' }} />
        <PhotoOverlay src={s.img} radius="18px 18px 0 0" />
        {s.isHub && <span style={{ position:'absolute', top:12, left:14, zIndex:2, background:'rgba(255,255,255,.92)', color:'#111827', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:9999, display:'inline-flex', gap:5, alignItems:'center' }}><FA i="fa-warehouse" style={{ fontSize:10 }} /> Hub</span>}
      </div>
      <div style={{ padding:'0 16px 16px' }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:-28, marginBottom:10 }}>
          <FA i={s.icon} style={{ fontSize:24, color:s.tint }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span className="ym-h3" style={{ fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</span>
          {s.verified && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:13, flexShrink:0 }} />}
        </div>
        <div className="ym-cap" style={{ margin:'3px 0 10px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.tagline}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ display:'inline-flex', gap:5, alignItems:'center' }}><FA i="fa-star" style={{ fontSize:12, color:'#f5a524' }} /><span className="ym-cap" style={{ fontWeight:700, color:'var(--m-fg1)' }}>{s.rating}</span></span>
          <span className="ym-cap">·</span><span className="ym-cap">{s.products} products</span>
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, action, onAction }){
  return (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:16 }}>
      <span className="ym-h2">{children}</span>
      {action && <button onClick={onAction} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--m-link)' }}>{action} <FA i="fa-arrow-right" style={{ fontSize:11 }} /></button>}
    </div>
  );
}

export function QtyStepper({ qty, onChange, onRemove }){
  const b = { width:36, height:36, borderRadius:9999, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 };
  const atMin = qty<=1;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <button style={{ ...b, color: atMin&&onRemove?'var(--m-inactive-fg)':'var(--m-fg1)' }} onClick={()=>{ if(atMin&&onRemove) onRemove(); else onChange(Math.max(1,qty-1)); }}><FA i={atMin&&onRemove?'fa-trash-can':'fa-minus'} /></button>
      <span style={{ fontWeight:700, color:'var(--m-fg1)', minWidth:18, textAlign:'center' }}>{qty}</span>
      <button style={b} onClick={()=>onChange(qty+1)}><FA i="fa-plus" /></button>
    </div>
  );
}

export function Toast({ toast }){
  if(!toast) return null;
  return (
    <div className="anim-up" role="status" aria-live="polite" style={{ position:'fixed', top:84, left:'50%', transform:'translateX(-50%)', zIndex:200,
      background:'#111827', color:'#fff', borderRadius:12, padding:'13px 18px', fontSize:14, fontWeight:500,
      display:'flex', alignItems:'center', gap:10, boxShadow:'var(--m-shadow-float)', maxWidth:380 }}>
      <FA i={toast.icon || 'fa-circle-check'} style={{ color:'#6ee7b7' }} /><span>{toast.msg}</span>
    </div>
  );
}

/* Centered modal/sheet used by checkout + profile editors. */
export function Modal({ title, onClose, children, maxWidth=440 }){
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(17,24,39,.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} className="ym-modal-wrap">
      <div onClick={e=>e.stopPropagation()} className="ym-card anim-up ym-modal" role="dialog" aria-modal="true" aria-label={title}
        style={{ width:'100%', maxWidth, maxHeight:'88vh', display:'flex', flexDirection:'column', borderRadius:'20px 20px 0 0', padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--m-border)' }}>
          <span className="ym-h2" style={{ fontSize:18 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ width:34, height:34, borderRadius:9999, border:'none', cursor:'pointer', background:'var(--m-surface-2)', color:'var(--m-fg2)', fontSize:14 }}><FA i="fa-xmark" /></button>
        </div>
        <div style={{ padding:20, overflowY:'auto' }}>{children}</div>
      </div>
      <style>{`@media (min-width:560px){ .ym-modal-wrap{ align-items:center !important; } .ym-modal{ border-radius:20px !important; } }`}</style>
    </div>
  );
}

/* Pickup-hub chooser used at checkout and in the profile editor. */
export function HubPicker({ selected, onSelect, onClose, title='Choose a pickup hub' }){
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {HUBS.map(h=>{
          const on = h.id===selected;
          return (
            <button key={h.id} onClick={()=>{ onSelect(h); onClose(); }} style={{ display:'flex', alignItems:'center', gap:13, width:'100%', padding:14, borderRadius:14, cursor:'pointer', fontFamily:'inherit', textAlign:'left', background:'var(--m-surface)', border: on?'2px solid var(--m-primary)':'2px solid var(--m-border)' }}>
              <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background: on?'var(--m-primary)':'var(--m-surface-2)', color: on?'#fff':'var(--m-fg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}><FA i="fa-warehouse" /></div>
              <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14.5 }}>{h.name}</div><div className="ym-cap">{h.area} · {h.town}</div></div>
              {on && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:18 }} />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* Store location map for "pick up from store". Keyless: an OpenStreetMap embed
   (no API key) when the store has coords, plus a Google Maps "Get directions"
   deep link. Falls back to a search-by-name directions link when no coords. */
export function StoreMap({ store, height=180 }){
  const loc = store?.location;
  const name = store?.name || 'Store';
  const dest = loc ? `${loc.lat},${loc.lng}` : encodeURIComponent(`${name} ${store?.area || ''} Kenya`);
  const dirHref = loc
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest}`
    : `https://www.google.com/maps/search/?api=1&query=${dest}`;
  const d = 0.0055;
  return (
    <div>
      {loc ? (
        <iframe title={`${name} location`} width="100%" height={height} loading="lazy"
          style={{ border:0, borderRadius:14, display:'block' }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng-d}%2C${loc.lat-d}%2C${loc.lng+d}%2C${loc.lat+d}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`} />
      ) : (
        <div style={{ height, borderRadius:14, background:'var(--m-surface-2)', display:'flex', flexDirection:'column', gap:6, alignItems:'center', justifyContent:'center', color:'var(--m-fg3)', fontSize:13 }}>
          <FA i="fa-map-location-dot" style={{ fontSize:22 }} /> Pin not set yet — use directions below
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginTop:10, flexWrap:'wrap' }}>
        <span className="ym-cap" style={{ display:'inline-flex', gap:7, alignItems:'center' }}><FA i="fa-location-dot" style={{ color:'var(--m-primary)' }} /> {store?.address || store?.area || name}</span>
        <a href={dirHref} target="_blank" rel="noreferrer" className="ym-btn ym-btn-ghost ym-btn-sm"><FA i="fa-diamond-turn-right" /> Get directions</a>
      </div>
    </div>
  );
}

/* Sign-in prompt shown on account-only screens when browsing as a guest. */
export function GuestGate({ icon='fa-lock', title, sub }){
  const { openAuth, reset } = useYM();
  return (
    <div className="wrap anim-up" style={{ paddingTop:64, paddingBottom:64, maxWidth:480, margin:'0 auto', textAlign:'center' }}>
      <div style={{ width:76, height:76, borderRadius:9999, margin:'0 auto 18px', background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}><FA i={icon} /></div>
      <h1 className="ym-h1" style={{ fontSize:24 }}>{title}</h1>
      <p className="ym-body" style={{ marginTop:8 }}>{sub}</p>
      <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:24, flexWrap:'wrap' }}>
        <button className="ym-btn ym-btn-primary" onClick={openAuth}><FA i="fa-right-to-bracket" /> Sign in or create account</button>
        <button className="ym-btn ym-btn-ghost" onClick={()=>reset('home')}>Keep shopping</button>
      </div>
    </div>
  );
}
