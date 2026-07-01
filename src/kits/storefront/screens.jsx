/* screens.jsx — Storefront: Home, Search, Product, Store. */
import React from 'react';
import { useYM, FA, Stars, Thumb, PhotoOverlay, ProductCard, StoreCard, SectionTitle, QtyStepper } from './ui.jsx';
import { YM_PRODUCTS, YM_STORES, YM_CATEGORIES, ymProduct, ymStore, ymCat, ymPrice } from './data.js';
import { CATEGORY_TREE, catalogIdsFor } from './categories.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { subscribeFollows, followStore, unfollowStore } from '../../lib/account.js';
import { subscribeProductReviews } from '../../lib/reviews.js';
import { submitReview } from '../../lib/firebase.js';
const { useState: useSS, useEffect: useEffSS } = React;

/* ---------- PRODUCT REVIEWS (live, functional) ---------- */
function fmtReviewDate(r){ return r?.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('en-KE',{ day:'numeric', month:'short', year:'numeric' }) : ''; }

function StarPicker({ value, onChange }){
  const [hover, setHover] = useSS(0);
  return (
    <span style={{ display:'inline-flex', gap:4 }} onMouseLeave={()=>setHover(0)}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} onMouseEnter={()=>setHover(n)} aria-label={`${n} star${n>1?'s':''}`}
          style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:22, lineHeight:1, color:(hover||value)>=n?'#f5a524':'var(--m-fg4)' }}>
          <i className={`fa-star ${(hover||value)>=n?'fas':'far'}`} />
        </button>
      ))}
    </span>
  );
}

function ProductReviews({ product }){
  const { toast, requireAuth } = useYM();
  const { user } = useAuth();
  const uid = user?.uid;
  const [reviews, setReviews] = useSS(null); // null = loading
  const [rating, setRating] = useSS(0);
  const [text, setText] = useSS('');
  const [busy, setBusy] = useSS(false);

  useEffSS(() => subscribeProductReviews(product.id, setReviews), [product.id]);

  const list = reviews || [];
  const mine = uid ? list.find(r => r.userId === uid) : null;
  useEffSS(() => { if (mine){ setRating(mine.rating||0); setText(mine.text||''); } }, [mine?.id]);

  const count = list.length;
  const avg = count ? Math.round((list.reduce((s,r)=>s+(r.rating||0),0)/count)*10)/10 : (product.rating || 0);

  const send = () => {
    if (!uid) { requireAuth(()=>{}); return; }
    if (!(rating>=1)) { toast('Pick a star rating first', 'fa-star'); return; }
    setBusy(true);
    submitReview({ productId: product.id, rating, text: text.trim() || undefined })
      .then(()=>{ toast(mine ? 'Review updated' : 'Thanks for your review!', 'fa-star'); })
      .catch(e=>toast(e.message || 'Could not submit review', 'fa-triangle-exclamation'))
      .finally(()=>setBusy(false));
  };

  return (
    <div id="product-reviews" style={{ marginTop:44, scrollMarginTop:80 }}>
      <SectionTitle>Ratings & reviews</SectionTitle>
      <div className="ym-card" style={{ padding:20, marginBottom:18, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        <div style={{ textAlign:'center', minWidth:96 }}>
          <div style={{ fontSize:38, fontWeight:800, color:'var(--m-fg1)', lineHeight:1 }}>{count ? avg.toFixed(1) : '—'}</div>
          <div style={{ margin:'6px 0 2px' }}><Stars rating={avg} size={15} /></div>
          <div className="ym-cap">{count} review{count!==1?'s':''}</div>
        </div>
        <div style={{ flex:1, minWidth:220 }}>
          <div className="ym-h3" style={{ fontSize:15, marginBottom:6 }}>{mine ? 'Update your review' : 'Rate this product'}</div>
          <StarPicker value={rating} onChange={setRating} />
          <textarea className="ym-input" value={text} onChange={e=>setText(e.target.value)} placeholder="Share your experience (optional)…" rows={2} style={{ resize:'vertical', marginTop:10, width:'100%' }} />
          <button className="ym-btn ym-btn-primary ym-btn-sm" style={{ marginTop:10 }} disabled={busy} onClick={send}>
            <FA i={busy?'fa-circle-notch':'fa-paper-plane'} style={busy?{ animation:'ym-spin 1s linear infinite' }:null} /> {mine ? 'Update review' : 'Submit review'}
          </button>
        </div>
      </div>
      {reviews === null ? <div className="ym-cap" style={{ padding:'8px 2px' }}>Loading reviews…</div>
        : count === 0 ? <EmptyBlock icon="fa-star" text="No reviews yet — be the first to review this product." />
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {list.map(r=>(
                <div key={r.id} className="ym-card" style={{ padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:34, height:34, borderRadius:9999, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>{(r.author||'?').slice(0,1).toUpperCase()}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="ym-h3" style={{ fontSize:13.5 }}>{r.author || 'Shopper'}{r.userId===uid && <span className="ym-cap" style={{ marginLeft:6 }}>· You</span>}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}><Stars rating={r.rating} size={12} /><span className="ym-cap">{fmtReviewDate(r)}</span></div>
                    </div>
                  </div>
                  {r.text && <p className="ym-body" style={{ margin:0, fontSize:14 }}>{r.text}</p>}
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

function NotFound({ back, label }){
  return (
    <div className="wrap anim-up" style={{ paddingTop:70, textAlign:'center', paddingBottom:70 }}>
      <FA i="fa-magnifying-glass" style={{ fontSize:42, color:'var(--m-fg4)', marginBottom:14 }} />
      <div className="ym-h2">{label || 'Not found'}</div>
      <button className="ym-btn ym-btn-primary" style={{ margin:'18px auto 0', width:180 }} onClick={back}><FA i="fa-arrow-left" /> Go back</button>
    </div>
  );
}
function EmptyBlock({ icon='fa-store', text }){
  return <div className="ym-card" style={{ padding:'40px 20px', textAlign:'center', color:'var(--m-fg3)' }}><FA i={icon} style={{ fontSize:30, color:'var(--m-fg4)', marginBottom:12, display:'block' }} />{text}</div>;
}

/* ---------- HOME ---------- */
export function HomeScreen(){
  const { nav, account, liveOrders } = useYM();
  const IN_PROGRESS = ['queued','accepted','picked_up','at_hub','out','awaiting'];
  const activeOrder = (account.hasAccount && liveOrders) ? liveOrders.find(o=>IN_PROGRESS.includes(o.status)) : null;
  return (
    <div className="anim-up">
      {/* hero */}
      <div className="wrap" style={{ paddingTop:24 }}>
        <div style={{ position:'relative', overflow:'hidden', borderRadius:24, backgroundImage:'var(--m-banner)', backgroundSize:'cover', backgroundPosition:'center 42%', padding:'48px 44px', color:'#fff', boxShadow:'var(--m-shadow-float)' }}>
          <div style={{ maxWidth:560, position:'relative' }}>
            <div style={{ fontSize:13, letterSpacing:'.18em', textTransform:'uppercase', fontWeight:700, color:'var(--m-amber)' }}>Welcome to our Virtual Mall</div>
            <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, lineHeight:1.08, margin:'12px 0 0', textShadow:'0 2px 14px rgba(16,6,50,.6)' }}>Shop local. <span style={{ color:'var(--m-amber)' }}>Delivered</span> fast.</h1>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.9)', marginTop:14, maxWidth:440 }}>Browse 200+ branded storefronts, chat with sellers in the app messenger, and collect at your nearest hub.</p>
            <div style={{ display:'flex', gap:12, marginTop:26, flexWrap:'wrap' }}>
              <button className="ym-btn ym-btn-onbrand ym-btn-lg" onClick={()=>nav('search')}><FA i="fa-magnifying-glass" /> Browse the mall</button>
              <button className="ym-btn ym-btn-lg" onClick={()=>nav('search',{tab:'stores'})} style={{ background:'rgba(255,255,255,.14)', color:'#fff', border:'1.5px solid rgba(255,255,255,.5)' }}>Explore stores</button>
            </div>
          </div>
        </div>
      </div>

      {/* active order */}
      {activeOrder && (()=>{
        const store = ymStore(activeOrder.store || activeOrder.storeId); const first = activeOrder.items?.[0] ? ymProduct(activeOrder.items[0].pid) : null;
        const steps = activeOrder.steps || []; const pct = steps.length ? Math.round(((activeOrder.step+1)/steps.length)*100) : 0;
        return (
          <div className="wrap" style={{ marginTop:20 }}>
            <button onClick={()=>nav('orders')} style={{ width:'100%', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', borderRadius:18, padding:'18px 22px', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)', position:'relative', overflow:'hidden', color:'#fff' }}>
              <FA i="fa-truck-fast" style={{ position:'absolute', right:10, bottom:-12, fontSize:96, color:'rgba(255,255,255,.09)' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13.5, fontWeight:600 }}><span style={{ width:9, height:9, borderRadius:9999, background:'var(--m-amber)' }} /> Arriving{activeOrder.eta ? ` · ${activeOrder.eta} away` : ' soon'}</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.85)' }}>{(activeOrder.id||'').length>12 ? 'YM-'+activeOrder.id.slice(-6).toUpperCase() : activeOrder.id}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <Thumb icon={first?.icon || 'fa-box'} tint={'#fff'} size={48} radius={12} img={first?.img} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>{activeOrder.rider || 'Your rider'} → {(activeOrder.hub||'').split(' · ')[0]}</div>
                  <div style={{ height:6, borderRadius:9999, background:'rgba(255,255,255,.2)', overflow:'hidden' }}><div style={{ width:pct+'%', height:'100%', background:'linear-gradient(90deg,var(--m-amber),#fff)' }} /></div>
                </div>
              </div>
            </button>
          </div>
        );
      })()}

      {/* explore the mall */}
      <div className="wrap" style={{ marginTop:36 }}>
        <SectionTitle action="See all stores" onAction={()=>nav('search',{tab:'stores'})}>Explore the mall</SectionTitle>
        {YM_STORES.length === 0
          ? <EmptyBlock icon="fa-store" text="No stores yet — check back soon as merchants come online." />
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:18 }}>
              {YM_STORES.map(s=><StoreCard key={s.id} s={s} />)}
            </div>}
      </div>

      {/* for you */}
      {YM_PRODUCTS.length > 0 && (
        <div className="wrap" style={{ marginTop:40 }}>
          <SectionTitle action="Browse all" onAction={()=>nav('search')}>For you</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18 }}>
            {YM_PRODUCTS.map(p=><ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- SEARCH ---------- */
export function SearchScreen({ params }){
  const { reset } = useYM();
  const [q, setQ] = useSS('');
  const [cat, setCat] = useSS(params.cat || 'all');
  const [tab, setTab] = useSS(params.tab || 'products');
  const ids = catalogIdsFor(cat);
  const prods = YM_PRODUCTS.filter(p=>(cat==='all'||ids.includes(p.cat))&&(!q||p.name.toLowerCase().includes(q.toLowerCase())));
  const stores = YM_STORES.filter(s=>!q||s.name.toLowerCase().includes(q.toLowerCase()));
  const catTitle = (CATEGORY_TREE.find(c=>c.id===cat)||ymCat(cat)||{}).label || '';
  const showSub = params.sub && cat===(params.cat||'all');
  return (
    <div className="wrap anim-up" style={{ paddingTop:28 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-house" /> Home</button>
      {cat!=='all' && (
        <div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={()=>setCat('all')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, color:'var(--m-fg3)', padding:0 }}>All categories</button>
          <FA i="fa-chevron-right" style={{ fontSize:9 }} />
          <span style={{ color: showSub?'var(--m-fg3)':'var(--m-fg1)', fontWeight:600 }}>{catTitle}</span>
          {showSub && <><FA i="fa-chevron-right" style={{ fontSize:9 }} /><span style={{ color:'var(--m-primary)', fontWeight:600 }}>{params.sub}</span></>}
        </div>
      )}
      <div style={{ position:'relative', maxWidth:620, marginBottom:20 }}>
        <FA i="fa-magnifying-glass" style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', color:'var(--m-fg4)' }} />
        <input className="ym-input" autoFocus placeholder="Search products & stores…" value={q} onChange={e=>setQ(e.target.value)} style={{ paddingLeft:46, height:54 }} />
      </div>
      <div style={{ display:'flex', gap:26, borderBottom:'1px solid var(--m-border)', marginBottom:20 }}>
        {[['products','Products',prods.length],['stores','Stores',stores.length]].map(([id,label,n])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:15, fontWeight:600, padding:'4px 2px 12px', position:'relative', color: tab===id?'var(--m-primary)':'var(--m-fg3)' }}>
            {label} <span className="ym-cap" style={{ fontWeight:600 }}>{n}</span>
            {tab===id && <span style={{ position:'absolute', left:0, right:0, bottom:0, height:3, borderRadius:3, background:'var(--m-primary)' }} />}
          </button>
        ))}
      </div>
      {tab==='products' && (
        <div className="scroll-x" style={{ gap:8, marginBottom:20 }}>
          {YM_CATEGORIES.map(c=>(
            <button key={c.id} className={'ym-chip'+(cat===c.id?' is-active':'')} onClick={()=>setCat(c.id)} style={{ flexShrink:0 }}><FA i={c.icon} style={{ fontSize:13 }} /> {c.label}</button>
          ))}
        </div>
      )}
      {tab==='products' ? (
        prods.length ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18 }}>{prods.map(p=><ProductCard key={p.id} p={p} />)}</div>
        : <Empty icon={q?'fa-magnifying-glass':'fa-box-open'} t={q ? `No results for “${q}”` : `No products in ${catTitle||'this category'} yet`} s={q ? 'Try a different word or browse categories.' : 'Check back soon — merchants are adding stock to this category.'} />
      ) : (
        stores.length ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:18 }}>{stores.map(s=><StoreCard key={s.id} s={s} />)}</div>
        : <Empty icon="fa-store" t={`No stores for “${q}”`} s="Try a different name." />
      )}
    </div>
  );
}
function Empty({ icon, t, s }){
  return <div style={{ textAlign:'center', padding:'70px 20px', color:'var(--m-fg3)' }}><FA i={icon} style={{ fontSize:40, color:'var(--m-fg4)', marginBottom:14 }} /><div className="ym-h3">{t}</div><div className="ym-sub" style={{ marginTop:4 }}>{s}</div></div>;
}

/* ---------- PRODUCT ---------- */
export function ProductScreen({ params }){
  const { back, nav, addToCart, requireAuth } = useYM();
  const p = ymProduct(params.pid);
  if (!p) return <NotFound back={back} label="Product not found" />;
  const store = ymStore(p.store);
  const tint = (ymCat(p.cat)||{}).tint || '#4f46e5';
  const [qty, setQty] = useSS(1);
  const related = YM_PRODUCTS.filter(x=>x.cat===p.cat && x.id!==p.id).slice(0,4);
  return (
    <div className="wrap anim-up" style={{ paddingTop:20 }}>
      <button onClick={back} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Back</button>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'start' }} className="prod-detail">
        <div className="ym-img" style={{ height:420, borderRadius:22, background:`linear-gradient(135deg, ${tint}30, ${tint}60)`, position:'relative' }}>
          <FA i={p.icon} style={{ fontSize:130, color:tint, position:'relative' }} />
          <PhotoOverlay src={p.img} radius={22} />
          {p.was && <span style={{ position:'absolute', bottom:18, left:18, zIndex:2, background:'var(--m-danger)', color:'#fff', fontSize:13, fontWeight:700, padding:'5px 14px', borderRadius:9999 }}>Save {ymPrice(p.was-p.price)}</span>}
        </div>
        <div>
          <h1 className="ym-h1" style={{ fontSize:26 }}>{p.name}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'10px 0 14px', flexWrap:'wrap' }}>
            {p.reviews > 0 ? (
              <><Stars rating={p.rating} /><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{p.rating}</span>
              <span className="ym-cap">({p.reviews} review{p.reviews!==1?'s':''})</span></>
            ) : <span className="ym-cap"><Stars rating={0} /> No reviews yet</span>}
            <button onClick={()=>document.getElementById('product-reviews')?.scrollIntoView({ behavior:'smooth' })} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--m-link)', padding:0, display:'inline-flex', alignItems:'center', gap:5 }}><FA i="fa-star" /> Write a review</button>
            <span className={'ym-pill '+(p.stock?'ym-pill-active':'ym-pill-inactive')}>{p.stock?'In stock':'Out of stock'}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <span style={{ fontSize:30, fontWeight:800, color:'var(--m-fg1)' }}>{ymPrice(p.price)}</span>
            {p.was && <span className="ym-sub" style={{ textDecoration:'line-through', fontSize:17 }}>{ymPrice(p.was)}</span>}
          </div>
          <div className="ym-card" style={{ display:'flex', alignItems:'center', gap:14, padding:14, marginBottom:18, cursor:'pointer' }} onClick={()=>nav('store',{sid:store.id})}>
            <Thumb icon={store.icon} tint={store.tint} size={46} radius={9999} img={store.logo || store.img} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}><span className="ym-h3" style={{ fontSize:14 }}>{store.name}</span>{store.verified && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:12 }} />}</div>
              <div className="ym-cap">{store.area}{store.reviews > 0 ? ` · ${store.rating} ★` : ''}{store.responds ? ` · replies ${store.responds}` : ''}</div>
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--m-link)' }}>Visit store <FA i="fa-chevron-right" style={{ fontSize:11 }} /></span>
          </div>
          <div className="ym-h3" style={{ marginBottom:6 }}>About this item</div>
          <p className="ym-body" style={{ marginTop:0, textWrap:'pretty' }}>{p.desc}</p>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:24, flexWrap:'wrap' }}>
            <QtyStepper qty={qty} onChange={setQty} />
            <button className="ym-btn ym-btn-primary" style={{ flex:1, minWidth:220 }} disabled={!p.stock} onClick={()=>addToCart(p.id,qty)}><FA i="fa-cart-plus" /> Add to cart · {ymPrice(p.price*qty)}</button>
          </div>
          <button className="ym-btn ym-btn-outline" style={{ width:'100%', marginTop:12 }} onClick={()=>requireAuth(()=>nav('messages',{ store }))}><FA i="fa-comments" style={{ fontSize:17 }} /> Chat with seller · Make an offer</button>
        </div>
      </div>

      <ProductReviews product={p} />

      {related.length>0 && (
        <div style={{ marginTop:48 }}>
          <SectionTitle>You might also like</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18 }}>{related.map(r=><ProductCard key={r.id} p={r} />)}</div>
        </div>
      )}
      <style>{`@media (max-width:760px){ .prod-detail{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

/* ---------- STORE ---------- */
export function StoreScreen({ params }){
  const { back, nav, toast, requireAuth } = useYM();
  const { user } = useAuth();
  const uid = user?.uid;
  const s = ymStore(params.sid);
  const all = s ? YM_PRODUCTS.filter(p=>p.store===s.id) : [];
  const [following, setFollowing] = useSS(false);
  useEffSS(() => {
    if (!uid || !s) { setFollowing(false); return undefined; }
    return subscribeFollows(uid, (list) => setFollowing(list.some((f) => f.storeId === s.id)));
  }, [uid, s?.id]);
  const [cat, setCat] = useSS('all');
  const toggleFollow = () => {
    if (!uid) { requireAuth(() => {}); return; }
    const nf = !following;
    (nf ? followStore(uid, s) : unfollowStore(uid, s.id))
      .then(() => toast(nf ? 'Following ' + s.name : 'Unfollowed', nf ? 'fa-circle-check' : 'fa-bell'))
      .catch(() => toast('Could not update follow', 'fa-triangle-exclamation'));
  };
  if (!s) return <NotFound back={back} label="Store not found" />;
  const cats = ['all', ...Array.from(new Set(all.map(p=>p.cat)))];
  const prods = cat==='all'?all:all.filter(p=>p.cat===cat);
  return (
    <div className="anim-up">
      <div style={{ position:'relative', background:`linear-gradient(135deg, ${s.tint} 0%, ${s.tint}aa 55%, var(--m-bg) 100%)`, overflow:'hidden' }}>
        {s.img
          ? (<><img src={s.img} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} /><div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(10,6,40,.55), rgba(10,6,40,.22))' }} /></>)
          : <FA i={s.icon} style={{ position:'absolute', right:-20, top:-10, fontSize:200, color:'rgba(255,255,255,.12)' }} />}
        <div className="wrap" style={{ padding:'24px 24px 28px', position:'relative' }}>
          <button onClick={back} className="ym-btn ym-btn-sm" style={{ background:'rgba(255,255,255,.92)', color:'#111827', marginBottom:20 }}><FA i="fa-arrow-left" /> Back</button>
          <div style={{ display:'flex', alignItems:'flex-end', gap:18 }}>
            <div style={{ width:88, height:88, borderRadius:22, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--m-shadow-float)', flexShrink:0, position:'relative' }}>
              {s.logo
                ? <img src={s.logo} alt={s.name} style={{ width:'100%', height:'100%', borderRadius:22, objectFit:'cover' }} />
                : <FA i={s.icon} style={{ fontSize:38, color:s.tint }} />}
              {s.verified && <span style={{ position:'absolute', bottom:-6, right:-6, width:28, height:28, borderRadius:9999, background:'var(--m-primary)', border:'3px solid var(--m-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-check" style={{ color:'#fff', fontSize:12 }} /></span>}
            </div>
            <div style={{ flex:1, paddingBottom:4 }}>
              <div style={{ color:'#fff', fontSize:26, fontWeight:800, textShadow:'0 1px 8px rgba(0,0,0,.25)' }}>{s.name}</div>
              <div style={{ color:'rgba(255,255,255,.92)', fontSize:14, marginTop:2, textShadow:'0 1px 6px rgba(0,0,0,.25)' }}>{s.tagline}</div>
            </div>
            <div style={{ display:'flex', gap:10 }} className="store-actions">
              <button className={'ym-btn '+(following?'ym-btn-ghost':'ym-btn-onbrand')} onClick={toggleFollow}><FA i={following?'fa-check':'fa-plus'} /> {following?'Following':'Follow'}</button>
              <button className="ym-btn" onClick={()=>requireAuth(()=>nav('messages',{ store:s }))} style={{ background:'rgba(255,255,255,.16)', color:'#fff', border:'1.5px solid rgba(255,255,255,.5)' }}><FA i="fa-comments" /> Chat</button>
            </div>
          </div>
        </div>
      </div>
      <div className="wrap" style={{ marginTop:20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
          {[[fmtK((s.followers||0)+(following?1:0)),'Followers'],[s.products||0,'Products'],[(s.reviews>0?s.rating:'—')+' ★',`${fmtK(s.reviews||0)} reviews`],['Since '+(s.since||'—'),'On YoteMarket'],...(s.isHub?[['Pickup','Hub store']]:[])].map(([v,l])=>(
            <div key={l} className="ym-card" style={{ padding:'14px 20px', textAlign:'center', flex:'1 1 140px' }}>
              <div style={{ fontWeight:700, fontSize:17, color:'var(--m-fg1)' }}>{v}</div><div className="ym-cap" style={{ marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
        <SectionTitle>{prods.length} product{prods.length!==1?'s':''}</SectionTitle>
        {cats.length>2 && (
          <div className="scroll-x" style={{ gap:8, marginBottom:18 }}>
            {cats.map(c=>{ const meta = c==='all'?{label:'All',icon:'fa-border-all'}:(ymCat(c)||{label:c,icon:'fa-tag'}); return (
              <button key={c} className={'ym-chip'+(cat===c?' is-active':'')} onClick={()=>setCat(c)} style={{ flexShrink:0 }}><FA i={meta.icon} style={{ fontSize:13 }} /> {meta.label}</button>
            ); })}
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18, paddingBottom:8 }}>{prods.map(p=><ProductCard key={p.id} p={p} />)}</div>
      </div>
      <style>{`@media (max-width:640px){ .store-actions{ width:100%; } }`}</style>
    </div>
  );
}
function fmtK(n){ return n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n); }
