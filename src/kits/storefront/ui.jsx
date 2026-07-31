/* ui.jsx — Storefront shared primitives (web, mirrors mobile app visual language). */
import React from 'react';
import { ymPrice, ymStore, ymCat, YM_STORES } from './data.js';
import { resolveHubs } from './hubs.js';
import { mapboxStaticUrl, approxCenterFor, MAPBOX_TOKEN } from '../../lib/maps.js';
const { useState, useEffect, useRef, createContext, useContext } = React;

export const YMContext = createContext(null);
export const useYM = () => useContext(YMContext);

// A tracked product at or below this many units shows "Only N left" — scarcity the
// shopper can act on. Untracked products (stock === null) never show it.
export const LOW_STOCK = 5;

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
        {!p.inStock ? <span style={{ position:'absolute', top:10, right:10, zIndex:2, background:'rgba(17,24,39,.7)', color:'#fff', fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:9999 }}>Out of stock</span>
          : p.stock != null && p.stock <= LOW_STOCK && <span style={{ position:'absolute', top:10, right:10, zIndex:2, background:'rgba(217,119,6,.92)', color:'#fff', fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:9999 }}>Only {p.stock} left</span>}
        {p.negotiable && <span style={{ position:'absolute', bottom:10, left:10, zIndex:2, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:9999, display:'inline-flex', gap:5, alignItems:'center' }}><FA i="fa-handshake" style={{ fontSize:10 }} /> Negotiable</span>}
      </div>
      <div style={{ padding:'12px 14px 14px' }}>
        <div className="ym-h3 line2" style={{ fontSize:14, height:38 }}>{p.name}</div>
        <div className="ym-cap" style={{ margin:'4px 0 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{store?.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15.5, color:'var(--m-fg1)' }}>{ymPrice(p.price)}</div>
            {p.was && <div className="ym-cap" style={{ textDecoration:'line-through' }}>{ymPrice(p.was)}</div>}
          </div>
          <button onClick={e=>{ e.stopPropagation(); addToCart(p.id); }} aria-label="Add to cart" disabled={!p.inStock} style={{
            width:38, height:38, borderRadius:11, border:'none', cursor:p.inStock?'pointer':'not-allowed', flexShrink:0,
            background: p.inStock?'var(--m-primary-deep)':'var(--m-surface-2)', color:p.inStock?'#fff':'var(--m-fg4)', fontSize:14,
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
        <div style={{ position:'relative', zIndex:2, width:56, height:56, borderRadius:16, background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:-28, marginBottom:10, overflow:'hidden' }}>
          {s.logo ? <img src={s.logo} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i={s.icon} style={{ fontSize:24, color:s.tint }} />}
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

/* Top-brand card — premium placement for enterprise-subscription businesses.
   Richer/larger than StoreCard with a gold accent; surfaces NO subscription/tier
   language to shoppers (that stays staff-only) — just a friendly "Top brand" mark. */
export function TopBrandCard({ s, width=288 }){
  const { nav } = useYM();
  return (
    <div className="ym-card store-card top-brand-card" style={{ padding:0, width, flexShrink:0 }} onClick={()=>nav('store',{sid:s.id})}>
      <div style={{ height:104, background:`linear-gradient(120deg, ${s.tint}, ${s.tint}99)`, position:'relative', borderRadius:'18px 18px 0 0', overflow:'hidden' }}>
        <FA i={s.icon} style={{ position:'absolute', right:-8, top:-10, fontSize:104, color:'rgba(255,255,255,.18)' }} />
        <PhotoOverlay src={s.img} radius="18px 18px 0 0" />
        <span style={{ position:'absolute', top:12, left:12, zIndex:2, background:'linear-gradient(135deg,#f4b530,#fcd34d)', color:'#3a2a00', fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:9999, display:'inline-flex', gap:5, alignItems:'center', boxShadow:'0 4px 12px -3px rgba(244,181,48,.55)' }}><FA i="fa-crown" style={{ fontSize:10 }} /> Top brand</span>
      </div>
      <div style={{ padding:'0 16px 16px' }}>
        <div style={{ position:'relative', zIndex:2, width:60, height:60, borderRadius:16, background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:-30, marginBottom:10, overflow:'hidden', border:'2px solid var(--m-gold)' }}>
          {s.logo ? <img src={s.logo} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i={s.icon} style={{ fontSize:26, color:s.tint }} />}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span className="ym-h3" style={{ fontSize:15.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</span>
          {s.verified && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:13, flexShrink:0 }} />}
        </div>
        <div className="ym-cap" style={{ margin:'3px 0 10px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.tagline}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {s.reviews > 0 && <span style={{ display:'inline-flex', gap:5, alignItems:'center' }}><FA i="fa-star" style={{ fontSize:12, color:'#f5a524' }} /><span className="ym-cap" style={{ fontWeight:700, color:'var(--m-fg1)' }}>{s.rating}</span></span>}
          {s.products != null && <><span className="ym-cap">·</span><span className="ym-cap">{s.products} products</span></>}
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

// `max` caps the stepper at the units actually in stock. Undefined = untracked, so
// no cap (the server still has the final say — this only saves a wasted round trip).
export function QtyStepper({ qty, onChange, onRemove, max }){
  const b = { width:36, height:36, borderRadius:9999, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 };
  const atMin = qty<=1;
  const atMax = typeof max === 'number' && qty >= max;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <button style={{ ...b, color: atMin&&onRemove?'var(--m-inactive-fg)':'var(--m-fg1)' }} onClick={()=>{ if(atMin&&onRemove) onRemove(); else onChange(Math.max(1,qty-1)); }}><FA i={atMin&&onRemove?'fa-trash-can':'fa-minus'} /></button>
      <span style={{ fontWeight:700, color:'var(--m-fg1)', minWidth:18, textAlign:'center' }}>{qty}</span>
      <button style={{ ...b, cursor:atMax?'not-allowed':'pointer', color:atMax?'var(--m-fg4)':'var(--m-fg1)' }} disabled={atMax}
        title={atMax?`Only ${max} in stock`:undefined} onClick={()=>onChange(typeof max==='number'?Math.min(max,qty+1):qty+1)}><FA i="fa-plus" /></button>
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
export function HubPicker({ selected, onSelect, onClose, title='Choose a collection point', hubs }){
  const list = hubs || resolveHubs();
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {list.length === 0 && (
          <div className="ym-cap" style={{ padding:'18px 4px', textAlign:'center' }}>
            No collection points near you yet — choose “Pick up from store” instead.
          </div>
        )}
        {list.map(h=>{
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

/* A pickup/location map for any destination (a store or a collection hub). Renders a
   Mapbox static map with a brand pin at the saved coordinates, and a "Get directions"
   CTA that opens turn-by-turn navigation (works from coords or a place-name query, so
   directions always resolve). Falls back to a keyless OpenStreetMap embed if no Mapbox
   token is configured. When a place has no saved pin, it drops an APPROXIMATE town-level
   marker (from the area text) so the map is never an empty grey box — the caption flags
   it and directions still use the real area name. */
/* A live, interactive Mapbox map (pan / scroll-pinch zoom / +− controls) for the zoom
   overlay. Mapbox GL JS is heavy, so it's lazy-loaded only when a shopper opens the map.
   Falls back to the keyless OSM embed if the library fails or the token is missing, so a
   map is never a blank box. */
function LiveMap({ lat, lng }){
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let map; let cancelled = false;
    (async () => {
      try {
        const [{ default: mapboxgl }] = await Promise.all([
          import('mapbox-gl'),
          import('mapbox-gl/dist/mapbox-gl.css'),
        ]);
        if (cancelled || !ref.current) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        map = new mapboxgl.Map({ container: ref.current, style: 'mapbox://styles/mapbox/streets-v12', center: [lng, lat], zoom: 13 });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
        // Other stores on the mall, so a shopper can see what else is around — lighter
        // pins with a name popup on tap. Skip the place being viewed (it gets the brand pin).
        for (const s of YM_STORES) {
          const L = s && s.location;
          if (!L || !Number.isFinite(L.lat) || !Number.isFinite(L.lng)) continue;
          if (Math.abs(L.lat - lat) < 1e-6 && Math.abs(L.lng - lng) < 1e-6) continue;
          const popup = new mapboxgl.Popup({ offset: 22, closeButton: false }).setText(s.name || 'Store');
          new mapboxgl.Marker({ color: '#94a3b8', scale: 0.78 }).setLngLat([L.lng, L.lat]).setPopup(popup).addTo(map);
        }
        // The place being viewed — brand pin, added last so it sits on top.
        new mapboxgl.Marker({ color: '#4f46e5' }).setLngLat([lng, lat]).addTo(map);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; if (map) { try { map.remove(); } catch { /* already gone */ } } };
  }, [lat, lng]);
  if (failed) {
    const dz = 0.0035;
    return <iframe title="Zoomable map" width="100%" height="100%" loading="lazy" style={{ border:0, display:'block' }}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-dz}%2C${lat-dz}%2C${lng+dz}%2C${lat+dz}&layer=mapnik&marker=${lat}%2C${lng}`} />;
  }
  return <div ref={ref} style={{ width:'100%', height:'100%' }} />;
}

export function PlaceMap({ location, name='Location', area, address, height=180 }){
  const [zoom, setZoom] = useState(false);
  const real = location && Number.isFinite(location.lat) && Number.isFinite(location.lng) ? location : null;
  const loc = real || approxCenterFor(area);       // always resolves → map is never grey
  const approx = !real;
  const dest = real ? `${real.lat},${real.lng}` : encodeURIComponent(`${name} ${area || ''} Kenya`);
  const dirHref = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  const d = 0.006;
  const mapImg = mapboxStaticUrl(loc.lat, loc.lng, { zoom: real ? 15 : 12 });
  // The inline preview can't zoom (a Mapbox still is a PNG; an inline interactive map
  // hijacks page scroll on a phone). So tapping it opens a keyless, fully interactive
  // OSM map — scroll/pinch + the +/- controls — in an overlay the shopper can zoom freely.
  const dz = 0.0035;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng-dz}%2C${loc.lat-dz}%2C${loc.lng+dz}%2C${loc.lat+dz}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`;
  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setZoom(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  return (
    <div>
      {/* minWidth:0 is load-bearing, not tidying. The Mapbox still is a 720px-wide
          image and an OSM iframe defaults to 300px; without it their INTRINSIC width
          becomes the minimum size of the grid/flex column they sit in, which blew the
          checkout column out to 683px inside a 362px phone screen and let the storefront's
          overflow-x:hidden slice the page off at the right edge. */}
      <div style={{ position:'relative', minWidth:0 }}>
        {mapImg ? (
          <img src={mapImg} alt={`Map showing ${name}`} height={height} loading="lazy" onClick={()=>setZoom(true)}
            style={{ border:0, borderRadius:14, display:'block', width:'100%', minWidth:0, maxWidth:'100%', height, objectFit:'cover', cursor:'zoom-in' }} />
        ) : (
          <iframe title={`${name} location`} height={height} loading="lazy"
            style={{ border:0, borderRadius:14, display:'block', width:'100%', minWidth:0, maxWidth:'100%' }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng-d}%2C${loc.lat-d}%2C${loc.lng+d}%2C${loc.lat+d}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`} />
        )}
        {/* Zoom → opens the interactive map. Sits ABOVE the iframe too, so it works whether
            the preview is the static image or the (pointer-capturing) OSM iframe. */}
        <button onClick={()=>setZoom(true)} aria-label="Expand and zoom the map" title="Zoom map"
          style={{ position:'absolute', top:8, right:8, zIndex:2, width:34, height:34, borderRadius:9, border:'none', background:'rgba(17,24,39,.72)', color:'#fff', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
          <FA i="fa-magnifying-glass-plus" />
        </button>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginTop:10, flexWrap:'wrap' }}>
        <span className="ym-cap" style={{ display:'inline-flex', gap:7, alignItems:'center', minWidth:0 }}><FA i="fa-location-dot" style={{ color:'var(--m-primary)' }} /> <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{address || area || name}{approx ? ' · approximate area' : ''}</span></span>
        <a href={dirHref} target="_blank" rel="noreferrer" className="ym-btn ym-btn-primary ym-btn-sm"><FA i="fa-diamond-turn-right" /> Get directions</a>
      </div>

      {zoom && (
        <div onClick={()=>setZoom(false)} role="dialog" aria-modal="true" aria-label={`${name} map`}
          style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(8,10,24,.74)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'min(960px, 96vw)', height:'min(82vh, 680px)', background:'var(--m-surface)', borderRadius:16, overflow:'hidden', position:'relative', boxShadow:'var(--m-shadow-float)' }}>
            {MAPBOX_TOKEN
              ? <LiveMap lat={loc.lat} lng={loc.lng} />
              : <iframe title={`${name} — zoomable map`} width="100%" height="100%" loading="lazy" style={{ border:0, display:'block' }} src={embed} />}
            <button onClick={()=>setZoom(false)} aria-label="Close map"
              style={{ position:'absolute', top:10, right:10, zIndex:2, width:38, height:38, borderRadius:9999, border:'none', background:'rgba(17,24,39,.8)', color:'#fff', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FA i="fa-xmark" /></button>
            <a href={dirHref} target="_blank" rel="noreferrer" className="ym-btn ym-btn-primary ym-btn-sm" style={{ position:'absolute', bottom:12, left:12, zIndex:2 }}><FA i="fa-diamond-turn-right" /> Get directions</a>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoreMap({ store, height=180 }){
  return <PlaceMap location={store?.location} name={store?.name || 'Store'} area={store?.area} address={store?.address} height={height} />;
}

export function HubMap({ hub, height=180 }){
  return <PlaceMap location={hub?.location} name={hub?.name || 'Pickup hub'} area={hub?.area} address={hub?.area} height={height} />;
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
