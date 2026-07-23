/* screens.jsx — Storefront: Home, Search, Product, Store. */
import React from 'react';
import { useYM, FA, Stars, Thumb, PhotoOverlay, ProductCard, StoreCard, TopBrandCard, SectionTitle, QtyStepper, LOW_STOCK } from './ui.jsx';
import { YM_PRODUCTS, YM_STORES, YM_CATEGORIES, ymProduct, ymStore, ymCat, ymPrice } from './data.js';
import { CATEGORY_TREE, catalogIdsFor, matchesSub } from './categories.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { subscribeFollows, followStore, unfollowStore } from '../../lib/account.js';
import { subscribeProductReviews, subscribeStoreReviews } from '../../lib/reviews.js';
import { submitReview, reportReview } from '../../lib/firebase.js';
import { StoreClipsRail } from './feed.jsx';
import { subscribeFeed, subscribeFeedSeen } from '../../lib/feed.js';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import YoteFeedMark from '../../components/YoteFeedMark.jsx';
const { useState: useSS, useEffect: useEffSS } = React;

/* ---------- PRODUCT REVIEWS (live, functional) ---------- */
function fmtReviewDate(r){ return r?.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('en-KE',{ day:'numeric', month:'short', year:'numeric' }) : ''; }
/* Seconds from a Firestore Timestamp (or 0) — for newest-first sorting. */
const tsSec = (t) => (t && (t.seconds != null ? t.seconds : t._seconds)) || 0;

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

  const report = (r) => {
    if (!uid) { requireAuth(()=>{}); return; }
    const reason = (typeof window !== 'undefined' && window.prompt('Why are you reporting this review? (optional)')) ?? undefined;
    reportReview({ reviewId: r.id, reason: reason || undefined })
      .then(()=>toast('Thanks — our team will review this.', 'fa-flag'))
      .catch(e=>toast(e.message || 'Could not report review', 'fa-triangle-exclamation'));
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
          <div className="ym-cap" style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}><FA i="fa-shield-halved" style={{ color:'#16a34a' }} /> Only verified buyers can review — your purchase is checked automatically.</div>
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
                      <div className="ym-h3" style={{ fontSize:13.5, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        {r.author || 'Shopper'}
                        {r.userId===uid && <span className="ym-cap">· You</span>}
                        {r.verified && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#16a34a' }}><FA i="fa-circle-check" /> Verified purchase</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}><Stars rating={r.rating} size={12} /><span className="ym-cap">{fmtReviewDate(r)}</span></div>
                    </div>
                    {r.userId!==uid && (
                      <button title="Report review" onClick={()=>report(r)} style={{ background:'none', border:0, color:'var(--m-fg4)', cursor:'pointer', padding:4, flexShrink:0 }}><FA i="fa-flag" /></button>
                    )}
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
/* Every store rail on the home page shows at most this many, and each one carries a
   "See all" through to the full list in Explore. The home page is a shop window, not
   the directory: as merchants join, uncapped rails turn into endless side-scrolls
   nobody reaches the end of. Change here and all four rails move together. */
const HOME_RAIL_MAX = 5;

export function HomeScreen(){
  const { nav, account, liveOrders } = useYM();
  const { user } = useAuth();
  const [openCat, setOpenCat] = useSS(null); // expanded "Shop by category" tile → subcategory pills
  const [feedClips, setFeedClips] = useSS(null); // all live YoteFeed clips → store feed badges + rail
  useEffSS(() => subscribeFeed(setFeedClips), []);
  // Clips this user has already watched → drop the NEW badge for those stores.
  const [seenClips, setSeenClips] = useSS(() => new Set());
  useEffSS(() => subscribeFeedSeen(user?.uid, setSeenClips), [user?.uid]);
  const clipMap = feedStoreMap(feedClips);                 // storeId → clip info (badges + rail)
  const allFeatured = YM_STORES.filter(s => s.featured);
  const featured = allFeatured.slice(0, HOME_RAIL_MAX);
  // Built from ALL featured stores, not the visible five: a featured store belongs to
  // the Featured rail, so one pushed past the cut-off shouldn't resurface below.
  const featuredIds = new Set(allFeatured.map(s => s.id)); // exclude these from "Now on YoteFeed"
  // New stores — recently joined storefronts (needs a real join date), newest first,
  // excluding the featured ones (already surfaced above) so the sections don't repeat.
  const newStores = [...YM_STORES]
    .filter(s => !s.featured && tsSec(s.createdAt) > 0)
    .sort((a, b) => tsSec(b.createdAt) - tsSec(a.createdAt))
    .slice(0, HOME_RAIL_MAX);
  const IN_PROGRESS = ['queued','accepted','picked_up','at_hub','out','awaiting'];
  const activeOrder = (account.hasAccount && liveOrders) ? liveOrders.find(o=>IN_PROGRESS.includes(o.status)) : null;
  return (
    <div className="anim-up">
      {/* hero */}
      <div className="wrap" style={{ paddingTop:24 }}>
        <div style={{ position:'relative', overflow:'hidden', borderRadius:24, backgroundImage:'var(--m-banner)', backgroundSize:'cover', backgroundPosition:'center 72%', padding:'48px 44px', color:'#fff', boxShadow:'var(--m-shadow-float)' }}>
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

      {/* Flagship features — YoteAI + YoteFeed, promoted up front so shoppers meet
          the two headline experiences right after the hero. */}
      <div className="wrap" style={{ marginTop:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap:14 }}>
          {[
            { grad:'linear-gradient(135deg,#5B16A8 0%,#A020F0 55%,#E89B0C 120%)', mark:<YoteAiMark size={26} color="#fff" />, kick:'YoteAI', title:'Ask YoteAI — your shopping assistant', sub:'Find anything, compare options & track orders — just ask.', go:()=>nav('ai') },
            { grad:'linear-gradient(135deg,#7C2BD4 0%,#ec4899 60%,#f43f5e 120%)', mark:<YoteFeedMark size={24} />, kick:'YoteFeed', title:'Shoppable video — watch it, tap it, buy it', sub:'Short clips from local stores. Tap to buy on the spot.', go:()=>nav('feed') },
          ].map((f) => (
            <button key={f.kick} onClick={f.go} style={{ textAlign:'left', cursor:'pointer', fontFamily:'inherit', border:'none', borderRadius:20, padding:'20px 22px', color:'#fff', background:f.grad, boxShadow:'var(--m-shadow-float)', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ width:52, height:52, borderRadius:15, background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{f.mark}</span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:12, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.82)' }}>{f.kick}</span>
                <span style={{ display:'block', fontSize:16, fontWeight:800, lineHeight:1.2, margin:'3px 0 4px' }}>{f.title}</span>
                <span style={{ display:'block', fontSize:13, color:'rgba(255,255,255,.85)', lineHeight:1.4 }}>{f.sub}</span>
              </span>
              <FA i="fa-arrow-right" style={{ fontSize:16, opacity:.9, flexShrink:0 }} />
            </button>
          ))}
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

      {/* Shop by category — top-level taxonomy tiles; tap a tile to reveal its
          subcategory pills (the mall's full taxonomy lives here now, not a header band) */}
      <div className="wrap" style={{ marginTop:30 }}>
        <SectionTitle action="All categories" onAction={()=>nav('search')}>Shop by category</SectionTitle>
        <div className="cat-grid">
          {CATEGORY_TREE.map(node => {
            const count = YM_STORES.filter(s => s.cat === node.id).length;
            const open = openCat === node.id;
            return (
              <button key={node.id} onClick={()=>setOpenCat(o=>o===node.id?null:node.id)} className="ym-card cat-tile" aria-expanded={open}
                style={{ cursor:'pointer', fontFamily:'inherit', textAlign:'left', padding:15, display:'flex', alignItems:'center', gap:13, border:open?`1.5px solid ${node.tint}`:'1.5px solid transparent' }}>
                <span style={{ width:46, height:46, borderRadius:13, flexShrink:0, background:node.tint+'22', color:node.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}><FA i={node.icon} /></span>
                <span style={{ minWidth:0, flex:1 }}>
                  <span className="ym-h3" style={{ fontSize:14.5, display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{node.short || node.label}</span>
                  <span className="ym-cap">{count ? `${count} shop${count!==1?'s':''}` : `${node.subs.length} types`}</span>
                </span>
                <FA i={open?'fa-chevron-up':'fa-chevron-down'} style={{ fontSize:11, color:'var(--m-fg4)', flexShrink:0 }} />
              </button>
            );
          })}
        </div>
        {openCat && (() => {
          const node = CATEGORY_TREE.find(c => c.id === openCat);
          if (!node) return null;
          return (
            <div className="ym-card anim-fade" style={{ marginTop:14, padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12, flexWrap:'wrap' }}>
                <span className="ym-h3" style={{ display:'inline-flex', alignItems:'center', gap:9 }}>
                  <span style={{ width:28, height:28, borderRadius:8, background:node.tint+'22', color:node.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><FA i={node.icon} /></span>
                  {node.label}
                </span>
                <button className="ym-btn ym-btn-ghost ym-btn-sm" onClick={()=>nav('search',{ cat:node.id })}>Shop all {node.short || node.label} <FA i="fa-arrow-right" style={{ fontSize:11 }} /></button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {node.subs.map(s => (
                  <button key={s} className="ym-chip" onClick={()=>nav('search',{ cat:node.id, sub:s })} style={{ height:34, fontSize:13 }}>{s}</button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Top brands — enterprise-subscription businesses, premium horizontal rail */}
      {(() => {
        const brands = YM_STORES.filter(s => s.topBrand).slice(0, HOME_RAIL_MAX);
        if (!brands.length) return null;
        return (
          <div className="wrap" style={{ marginTop:34 }}>
            <SectionTitle action="See all" onAction={()=>nav('search',{ tab:'brands' })}>Top brands</SectionTitle>
            <div className="scroll-x" style={{ gap:16, paddingBottom:4 }}>
              {brands.map(s => <TopBrandCard key={s.id} s={s} />)}
            </div>
          </div>
        );
      })()}

      {/* Featured — staff-picked flagship stores; those with clips get feed badges */}
      {featured.length > 0 && (
        <div className="wrap" style={{ marginTop:30 }}>
          {/* "See all" only earns its place once the cut-off is actually hiding
              someone — otherwise it promises more than the mall has. */}
          <SectionTitle
            action={allFeatured.length > featured.length ? 'See all' : undefined}
            onAction={()=>nav('search',{ tab:'stores' })}
          >Featured stores</SectionTitle>
          <FeaturedStores stores={featured} clips={clipMap} seen={seenClips} />
        </div>
      )}

      {/* New stores — recently joined storefronts */}
      {newStores.length > 0 && (
        <div className="wrap" style={{ marginTop:30 }}>
          <SectionTitle action="Explore stores" onAction={()=>nav('search',{ tab:'stores' })}>New stores</SectionTitle>
          <NewStores stores={newStores} />
        </div>
      )}

      {/* Now on YoteFeed — NON-featured stores with clips (featured ones show badges above) */}
      <FeedStoresRail clips={feedClips} exclude={featuredIds} seen={seenClips} />

      {/* For you (signed in) / Latest products (guests) — guests have no curated
          shopping habits yet, so show the freshest arrivals instead of "For you". */}
      {YM_PRODUCTS.length > 0 && (() => {
        const guest = !account.hasAccount;
        const items = guest
          ? [...YM_PRODUCTS].sort((a, b) => tsSec(b.createdAt) - tsSec(a.createdAt)).slice(0, 24)
          : YM_PRODUCTS;
        return (
          <div className="wrap" style={{ marginTop:40 }}>
            <SectionTitle action="Browse all" onAction={()=>nav('search')}>{guest ? 'Latest products' : 'For you'}</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18 }}>
              {items.map(p=><ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ---------- SEARCH ---------- */
export function SearchScreen({ params }){
  const { reset } = useYM();
  const [q, setQ] = useSS('');
  const [cat, setCat] = useSS(params.cat || 'all');
  const [sub, setSub] = useSS(params.sub || null);
  const [tab, setTab] = useSS(params.tab || 'products');
  const ids = catalogIdsFor(cat);
  const node = CATEGORY_TREE.find(c => c.id === cat);
  // Picking a category resets the subcategory (a sub belongs to one parent category).
  const pickCat = (c) => { setCat(c); setSub(null); };
  const matchQ = (name) => !q || name.toLowerCase().includes(q.toLowerCase());
  // Products: category + text + PRECISE subcategory (exact `sub` tag, else keyword match).
  const prods = YM_PRODUCTS.filter(p => (cat==='all'||ids.includes(p.cat)) && matchQ(p.name) && matchesSub(sub, p.sub, p.name, p.desc));
  // Stores: category + text; when a subcategory is active a store qualifies if it (or one
  // of its products) matches that sub — so sub-filtering narrows stores precisely too.
  const storeMatchesSub = (s) => !sub || matchesSub(sub, s.sub, s.name, s.tagline) ||
    YM_PRODUCTS.some(p => p.store === s.id && matchesSub(sub, p.sub, p.name, p.desc));
  const stores = YM_STORES.filter(s => (cat==='all'||s.cat===cat||ids.includes(s.cat)) && matchQ(s.name) && storeMatchesSub(s));
  // Top brands = enterprise storefronts, within the current category/sub/search filter.
  const brands = stores.filter(s=>s.topBrand);
  const catTitle = (node || ymCat(cat) || {}).label || '';
  return (
    <div className="wrap anim-up" style={{ paddingTop:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button onClick={()=>reset('home')} aria-label="Back to home" className="icon-btn" style={{ flexShrink:0 }}><FA i="fa-arrow-left" /></button>
        <div style={{ position:'relative', flex:1, maxWidth:620 }}>
          <FA i="fa-magnifying-glass" style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', color:'var(--m-fg4)' }} />
          <input className="ym-input" autoFocus placeholder="Search products & stores…" value={q} onChange={e=>setQ(e.target.value)} style={{ paddingLeft:46, height:54 }} />
        </div>
      </div>
      {cat!=='all' && (
        <div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={()=>pickCat('all')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, color:'var(--m-fg3)', padding:0 }}>All categories</button>
          <FA i="fa-chevron-right" style={{ fontSize:9 }} />
          <button onClick={()=>setSub(null)} style={{ border:'none', background:'none', cursor:sub?'pointer':'default', fontFamily:'inherit', fontSize:12, fontWeight:600, color: sub?'var(--m-fg3)':'var(--m-fg1)', padding:0 }}>{catTitle}</button>
          {sub && <><FA i="fa-chevron-right" style={{ fontSize:9 }} /><span style={{ color:'var(--m-primary)', fontWeight:600 }}>{sub}</span></>}
        </div>
      )}
      <div style={{ display:'flex', gap:26, borderBottom:'1px solid var(--m-border)', marginBottom:20 }}>
        {[['products','Products',prods.length],['stores','Stores',stores.length],['brands','Top brands',brands.length]].map(([id,label,n])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:15, fontWeight:600, padding:'4px 2px 12px', position:'relative', color: tab===id?'var(--m-primary)':'var(--m-fg3)' }}>
            {label} <span className="ym-cap" style={{ fontWeight:600 }}>{n}</span>
            {tab===id && <span style={{ position:'absolute', left:0, right:0, bottom:0, height:3, borderRadius:3, background:'var(--m-primary)' }} />}
          </button>
        ))}
      </div>
      {/* Category chips filter both products and stores (shared category taxonomy). */}
      <div className="scroll-x" style={{ gap:8, marginBottom:14 }}>
        {YM_CATEGORIES.map(c=>(
          <button key={c.id} className={'ym-chip'+(cat===c.id?' is-active':'')} onClick={()=>pickCat(c.id)} style={{ flexShrink:0 }}><FA i={c.icon} style={{ fontSize:13 }} /> {c.label}</button>
        ))}
      </div>
      {/* Subcategory chips — refine within the chosen category (precise sub-filter). */}
      {node && node.subs && node.subs.length > 0 && (
        <div className="scroll-x" style={{ gap:8, marginBottom:20 }}>
          <button className={'ym-chip'+(!sub?' is-active':'')} onClick={()=>setSub(null)} style={{ flexShrink:0 }}>All {node.short || node.label}</button>
          {node.subs.map(sName => (
            <button key={sName} className={'ym-chip'+(sub===sName?' is-active':'')} onClick={()=>setSub(sub===sName?null:sName)} style={{ flexShrink:0 }}>{sName}</button>
          ))}
        </div>
      )}
      {/* Each tab splits its results into per-category rows when browsing all with no
          query; a chosen category chip or search term drops to that tab's flat grid. */}
      {tab==='products' ? (
        prods.length ? (
          (cat==='all' && !q)
            ? <GroupedByCategory items={prods} onPick={pickCat} itemWidth={200} belongs={(p,n)=>catalogIdsFor(n.id).includes(p.cat)} renderItem={(p)=><ProductCard p={p} />} />
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18 }}>{prods.map(p=><ProductCard key={p.id} p={p} />)}</div>
        ) : <Empty icon={q?'fa-magnifying-glass':'fa-box-open'} t={q ? `No results for “${q}”` : `No products in ${sub || catTitle || 'this category'} yet`} s={sub ? 'Try “All ' + (node?.short || catTitle) + '” or another subcategory.' : (q ? 'Try a different word or browse categories.' : 'Check back soon — merchants are adding stock to this category.')} />
      ) : tab==='brands' ? (
        brands.length ? (
          (cat==='all' && !q)
            ? <GroupedByCategory items={brands} onPick={pickCat} itemWidth={288} renderItem={(s)=><TopBrandCard s={s} width="100%" />} />
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:18 }}>{brands.map(s=><TopBrandCard key={s.id} s={s} width="100%" />)}</div>
        ) : <Empty icon="fa-crown" t={q ? `No top brands for “${q}”` : `No top brands in ${catTitle||'this category'} yet`} s="Top brands are our flagship enterprise storefronts — check back soon." />
      ) : (
        stores.length ? (
          (cat==='all' && !q)
            ? <GroupedByCategory items={stores} onPick={pickCat} itemWidth={232} renderItem={(s)=><StoreCard s={s} />} />
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:18 }}>{stores.map(s=><StoreCard key={s.id} s={s} />)}</div>
        ) : <Empty icon="fa-store" t={q ? `No stores for “${q}”` : `No stores in ${sub || catTitle || 'this category'} yet`} s={sub ? 'Try “All ' + (node?.short || catTitle) + '” or another subcategory.' : (q ? 'Try a different name or category.' : 'Check back soon — merchants are joining this category.')} />
      )}
    </div>
  );
}
/* Build a storeId → {latestId, ts, count, name, logo} map from the live feed.
   FRESH_WINDOW_S marks a clip as a "fresh upload". Shared by the two store rails. */
const FRESH_WINDOW_S = 7 * 86400;
function feedStoreMap(clips){
  const m = new Map();
  for (const c of (clips || [])){
    if (!c.storeId) continue;
    const ts = c.createdAt?.seconds || 0;
    const cur = m.get(c.storeId) || { storeId:c.storeId, name:c.storeName, logo:c.storeLogo, latestId:c.id, ts:0, count:0 };
    cur.count += 1;
    if (ts >= cur.ts){ cur.ts = ts; cur.latestId = c.id; cur.name = c.storeName || cur.name; cur.logo = c.storeLogo || cur.logo; }
    m.set(c.storeId, cur);
  }
  return m;
}

/* Featured stores rail — circle logos with names that STACK (wrap) instead of
   truncating. A featured store that ALSO has YoteFeed clips gets the story ring +
   feed badge (+ NEW for a fresh upload), so it isn't duplicated in "Now on YoteFeed". */
function FeaturedStores({ stores, clips, seen }){
  const { nav } = useYM();
  if (!stores?.length) return null;
  const nowS = Date.now() / 1000;
  return (
    <div className="scroll-x" style={{ gap:18, paddingBottom:4, alignItems:'flex-start' }}>
      {stores.map(s => {
        const ci = clips?.get?.(s.id);
        // NEW only if the latest clip is fresh AND this user hasn't watched it yet.
        const fresh = ci && (nowS - ci.ts) < FRESH_WINDOW_S && !seen?.has?.(ci.latestId);
        return (
          <button key={s.id} onClick={()=>nav('store', { sid:s.id })} style={{ flexShrink:0, width:88, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
            <span style={{ position:'relative', width:76, height:76, borderRadius:9999, padding:3, background: ci ? 'conic-gradient(from 210deg, #8b3fea, #ec4899, #f4b530, #8b3fea)' : 'var(--m-grad)', boxShadow: ci ? 'none' : 'var(--m-glow)', display:'block', flexShrink:0 }}>
              <span style={{ width:'100%', height:'100%', borderRadius:9999, overflow:'hidden', background:'var(--m-surface)', border:'3px solid var(--m-bg)', boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {s.logo ? <img src={s.logo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i={s.icon || 'fa-store'} style={{ fontSize:26, color:s.tint || 'var(--m-primary)' }} />}
              </span>
              {ci && <span style={{ position:'absolute', bottom:-2, right:-2, width:26, height:26, borderRadius:9999, background:'var(--m-surface)', border:'2px solid var(--m-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}><YoteFeedMark size={13} /></span>}
              {fresh && <span style={{ position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', background:'var(--m-danger)', color:'#fff', fontSize:9.5, fontWeight:800, padding:'1px 7px', borderRadius:9999, letterSpacing:'.04em', boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>NEW</span>}
            </span>
            <span className="ym-cap" style={{ fontWeight:600, color:'var(--m-fg1)', textAlign:'center', maxWidth:'100%', lineHeight:1.25, whiteSpace:'normal', wordBreak:'normal', overflowWrap:'normal', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* New stores rail — recently joined storefronts as compact cover+logo cards with a
   NEW ribbon, so it reads distinctly from the Featured circle-logos above. */
function NewStores({ stores }){
  const { nav } = useYM();
  if (!stores?.length) return null;
  return (
    <div className="scroll-x" style={{ gap:14, paddingBottom:4 }}>
      {stores.map(s => (
        <button key={s.id} onClick={()=>nav('store', { sid:s.id })} className="ym-card"
          style={{ flexShrink:0, width:210, textAlign:'left', cursor:'pointer', fontFamily:'inherit', padding:0, overflow:'hidden', border:'none' }}>
          <div style={{ position:'relative', height:84, background: s.img ? 'var(--m-surface-2)' : `linear-gradient(135deg, ${s.tint}, ${s.tint}aa)` }}>
            {s.img && <img src={s.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
            <span style={{ position:'absolute', top:8, left:8, background:'var(--m-primary)', color:'#fff', fontSize:10, fontWeight:800, letterSpacing:'.05em', padding:'2px 8px', borderRadius:9999, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>NEW</span>
          </div>
          <div style={{ padding:'0 14px 14px' }}>
            <span style={{ display:'flex', width:48, height:48, borderRadius:14, marginTop:-24, background:'var(--m-surface)', border:'3px solid var(--m-bg)', boxShadow:'var(--m-shadow-card)', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
              {s.logo ? <img src={s.logo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i={s.icon || 'fa-store'} style={{ fontSize:20, color:s.tint || 'var(--m-primary)' }} />}
            </span>
            <div className="ym-h3" style={{ fontSize:14, marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</span>
              {s.verified && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:11, flexShrink:0 }} />}
            </div>
            <div className="ym-cap" style={{ marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.area || (s.products ? `${s.products} product${s.products!==1?'s':''}` : 'New on YoteMarket')}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* Now on YoteFeed rail — story-ring avatars for stores that have clips, with a
   "NEW" badge for fresh uploads (a clip in the last 7 days). Derives the store set
   from the live feed; tapping opens that store's clips in the immersive feed. */
function FeedStoresRail({ clips, exclude, seen }){
  const { nav } = useYM();
  let stores = [...feedStoreMap(clips).values()].sort((a,b)=>b.ts - a.ts);
  if (exclude && exclude.size) stores = stores.filter(cs => !exclude.has(cs.storeId));
  if (!stores.length) return null;
  stores = stores.slice(0, HOME_RAIL_MAX); // rest are one tap away in YoteFeed
  const nowS = Date.now()/1000;
  return (
    <div className="wrap" style={{ marginTop:30 }}>
      <SectionTitle action="Open YoteFeed" onAction={()=>nav('feed')}>Now on YoteFeed</SectionTitle>
      <div className="scroll-x" style={{ gap:18, paddingBottom:4, alignItems:'flex-start' }}>
        {stores.map(cs => {
          const s = ymStore(cs.storeId) || {};
          const fresh = (nowS - cs.ts) < FRESH_WINDOW_S && !seen?.has?.(cs.latestId);
          return (
            <button key={cs.storeId} onClick={()=>nav('feed', { storeId:cs.storeId, storeName: cs.name || s.name, startId: cs.latestId })}
              style={{ flexShrink:0, width:88, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
              <span style={{ position:'relative', width:76, height:76, borderRadius:9999, padding:3, background:'conic-gradient(from 210deg, #8b3fea, #ec4899, #f4b530, #8b3fea)', display:'block', flexShrink:0 }}>
                <span style={{ width:'100%', height:'100%', borderRadius:9999, overflow:'hidden', background:'var(--m-surface)', border:'3px solid var(--m-bg)', boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {(cs.logo || s.logo) ? <img src={cs.logo || s.logo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i={s.icon || 'fa-store'} style={{ fontSize:26, color:s.tint || 'var(--m-primary)' }} />}
                </span>
                <span style={{ position:'absolute', bottom:-2, right:-2, width:26, height:26, borderRadius:9999, background:'var(--m-surface)', border:'2px solid var(--m-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}><YoteFeedMark size={13} /></span>
                {fresh && <span style={{ position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', background:'var(--m-danger)', color:'#fff', fontSize:9.5, fontWeight:800, padding:'1px 7px', borderRadius:9999, letterSpacing:'.04em', boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>NEW</span>}
              </span>
              <span className="ym-cap" style={{ fontWeight:600, color:'var(--m-fg1)', textAlign:'center', maxWidth:'100%', lineHeight:1.25, whiteSpace:'normal', wordBreak:'normal', overflowWrap:'normal', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{cs.name || s.name || 'Store'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
/* Grouped-by-category view — the "category split" used by EVERY Explore tab
   (Products, Stores, Top brands): the tab's results split into per-category rows
   (compact horizontal rails). `belongs` decides which category node an item falls
   under — stores/brands carry a node id (default), products resolve via catalogIdsFor.
   Tapping a row heading or "See all" narrows the current tab to that category. */
function GroupedByCategory({ items, onPick, renderItem, itemWidth = 232, belongs }){
  const match = belongs || ((it, node) => it.cat === node.id);
  const seen = new Set();
  const sections = CATEGORY_TREE.map((node) => {
    const list = items.filter((it) => !seen.has(it.id) && match(it, node));
    list.forEach((it) => seen.add(it.id));
    return list.length ? { node, list } : null;
  }).filter(Boolean);
  const rest = items.filter((it) => !seen.has(it.id));
  if (rest.length) sections.push({ node: { id:'more', label:'Other', icon:'fa-shapes', tint:'#7c3aed' }, list: rest });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:26 }}>
      {sections.map(({ node, list }) => {
        const pick = () => node.id !== 'more' && onPick(node.id);
        return (
          <div key={node.id}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
              <button onClick={pick} style={{ display:'inline-flex', alignItems:'center', gap:9, background:'none', border:'none', cursor:node.id!=='more'?'pointer':'default', fontFamily:'inherit', padding:0, minWidth:0 }}>
                <span style={{ width:30, height:30, borderRadius:9, background:node.tint + '22', color:node.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}><FA i={node.icon} /></span>
                <span className="ym-h3" style={{ fontSize:15, whiteSpace:'nowrap' }}>{node.label}</span>
                <span className="ym-cap">· {list.length}</span>
              </button>
              {node.id !== 'more' && list.length > 3 && <button onClick={pick} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ flexShrink:0 }}>See all <FA i="fa-chevron-right" style={{ fontSize:10 }} /></button>}
            </div>
            <div className="scroll-x" style={{ gap:14 }}>
              {list.slice(0, 10).map((it) => <div key={it.id} style={{ width:itemWidth, flexShrink:0 }}>{renderItem(it)}</div>)}
            </div>
          </div>
        );
      })}
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
  const [sel, setSel] = useSS(0);
  const gallery = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
  const cover = gallery[sel] || p.img;
  const related = YM_PRODUCTS.filter(x=>x.cat===p.cat && x.id!==p.id).slice(0,4);
  return (
    <div className="wrap anim-up" style={{ paddingTop:20 }}>
      <button onClick={back} aria-label="Back" className="icon-btn" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /></button>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'start' }} className="prod-detail">
        <div>
          <div className="ym-img" style={{ height:420, borderRadius:22, background:`linear-gradient(135deg, ${tint}30, ${tint}60)`, position:'relative' }}>
            <FA i={p.icon} style={{ fontSize:130, color:tint, position:'relative' }} />
            <PhotoOverlay src={cover} radius={22} />
            {p.was && <span style={{ position:'absolute', bottom:18, left:18, zIndex:2, background:'var(--m-danger)', color:'#fff', fontSize:13, fontWeight:700, padding:'5px 14px', borderRadius:9999 }}>Save {ymPrice(p.was-p.price)}</span>}
          </div>
          {gallery.length > 1 && (
            <div className="scroll-x" style={{ gap:10, marginTop:12 }}>
              {gallery.map((url, i) => (
                <button key={i} onClick={()=>setSel(i)} aria-label={`Photo ${i+1}`} style={{ width:66, height:66, flexShrink:0, borderRadius:12, overflow:'hidden', cursor:'pointer', padding:0, background:'var(--m-surface-2)', border: i===sel ? '2px solid var(--m-primary)' : '2px solid var(--m-border)' }}>
                  <img src={url} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="ym-h1" style={{ fontSize:26 }}>{p.name}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'10px 0 14px', flexWrap:'wrap' }}>
            {p.reviews > 0 ? (
              <><Stars rating={p.rating} /><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{p.rating}</span>
              <span className="ym-cap">({p.reviews} review{p.reviews!==1?'s':''})</span></>
            ) : <span className="ym-cap"><Stars rating={0} /> No reviews yet</span>}
            <button onClick={()=>document.getElementById('product-reviews')?.scrollIntoView({ behavior:'smooth' })} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--m-link)', padding:0, display:'inline-flex', alignItems:'center', gap:5 }}><FA i="fa-star" /> Write a review</button>
            <span className={'ym-pill '+(p.inStock?'ym-pill-active':'ym-pill-inactive')}>{p.inStock?(p.stock!=null&&p.stock<=LOW_STOCK?`Only ${p.stock} left`:'In stock'):'Out of stock'}</span>
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
            <QtyStepper qty={qty} onChange={setQty} max={p.stock ?? undefined} />
            <button className="ym-btn ym-btn-primary" style={{ flex:1, minWidth:220 }} disabled={!p.inStock} onClick={()=>addToCart(p.id,qty)}><FA i="fa-cart-plus" /> {p.inStock?'Add to cart':'Out of stock'} · {ymPrice(p.price*qty)}</button>
          </div>
          <button className="ym-btn ym-btn-outline" style={{ width:'100%', marginTop:12 }} onClick={()=>requireAuth(()=>nav('messages',{ store, product: { id: p.id, name: p.name, price: p.price, img: p.img || null, storeId: store.id } }))}><FA i="fa-comments" style={{ fontSize:17 }} /> Chat with seller · Make an offer</button>
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
/* Store-wide reviews — every review across the store's products (reviews carry a
   denormalised storeId). Complements the per-product reviews on each product page. */
function StoreReviews({ store }){
  const { nav } = useYM();
  const [reviews, setReviews] = useSS(null);
  useEffSS(() => subscribeStoreReviews(store.id, setReviews), [store.id]);
  if (!reviews || reviews.length === 0) return null; // aggregate rating already shows in the stats
  return (
    <div style={{ marginTop:40 }}>
      <SectionTitle>Reviews {store.reviews > 0 ? `· ${store.rating}★ (${fmtK(store.reviews)})` : ''}</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {reviews.slice(0, 20).map((r) => {
          const prod = ymProduct(r.productId);
          return (
            <div key={r.id} className="ym-card" style={{ padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ width:34, height:34, borderRadius:9999, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>{(r.author||'?').slice(0,1).toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ym-h3" style={{ fontSize:13.5, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>{r.author || 'Shopper'}{r.verified && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#16a34a' }}><FA i="fa-circle-check" /> Verified purchase</span>}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}><Stars rating={r.rating} size={12} /><span className="ym-cap">{fmtReviewDate(r)}</span></div>
                </div>
              </div>
              {r.text && <p className="ym-body" style={{ margin:'0 0 6px', fontSize:14 }}>{r.text}</p>}
              {prod && <button onClick={()=>nav('product',{ pid:prod.id })} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--m-link)', fontWeight:600, fontSize:12.5, padding:0 }}>on {prod.name} <FA i="fa-arrow-right" style={{ fontSize:10 }} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  // In-store catalogue filters — a big store is unusable without them.
  const [cat, setCat] = useSS('all');
  const [q, setQ] = useSS('');
  const [sub, setSub] = useSS(null);
  const [sort, setSort] = useSS('featured');
  const [inStockOnly, setInStockOnly] = useSS(false);
  const toggleFollow = () => {
    if (!uid) { requireAuth(() => {}); return; }
    const nf = !following;
    (nf ? followStore(uid, s) : unfollowStore(uid, s.id))
      .then(() => toast(nf ? 'Following ' + s.name : 'Unfollowed', nf ? 'fa-circle-check' : 'fa-bell'))
      .catch(() => toast('Could not update follow', 'fa-triangle-exclamation'));
  };
  if (!s) return <NotFound back={back} label="Store not found" />;
  const cats = ['all', ...Array.from(new Set(all.map(p=>p.cat)))];
  // Subcategory options come from the store's ACTUAL products (not the full tree),
  // so a shopper only ever sees types this store really carries.
  const subOpts = Array.from(new Set(all.filter(p=>cat==='all'||p.cat===cat).map(p=>p.sub).filter(Boolean))).sort();
  const pickCat = (c) => { setCat(c); setSub(null); }; // a sub belongs to one category
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchQ = (p) => !terms.length ||
    terms.every(t => `${p.name||''} ${p.desc||''} ${p.sub||''}`.toLowerCase().includes(t));
  let prods = all.filter(p =>
    (cat==='all' || p.cat===cat) &&
    matchesSub(sub, p.sub, p.name, p.desc) &&
    matchQ(p) &&
    (!inStockOnly || p.inStock));
  if (sort !== 'featured') {
    prods = [...prods];
    if (sort==='price_asc') prods.sort((a,b)=>(a.price||0)-(b.price||0));
    else if (sort==='price_desc') prods.sort((a,b)=>(b.price||0)-(a.price||0));
    else if (sort==='rating') prods.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else if (sort==='new') prods.sort((a,b)=>tsSec(b.createdAt)-tsSec(a.createdAt));
  }
  const filtering = Boolean(q.trim() || cat!=='all' || sub || inStockOnly);
  const clearAll = () => { setQ(''); setCat('all'); setSub(null); setInStockOnly(false); setSort('featured'); };
  const showTools = all.length > 6; // small catalogues browse fine without a toolbar
  return (
    <div className="anim-up">
      <div style={{ position:'relative', background:`linear-gradient(135deg, ${s.tint} 0%, ${s.tint}aa 55%, var(--m-bg) 100%)`, overflow:'hidden' }}>
        {s.img
          ? (<><img src={s.img} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} /><div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(10,6,40,.55), rgba(10,6,40,.22))' }} /></>)
          : <FA i={s.icon} style={{ position:'absolute', right:-20, top:-10, fontSize:200, color:'rgba(255,255,255,.12)' }} />}
        <div className="wrap" style={{ padding:'28px 24px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:18, flexWrap:'wrap' }}>
            <div style={{ width:88, height:88, borderRadius:22, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--m-shadow-float)', flexShrink:0, position:'relative' }}>
              {s.logo
                ? <img src={s.logo} alt={s.name} style={{ width:'100%', height:'100%', borderRadius:22, objectFit:'cover' }} />
                : <FA i={s.icon} style={{ fontSize:38, color:s.tint }} />}
              {s.verified && <span style={{ position:'absolute', bottom:-6, right:-6, width:28, height:28, borderRadius:9999, background:'var(--m-primary)', border:'3px solid var(--m-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-check" style={{ color:'#fff', fontSize:12 }} /></span>}
            </div>
            <div style={{ flex:'1 1 160px', minWidth:0, paddingBottom:4 }}>
              <div style={{ color:'#fff', fontSize:26, fontWeight:800, textShadow:'0 1px 8px rgba(0,0,0,.25)', overflowWrap:'anywhere' }}>{s.name}</div>
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
        <StoreSocials socials={s.socials} />
        <StoreClipsRail storeId={s.id} storeName={s.name} />
        <SectionTitle>
          {prods.length} product{prods.length!==1?'s':''}{filtering && prods.length!==all.length ? ` of ${all.length}` : ''}
          {filtering && <button onClick={clearAll} style={{ marginLeft:12, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--m-primary)', padding:0 }}>Clear filters</button>}
        </SectionTitle>

        {/* Search · sort · stock — only once a catalogue is big enough to need it. */}
        {showTools && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
            <div style={{ position:'relative', flex:'1 1 260px', minWidth:200 }}>
              <FA i="fa-magnifying-glass" style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'var(--m-fg4)' }} />
              <input className="ym-input" placeholder={`Search ${s.name}…`} aria-label={`Search products in ${s.name}`} value={q} onChange={e=>setQ(e.target.value)} style={{ paddingLeft:44, paddingRight:q?40:14, height:46 }} />
              {q && <button onClick={()=>setQ('')} aria-label="Clear search" className="icon-btn" style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', width:32, height:32 }}><FA i="fa-xmark" /></button>}
            </div>
            <select className="ym-input" aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)} style={{ height:46, width:'auto', minWidth:160, flex:'0 0 auto' }}>
              <option value="featured">Sort: Featured</option>
              <option value="new">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
            <button className={'ym-chip'+(inStockOnly?' is-active':'')} onClick={()=>setInStockOnly(v=>!v)} aria-pressed={inStockOnly} style={{ flexShrink:0, height:46 }}><FA i="fa-circle-check" style={{ fontSize:13 }} /> In stock</button>
          </div>
        )}

        {cats.length>2 && (
          <div className="scroll-x" style={{ gap:8, marginBottom: subOpts.length>1 ? 10 : 18 }}>
            {cats.map(c=>{ const meta = c==='all'?{label:'All',icon:'fa-border-all'}:(ymCat(c)||{label:c,icon:'fa-tag'}); return (
              <button key={c} className={'ym-chip'+(cat===c?' is-active':'')} onClick={()=>pickCat(c)} style={{ flexShrink:0 }}><FA i={meta.icon} style={{ fontSize:13 }} /> {meta.label}</button>
            ); })}
          </div>
        )}
        {/* Precise sub-filter — narrows to the exact type a shopper is after. */}
        {subOpts.length>1 && (
          <div className="scroll-x" style={{ gap:8, marginBottom:18 }}>
            <button className={'ym-chip'+(!sub?' is-active':'')} onClick={()=>setSub(null)} style={{ flexShrink:0 }}>All types</button>
            {subOpts.map(sn=>(
              <button key={sn} className={'ym-chip'+(sub===sn?' is-active':'')} onClick={()=>setSub(sub===sn?null:sn)} style={{ flexShrink:0 }}>{sn}</button>
            ))}
          </div>
        )}

        {prods.length
          ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:18, paddingBottom:8 }}>{prods.map(p=><ProductCard key={p.id} p={p} />)}</div>
          : <Empty icon={q?'fa-magnifying-glass':'fa-box-open'} t={q?`No matches for “${q}”`:'Nothing matches those filters'} s="Try a different word, or clear the filters to see everything in this store." />}
        <StoreReviews store={s} />
      </div>
      {/* Phones: the header row wraps, so Follow/Chat drop to their own full-width line
          and split it evenly instead of crushing the shop name. */}
      <style>{`@media (max-width:640px){ .store-actions{ width:100%; margin-top:6px; } .store-actions .ym-btn{ flex:1; min-width:0; } }`}</style>
    </div>
  );
}
function fmtK(n){ return n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n); }

// Store social links → { icon, brand, url }. Handles are normalised to full links;
// full URLs are passed through. Empty/blank platforms are skipped.
const SOCIAL_META = {
  instagram: { icon:'fa-instagram', brand:true,  base:'https://instagram.com/', at:true },
  facebook:  { icon:'fa-facebook',  brand:true,  base:'https://facebook.com/' },
  tiktok:    { icon:'fa-tiktok',    brand:true,  base:'https://tiktok.com/@', at:true },
  x:         { icon:'fa-x-twitter', brand:true,  base:'https://x.com/', at:true },
  youtube:   { icon:'fa-youtube',   brand:true,  base:'https://youtube.com/@', at:true },
  whatsapp:  { icon:'fa-whatsapp',  brand:true,  wa:true },
  website:   { icon:'fa-globe',     brand:false, base:'https://' },
};
function socialUrl(key, raw){
  const v = String(raw||'').trim();
  if (!v) return null;
  const m = SOCIAL_META[key]; if (!m) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (m.wa) { const d = v.replace(/[^\d]/g,''); return d ? 'https://wa.me/'+d : null; }
  return m.base + (m.at ? v.replace(/^@/,'') : v);
}
export function StoreSocials({ socials }){
  if (!socials) return null;
  const links = Object.keys(SOCIAL_META)
    .map((k)=>({ k, meta:SOCIAL_META[k], url:socialUrl(k, socials[k]) }))
    .filter((x)=>x.url);
  if (!links.length) return null;
  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24 }}>
      {links.map(({ k, meta, url })=>(
        <a key={k} href={url} target="_blank" rel="noopener noreferrer" title={k} aria-label={k}
          style={{ width:42, height:42, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--m-surface2, rgba(120,120,140,.1))', color:'var(--m-fg1)', textDecoration:'none', border:'1px solid var(--m-line, rgba(120,120,140,.18))' }}>
          <FA i={meta.icon} brand={meta.brand} style={{ fontSize:18 }} />
        </a>
      ))}
    </div>
  );
}
