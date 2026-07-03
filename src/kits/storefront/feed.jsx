/* feed.jsx — YoteFeed: TikTok-Shop-style vertical shortform video feed (MVP).
   Shoppers swipe a full-height feed of store clips; each can tag a product that
   deep-links to the product page / cart. Merchants post clips via the composer.
   Video is the Firebase-Storage MP4 (read via feedVideoUrl) — swap that one helper
   for HLS later without touching this UI. */
import React from 'react';
import { useYM, FA } from './ui.jsx';
import { ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { db } from '../../lib/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { subscribeFeed, subscribeMyFeedLikes, feedVideoUrl, uploadFeedVideo } from '../../lib/feed.js';
import { createFeedPost, likeFeedPost, reportFeedPost, deleteFeedPost } from '../../lib/firebase.js';
const { useState, useEffect, useRef } = React;

const fmtCount = (n) => { n = Number(n) || 0; return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n); };

/* One full-height video card. Plays when >60% visible, pauses otherwise. */
function FeedItem({ post, muted, liked, onToggleMute, onLike, onReport, onProduct, onStore, onMessage, canMessage, canDelete, onDelete }){
  const secRef = useRef(null);
  const vRef = useRef(null);
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
  }, [visible, paused]);
  useEffect(() => { const v = vRef.current; if (v) v.muted = muted; }, [muted]);

  const src = feedVideoUrl(post);
  const p = post.product;
  return (
    <section ref={secRef} style={{ scrollSnapAlign:'start', position:'relative', height:'100%', width:'100%', background:'#000', borderRadius:16, overflow:'hidden', flex:'0 0 100%' }}>
      <video ref={vRef} src={src} poster={post.posterUrl || undefined} loop playsInline muted={muted}
        onClick={() => setPaused(x => !x)}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }} />
      {paused && <div onClick={()=>setPaused(false)} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.9)', fontSize:44, cursor:'pointer' }}><FA i="fa-play" /></div>}

      {/* top gradient + mute */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:90, background:'linear-gradient(180deg,rgba(0,0,0,.45),transparent)', pointerEvents:'none' }} />
      <button onClick={onToggleMute} aria-label={muted?'Unmute':'Mute'} style={{ position:'absolute', top:12, right:12, width:40, height:40, borderRadius:9999, border:'none', background:'rgba(0,0,0,.4)', color:'#fff', cursor:'pointer', backdropFilter:'blur(4px)' }}><FA i={muted?'fa-volume-xmark':'fa-volume-high'} /></button>

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

export function FeedScreen(){
  const { nav, toast, requireAuth } = useYM();
  const { user } = useAuth();
  const uid = user?.uid;
  const [posts, setPosts] = useState(null); // null = loading
  const [likes, setLikes] = useState(new Set());
  const [muted, setMuted] = useState(true);
  const [storeId, setStoreId] = useState(null);
  const [compose, setCompose] = useState(false);

  useEffect(() => subscribeFeed(setPosts), []);
  useEffect(() => { if (!uid) { setLikes(new Set()); return undefined; } return subscribeMyFeedLikes(uid, setLikes); }, [uid]);
  useEffect(() => {
    let live = true;
    if (!uid) { setStoreId(null); return undefined; }
    getDoc(doc(db, 'merchants', uid)).then((s) => { if (live) setStoreId((s.exists() && s.data().storeId) || null); }).catch(() => {});
    return () => { live = false; };
  }, [uid]);

  const list = posts || [];

  const like = (post) => requireAuth(() => {
    const liked = likes.has(post.id);
    setLikes((s) => { const n = new Set(s); if (liked) n.delete(post.id); else n.add(post.id); return n; }); // optimistic
    likeFeedPost({ postId: post.id, like: !liked }).catch((e) => toast(e.message || 'Could not update like', 'fa-triangle-exclamation'));
  });
  const report = (post) => requireAuth(() => {
    const reason = window.prompt('Why are you reporting this clip? (optional)') ?? undefined;
    reportFeedPost({ postId: post.id, reason: reason || undefined })
      .then(() => toast('Thanks — our team will take a look.', 'fa-flag'))
      .catch((e) => toast(e.message || 'Could not report', 'fa-triangle-exclamation'));
  });
  const remove = (post) => { if (!window.confirm('Remove this clip?')) return;
    deleteFeedPost({ postId: post.id }).then(() => toast('Clip removed', 'fa-trash')).catch((e) => toast(e.message || 'Could not remove', 'fa-triangle-exclamation')); };
  const message = (post) => requireAuth(() => {
    if (!post.ownerId) { toast('This store isn’t on chat yet.', 'fa-comment-slash'); return; }
    nav('messages', { store: { id: post.storeId, ownerId: post.ownerId, name: post.storeName, logo: post.storeLogo } });
  });

  return (
    <div style={{ maxWidth:520, margin:'0 auto', padding:'12px 12px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ width:30, height:30, borderRadius:9, background:'var(--m-grad)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-clapperboard" /></span>
          <span className="ym-h2" style={{ fontSize:20 }}>YoteFeed</span>
        </div>
        {storeId && <button className="ym-btn ym-btn-primary ym-btn-sm" onClick={() => setCompose(true)}><FA i="fa-plus" /> Post a clip</button>}
      </div>

      {posts === null ? (
        <div className="ym-cap" style={{ padding:'40px 0', textAlign:'center' }}>Loading YoteFeed…</div>
      ) : list.length === 0 ? (
        <div style={{ padding:'56px 20px', textAlign:'center', color:'var(--m-fg3)' }}>
          <FA i="fa-clapperboard" style={{ fontSize:40, color:'var(--m-primary)', marginBottom:12 }} />
          <div className="ym-h3" style={{ marginBottom:6 }}>No clips yet</div>
          <div className="ym-cap" style={{ marginBottom:16 }}>Shortform videos from stores will show up here.</div>
          {storeId && <button className="ym-btn ym-btn-primary" onClick={() => setCompose(true)}><FA i="fa-plus" /> Post the first clip</button>}
        </div>
      ) : (
        <div style={{ height:'calc(100dvh - 150px)', overflowY:'auto', scrollSnapType:'y mandatory', display:'flex', flexDirection:'column', gap:12, borderRadius:16, WebkitOverflowScrolling:'touch' }}>
          {list.map((post) => (
            <FeedItem key={post.id} post={post} muted={muted} liked={likes.has(post.id)}
              onToggleMute={() => setMuted((m) => !m)}
              onLike={() => like(post)} onReport={() => report(post)}
              onProduct={() => post.productId && nav('product', { pid: post.productId })}
              onStore={() => post.storeId && nav('store', { sid: post.storeId })}
              onMessage={() => message(post)} canMessage={!!post.ownerId && post.ownerId !== uid}
              canDelete={!!uid && post.ownerId === uid} onDelete={() => remove(post)} />
          ))}
        </div>
      )}

      {compose && <FeedComposer storeId={storeId} onClose={() => setCompose(false)} onPosted={() => { setCompose(false); toast('Clip posted to YoteFeed', 'fa-clapperboard'); }} />}
    </div>
  );
}

/* Merchant composer: pick a vertical video, optionally tag a product, caption, post. */
function FeedComposer({ storeId, onClose, onPosted }){
  const { toast } = useYM();
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [meta, setMeta] = useState(null); // { durationMs, aspect }
  const [caption, setCaption] = useState('');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    let live = true;
    if (!storeId) return undefined;
    getDocs(query(collection(db, 'products'), where('storeId', '==', storeId)))
      .then((s) => { if (live) setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); }).catch(() => {});
    return () => { live = false; };
  }, [storeId]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const pick = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('video/')) { setErr('Please choose a video file.'); return; }
    if (f.size > 60 * 1024 * 1024) { setErr('Video is too large (max 60 MB). Trim it or lower the quality.'); return; }
    setErr(''); setFile(f);
    const objUrl = URL.createObjectURL(f); setUrl(objUrl);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const w = v.videoWidth, h = v.videoHeight;
      const aspect = h > w ? '9:16' : (w === h ? '1:1' : '16:9');
      setMeta({ durationMs: Math.round((v.duration || 0) * 1000), aspect });
    };
    v.src = objUrl;
  };

  const post = async () => {
    if (!file) { setErr('Choose a video first.'); return; }
    setBusy(true); setErr(''); setPct(0);
    try {
      const videoUrl = await uploadFeedVideo(storeId, file, setPct);
      await createFeedPost({ videoUrl, caption: caption.trim() || undefined, productId: productId || undefined, durationMs: meta?.durationMs, aspect: meta?.aspect });
      onPosted();
    } catch (e) { setErr(e.message || 'Could not post the clip.'); setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={busy ? undefined : onClose} style={{ position:'absolute', inset:0, background:'rgba(8,12,24,.55)' }} />
      <div className="ym-card" style={{ position:'relative', width:'100%', maxWidth:440, margin:12, padding:18, maxHeight:'88vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div className="ym-h3"><FA i="fa-clapperboard" style={{ color:'var(--m-primary)', marginRight:8 }} />Post to YoteFeed</div>
          <button onClick={busy ? undefined : onClose} aria-label="Close" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>

        <input ref={inputRef} type="file" accept="video/*" onChange={pick} style={{ display:'none' }} />
        {!url ? (
          <button onClick={() => inputRef.current?.click()} style={{ width:'100%', aspectRatio:'9/16', maxHeight:320, borderRadius:14, border:'2px dashed var(--m-line)', background:'var(--m-surface-2)', color:'var(--m-fg3)', display:'flex', flexDirection:'column', gap:8, alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'inherit' }}>
            <FA i="fa-film" style={{ fontSize:30, color:'var(--m-primary)' }} />
            <span style={{ fontWeight:600 }}>Choose a vertical video</span>
            <span className="ym-cap">MP4 · up to 60 MB · keep it short</span>
          </button>
        ) : (
          <div style={{ position:'relative', borderRadius:14, overflow:'hidden', background:'#000', maxHeight:320, display:'flex', justifyContent:'center' }}>
            <video src={url} controls playsInline style={{ maxHeight:320, maxWidth:'100%' }} />
            <button onClick={() => { setFile(null); setUrl(''); setMeta(null); }} disabled={busy} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.5)', color:'#fff', border:'none', borderRadius:9999, width:32, height:32, cursor:'pointer' }}><FA i="fa-arrows-rotate" /></button>
          </div>
        )}

        <textarea className="ym-input" value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} placeholder="Add a caption…" rows={2} style={{ resize:'vertical', marginTop:12, width:'100%' }} />

        {products.length > 0 && (
          <label style={{ display:'block', marginTop:10 }}>
            <span className="ym-cap" style={{ display:'block', marginBottom:5 }}>Tag a product (optional)</span>
            <select className="ym-input" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width:'100%' }}>
              <option value="">No product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {ymPrice(p.price)}</option>)}
            </select>
          </label>
        )}

        {err && <div className="ym-cap" style={{ color:'var(--m-danger,#dc2626)', marginTop:10 }}><FA i="fa-triangle-exclamation" /> {err}</div>}
        {busy && <div className="ym-cap" style={{ marginTop:10 }}>Uploading… {Math.round(pct * 100)}%</div>}

        <button className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:14 }} disabled={busy || !file} onClick={post}>
          <FA i={busy ? 'fa-circle-notch' : 'fa-paper-plane'} style={busy ? { animation:'ym-spin 1s linear infinite' } : null} /> {busy ? 'Posting…' : 'Post clip'}
        </button>
      </div>
    </div>
  );
}
