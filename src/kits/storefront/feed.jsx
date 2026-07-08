/* feed.jsx — YoteFeed: a shoppable vertical shortform video feed (MVP).
   Shoppers swipe a full-height feed of store clips; each can tag a product that
   deep-links to the product page / cart. Merchants post & manage clips from the
   dashboard (kits/dashboard/feedmgr.jsx) — this screen is view-only. Video is the
   Firebase-Storage MP4 (read via feedVideoUrl) — swap that one helper for HLS later. */
import React from 'react';
import { useYM, FA } from './ui.jsx';
import { ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { subscribeFeed, subscribeStoreFeed, subscribeMyFeedLikes, subscribeFeedSeen, rankFeed, feedVideoUrl } from '../../lib/feed.js';
import { likeFeedPost, reportFeedPost, deleteFeedPost, recordFeedEvents } from '../../lib/firebase.js';
import { subscribeFollows } from '../../lib/account.js';
import YoteFeedMark from '../../components/YoteFeedMark.jsx';
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const fmtCount = (n) => { n = Number(n) || 0; return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n); };

// Demo clips shown ONLY when the live feed is empty (matches the storefront's demo
// fallback). They're local-only — actions no-op — and disappear once real posts
// exist. Public Google sample MP4s (play in <video> without CORS setup).
const DV = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';
const FEED_DEMO = [
  { id:'demo1', demo:true, storeName:'Sunset Threads', caption:'New arrivals just dropped 🔥 swipe up for more', likes:1240, videoUrl:`${DV}BigBuckBunny.mp4` },
  { id:'demo2', demo:true, storeName:'Nairobi Gadgets', caption:'This power bank lasts 3 days on one charge 🔋', likes:842, videoUrl:`${DV}ForBiggerFun.mp4` },
  { id:'demo3', demo:true, storeName:'Coast Spices Co.', caption:'Fresh pilau masala, ground this morning 🌶️', likes:2130, videoUrl:`${DV}ForBiggerJoyrides.mp4` },
  { id:'demo4', demo:true, storeName:'Bidii Hardware', caption:'Cordless drill demo — quiet & strong 🛠️', likes:567, videoUrl:`${DV}ForBiggerEscapes.mp4` },
  { id:'demo5', demo:true, storeName:'Green Grocer', caption:'Farm-to-door veggies every morning 🥬', likes:389, videoUrl:`${DV}ForBiggerMeltdowns.mp4` },
  { id:'demo6', demo:true, storeName:'Kipenzi Fashion', caption:'Ankara styles for the weekend ✨', likes:1975, videoUrl:`${DV}ForBiggerBlazes.mp4` },
];

/* One full-height video card. Plays when >60% visible, pauses otherwise. */
function FeedItem({ post, muted, liked, onLike, onReport, onProduct, onStore, onMessage, canMessage, canDelete, onDelete, onView, onFinish }){
  const secRef = useRef(null);
  const vRef = useRef(null);
  const viewedRef = useRef(false);
  const finishedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = secRef.current; if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio > 0.6), { threshold: [0, 0.6, 1] });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = vRef.current; if (!v) return;
    if (visible && !paused) { v.play().catch(() => {}); } else { v.pause(); }
    if (visible && !viewedRef.current) { viewedRef.current = true; onView && onView(); } // ranking: 1 view/session
  }, [visible, paused]);
  useEffect(() => { const v = vRef.current; if (v) v.muted = muted; }, [muted]);

  // Watch-completion → a strong engagement signal (video loops, so watch currentTime).
  const onTime = () => {
    const v = vRef.current; if (!v || !v.duration || finishedRef.current) return;
    if (v.currentTime / v.duration > 0.9) { finishedRef.current = true; onFinish && onFinish(); }
  };

  const src = feedVideoUrl(post);
  const p = post.product;
  return (
    <section ref={secRef} style={{ scrollSnapAlign:'start', position:'relative', height:'100%', width:'100%', background:'#000', overflow:'hidden', flex:'0 0 100%' }}>
      <video ref={vRef} src={src} poster={post.posterUrl || undefined} loop playsInline muted={muted}
        onClick={() => setPaused(x => !x)} onTimeUpdate={onTime}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }} />
      {paused && <div onClick={()=>setPaused(false)} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.9)', fontSize:52, cursor:'pointer' }}><FA i="fa-play" /></div>}
      {/* top scrim for the overlay bar's legibility */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:110, background:'linear-gradient(180deg,rgba(0,0,0,.5),transparent)', pointerEvents:'none' }} />

      {/* right action rail */}
      <div style={{ position:'absolute', right:12, bottom:120, display:'flex', flexDirection:'column', gap:18, alignItems:'center' }}>
        <RailBtn icon={liked?'fa-heart':'fa-heart'} filled={liked} label={fmtCount(post.likes)} onClick={onLike} activeColor="#ff375f" />
        {canMessage && <RailBtn icon="fa-comment-dots" label="Message" onClick={onMessage} />}
        <RailBtn icon="fa-flag" label="Report" onClick={onReport} />
        {canDelete && <RailBtn icon="fa-trash" label="Delete" onClick={onDelete} />}
      </div>

      {/* bottom gradient + meta + product */}
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'54px 16px 18px', background:'linear-gradient(0deg,rgba(0,0,0,.7),transparent)', color:'#fff' }}>
        <button onClick={onStore} style={{ display:'inline-flex', alignItems:'center', gap:9, background:'none', border:'none', color:'#fff', cursor:'pointer', padding:0, marginBottom:8 }}>
          <span style={{ width:34, height:34, borderRadius:9999, overflow:'hidden', background:'rgba(255,255,255,.2)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {post.storeLogo ? <img src={post.storeLogo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-store" />}
          </span>
          <span style={{ fontWeight:700, fontSize:14 }}>{post.storeName || 'Store'}</span>
        </button>
        {post.caption && <div style={{ fontSize:14, lineHeight:1.4, marginBottom:10, maxWidth:'82%', textShadow:'0 1px 3px rgba(0,0,0,.5)' }}>{post.caption}</div>}
        {p && (
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.25)', borderRadius:14, padding:8, maxWidth:340, backdropFilter:'blur(6px)' }}>
            <button onClick={onProduct} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', color:'#fff', cursor:'pointer', padding:0, flex:1, minWidth:0, textAlign:'left' }}>
              <span style={{ width:44, height:44, borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,.2)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {p.img ? <img src={p.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-bag-shopping" />}
              </span>
              <span style={{ minWidth:0 }}>
                <span style={{ display:'block', fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                <span style={{ display:'block', fontSize:13, fontWeight:800 }}>{ymPrice(p.price)}</span>
              </span>
            </button>
            <button onClick={onProduct} style={{ flexShrink:0, background:'#fff', color:'#111', border:'none', borderRadius:10, padding:'9px 14px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Shop</button>
          </div>
        )}
      </div>
    </section>
  );
}

function RailBtn({ icon, label, onClick, filled, activeColor }){
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'none', border:'none', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
      <span style={{ width:46, height:46, borderRadius:9999, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color: filled ? activeColor : '#fff', backdropFilter:'blur(4px)' }}><FA i={icon} /></span>
      <span style={{ fontSize:11, fontWeight:600 }}>{label}</span>
    </button>
  );
}

export function FeedScreen({ params = {} }){
  const { nav, back, toast, requireAuth } = useYM();
  const { user } = useAuth();
  const uid = user?.uid;
  const scopedStoreId = params.storeId || null;   // when set, show only this store's clips
  const scopedName = params.storeName || '';
  const [posts, setPosts] = useState(null); // null = loading
  const [likes, setLikes] = useState(new Set());
  const [seen, setSeen] = useState(new Set());
  const [follows, setFollows] = useState([]);
  const [orderIds, setOrderIds] = useState(null); // frozen ranked order (stable while scrolling)
  const [muted, setMuted] = useState(true);

  useEffect(() => scopedStoreId ? subscribeStoreFeed(scopedStoreId, setPosts) : subscribeFeed(setPosts), [scopedStoreId]);
  useEffect(() => { if (!uid) { setLikes(new Set()); return undefined; } return subscribeMyFeedLikes(uid, setLikes); }, [uid]);
  useEffect(() => { if (!uid) { setSeen(new Set()); return undefined; } return subscribeFeedSeen(uid, setSeen); }, [uid]);
  useEffect(() => { if (!uid) { setFollows([]); return undefined; } return subscribeFollows(uid, setFollows); }, [uid]);

  // Stores to boost = followed + stores of clips the user has liked (engaged).
  const boostStores = useMemo(() => {
    const s = new Set(follows.map((f) => f.id || f.storeId).filter(Boolean));
    (posts || []).forEach((p) => { if (likes.has(p.id) && p.storeId) s.add(p.storeId); });
    return s;
  }, [follows, likes, posts]);

  // Refs so ranking reads current context without re-ranking every time it changes.
  const rankCtxRef = useRef({ likes, seen, boostStores });
  rankCtxRef.current = { likes, seen, boostStores };

  // Freeze the ranked order ONCE the feed first loads — order stays stable while you
  // scroll (re-ranking mid-scroll would jump the viewport). Remounting the screen
  // (navigating away + back) re-ranks with the latest seen/likes.
  useEffect(() => {
    if (posts && posts.length && !orderIds) {
      const c = rankCtxRef.current;
      setOrderIds(rankFeed(posts, { likedSet: c.likes, seenSet: c.seen, boostStores: c.boostStores }).map((p) => p.id));
    }
  }, [posts, orderIds]);

  const byId = useMemo(() => { const m = new Map(); (posts || []).forEach((p) => m.set(p.id, p)); return m; }, [posts]);
  // Render in frozen order, merging live post data; new clips (not yet ranked) append.
  const ranked = useMemo(() => {
    if (!posts || !posts.length || !orderIds) return posts || [];
    const placed = new Set(); const arr = [];
    orderIds.forEach((id) => { const p = byId.get(id); if (p) { arr.push(p); placed.add(id); } });
    posts.forEach((p) => { if (!placed.has(p.id)) arr.push(p); });
    return arr;
  }, [posts, orderIds, byId]);

  // Live ranked feed, or bundled demo clips when it's empty (so scrolling is testable).
  const list = posts === null ? [] : (ranked.length ? ranked : FEED_DEMO);

  // ── Ranking signals: batch engagement events, flush once per session (cheap). ──
  const pendingRef = useRef({});           // { postId: { views, finishes, shopTaps } }
  const countedViewRef = useRef(new Set());
  const countedFinishRef = useRef(new Set());
  const bump = (postId, field) => {
    if (!postId || String(postId).startsWith('demo')) return; // demo clips aren't real docs
    const e = pendingRef.current[postId] || (pendingRef.current[postId] = {});
    e[field] = (e[field] || 0) + 1;
  };
  const onView = (post) => { if (post.demo || countedViewRef.current.has(post.id)) return; countedViewRef.current.add(post.id); bump(post.id, 'views'); };
  const onFinish = (post) => { if (post.demo || countedFinishRef.current.has(post.id)) return; countedFinishRef.current.add(post.id); bump(post.id, 'finishes'); };
  const onShop = (post) => { if (!post.demo) bump(post.id, 'shopTaps'); if (post.productId) nav('product', { pid: post.productId }); };
  const flush = useCallback(() => {
    const events = Object.entries(pendingRef.current)
      .map(([postId, v]) => ({ postId, ...v }))
      .filter((e) => e.views || e.finishes || e.shopTaps);
    if (!events.length) return;
    pendingRef.current = {};
    recordFeedEvents({ events }).catch(() => {}); // fire-and-forget, best-effort
  }, []);
  useEffect(() => {
    const iv = setInterval(flush, 30000);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); flush(); };
  }, [flush]);

  // ── Keyboard navigation (touch swipe is native via scroll-snap). ──
  const scrollRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = scrollRef.current; if (!el) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }); }
      else if (e.key === 'm' || e.key === 'M') { setMuted((m) => !m); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Store-scoped open: jump to the tapped clip once the ranked order has settled.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !params.startId || !orderIds) return;
    const el = scrollRef.current; if (!el) return;
    const idx = list.findIndex((p) => p.id === params.startId);
    if (idx > 0) el.scrollTo({ top: idx * el.clientHeight });
    startedRef.current = true;
  }, [orderIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const like = (post) => {
    if (post.demo) { setLikes((s) => { const n = new Set(s); if (n.has(post.id)) n.delete(post.id); else n.add(post.id); return n; }); return; }
    requireAuth(() => {
      const liked = likes.has(post.id);
      setLikes((s) => { const n = new Set(s); if (liked) n.delete(post.id); else n.add(post.id); return n; }); // optimistic
      likeFeedPost({ postId: post.id, like: !liked }).catch((e) => toast(e.message || 'Could not update like', 'fa-triangle-exclamation'));
    });
  };
  const report = (post) => {
    if (post.demo) { toast('That’s a demo clip 🙂', 'fa-clapperboard'); return; }
    requireAuth(() => {
      const reason = window.prompt('Why are you reporting this clip? (optional)') ?? undefined;
      reportFeedPost({ postId: post.id, reason: reason || undefined })
        .then(() => toast('Thanks — our team will take a look.', 'fa-flag'))
        .catch((e) => toast(e.message || 'Could not report', 'fa-triangle-exclamation'));
    });
  };
  const remove = (post) => { if (!window.confirm('Remove this clip?')) return;
    deleteFeedPost({ postId: post.id }).then(() => toast('Clip removed', 'fa-trash')).catch((e) => toast(e.message || 'Could not remove', 'fa-triangle-exclamation')); };
  const message = (post) => requireAuth(() => {
    if (!post.ownerId) { toast('This store isn’t on chat yet.', 'fa-comment-slash'); return; }
    nav('messages', { store: { id: post.storeId, ownerId: post.ownerId, name: post.storeName, logo: post.storeLogo } });
  });

  const railBtn = { pointerEvents:'auto', width:40, height:40, borderRadius:9999, border:'none', background:'rgba(0,0,0,.38)', color:'#fff', cursor:'pointer', backdropFilter:'blur(4px)', flexShrink:0 };
  return (
    <div style={{ position:'relative', height:'100%', background:'#000', color:'#fff' }}>
      {/* Portrait column: full-bleed on phones, letterboxed on wide screens. */}
      <div style={{ position:'relative', height:'100%', width:'100%', maxWidth:480, margin:'0 auto' }}>

        {/* Floating overlay bar — sits on top of the video. */}
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:6, display:'flex', alignItems:'center', gap:10, padding:'14px 12px' }}>
          <button onClick={() => back()} aria-label="Back" style={railBtn}><FA i="fa-arrow-left" /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            <YoteFeedMark size={22} />
            <span style={{ fontWeight:800, fontSize:16, textShadow:'0 1px 3px rgba(0,0,0,.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{scopedStoreId ? (scopedName || 'Store clips') : 'YoteFeed'}</span>
          </div>
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} style={railBtn}><FA i={muted ? 'fa-volume-xmark' : 'fa-volume-high'} /></button>
        </div>

        {posts === null ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.7)' }}>Loading YoteFeed…</div>
        ) : list.length === 0 ? (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:24, textAlign:'center' }}>
            <YoteFeedMark size={48} />
            <div style={{ fontWeight:700, fontSize:18 }}>No clips yet</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', maxWidth:280 }}>Shortform videos from stores will show up here.</div>
          </div>
        ) : (
          <div ref={scrollRef} style={{ height:'100%', overflowY:'auto', scrollSnapType:'y mandatory', WebkitOverflowScrolling:'touch' }}>
            {list.map((post) => (
              <FeedItem key={post.id} post={post} muted={muted} liked={likes.has(post.id)}
                onLike={() => like(post)} onReport={() => report(post)}
                onProduct={() => onShop(post)}
                onStore={() => post.storeId && nav('store', { sid: post.storeId })}
                onMessage={() => message(post)} canMessage={!!post.ownerId && post.ownerId !== uid}
                onView={() => onView(post)} onFinish={() => onFinish(post)}
                canDelete={!!uid && post.ownerId === uid} onDelete={() => remove(post)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* A single store clip — a modern reel tile that autoplays a muted preview on hover
   (and lifts), with a duration badge, price/caption, and like/view stats. Tapping
   opens the immersive feed scoped to the store, starting on this clip. */
const fmtDur = (ms) => { const s = Math.round((Number(ms) || 0) / 1000); if (!s) return null; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function ClipCard({ c, onOpen }){
  const vref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const enter = () => { const v = vref.current; if (!v) return; try { v.currentTime = 0; } catch { /* noop */ } const p = v.play(); if (p && p.catch) p.catch(() => {}); setPlaying(true); };
  const leave = () => { const v = vref.current; if (!v) return; v.pause(); try { v.currentTime = 0.1; } catch { /* noop */ } setPlaying(false); };
  const dur = fmtDur(c.durationMs);
  return (
    <button className="clip-card" onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave} onClick={() => onOpen(c.id)} aria-label={c.caption || 'Play clip'}>
      <video ref={vref} src={`${feedVideoUrl(c)}#t=0.1`} muted loop playsInline preload="metadata" tabIndex={-1} />
      <span className="clip-grad" />
      {dur && <span className="clip-dur"><FA i="fa-play" style={{ fontSize:8 }} /> {dur}</span>}
      <span className="clip-play" style={playing ? { opacity:0 } : null}><FA i="fa-play" /></span>
      <span className="clip-foot">
        {c.product && <span className="clip-price">{ymPrice(c.product.price)}</span>}
        {c.caption && <span className="clip-cap">{c.caption}</span>}
        {(c.views > 0 || c.likes > 0) && <span className="clip-stats"><FA i="fa-heart" /> {fmtCount(c.likes || 0)} <span style={{ opacity:.5 }}>·</span> <FA i="fa-eye" /> {fmtCount(c.views || 0)}</span>}
      </span>
    </button>
  );
}

/* StoreClipsRail — a store's YoteFeed clips as a modern horizontal reel on the
   store page (hover-preview tiles). */
export function StoreClipsRail({ storeId, storeName }){
  const { nav } = useYM();
  const [clips, setClips] = useState(null);
  useEffect(() => { if (!storeId) { setClips([]); return undefined; } return subscribeStoreFeed(storeId, setClips); }, [storeId]);
  if (!clips || !clips.length) return null;
  const open = (startId) => nav('feed', { storeId, storeName, startId });
  return (
    <div style={{ marginBottom:26 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <YoteFeedMark size={22} />
          <span className="ym-h3" style={{ fontSize:16.5 }}>Store clips</span>
          <span className="ym-pill" style={{ background:'var(--m-surface-2)', color:'var(--m-fg2)' }}>{clips.length}</span>
        </div>
        <button className="ym-btn ym-btn-ghost ym-btn-sm" onClick={() => open(clips[0].id)}><FA i="fa-play" style={{ fontSize:11 }} /> Watch all</button>
      </div>
      <div className="clip-rail">
        {clips.map((c) => <ClipCard key={c.id} c={c} onOpen={open} />)}
      </div>
    </div>
  );
}

