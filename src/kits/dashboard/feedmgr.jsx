/* feedmgr.jsx — Merchant dashboard: post & manage YoteFeed clips. Reuses the feed
   lib/callables (uploadFeedVideo → createFeedPost, subscribeStoreFeed, deleteFeedPost)
   with dashboard-native styling. This is the home for posting/managing the feed. */
import React from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FA, Card, Btn, SectionCard } from './primitives.jsx';
import { ScreenCoach } from './ScreenCoach.jsx';
import { useShop } from './merchant.jsx';
import { ksh } from './data.js';
import { db, createFeedPost, editFeedPost, deleteFeedPost } from '../../lib/firebase.js';
import { subscribeStoreFeed, feedVideoUrl, uploadFeedVideo } from '../../lib/feed.js';
const { useState, useEffect, useRef } = React;

const FEED_COACH = [
  { selector: '[data-coach="feed-composer"]', title: 'Sell with short clips', body: 'Post a short vertical video and tag a product — it shows on your store page and in the YoteFeed. Shoppers watch, tap the tag, and buy on the spot. Views, likes and shop-taps appear under each clip.' },
];

export function FeedManager({ toast }){
  const shop = useShop();
  const storeId = shop.shopId;
  const [clips, setClips] = useState(null);
  const [products, setProducts] = useState([]);
  // composer
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [meta, setMeta] = useState(null);
  const [caption, setCaption] = useState('');
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { if (!storeId) { setClips([]); return undefined; } return subscribeStoreFeed(storeId, setClips); }, [storeId]);
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
    const v = document.createElement('video'); v.preload = 'metadata';
    v.onloadedmetadata = () => { const w = v.videoWidth, h = v.videoHeight; setMeta({ durationMs: Math.round((v.duration || 0) * 1000), aspect: h > w ? '9:16' : (w === h ? '1:1' : '16:9') }); };
    v.src = objUrl;
  };
  const clear = () => { setFile(null); setUrl(''); setMeta(null); setCaption(''); setProductId(''); setPct(0); setErr(''); };
  const post = async () => {
    if (!storeId) { setErr('Connect your store before posting.'); return; }
    if (!file) { setErr('Choose a video first.'); return; }
    setBusy(true); setErr(''); setPct(0);
    try {
      const videoUrl = await uploadFeedVideo(storeId, file, setPct);
      await createFeedPost({ videoUrl, caption: caption.trim() || undefined, productId: productId || undefined, durationMs: meta?.durationMs, aspect: meta?.aspect });
      clear(); toast && toast('Clip posted to YoteFeed');
    } catch (e) { setErr(e.message || 'Could not post the clip.'); } finally { setBusy(false); }
  };
  const del = (c) => { if (!window.confirm('Remove this clip?')) return;
    deleteFeedPost({ postId: c.id }).then(() => toast && toast('Clip removed')).catch((e) => toast && toast(e.message || 'Could not remove')); };

  // Edit a posted clip (caption + tagged product). subscribeStoreFeed live-updates the grid.
  const [editing, setEditing] = useState(null);   // { id, caption, productId } | null
  const [editBusy, setEditBusy] = useState(false);
  const saveEdit = async () => {
    if (!editing) return;
    setEditBusy(true);
    try {
      await editFeedPost({ postId: editing.id, caption: editing.caption.trim(), productId: editing.productId || '' });
      toast && toast('Clip updated'); setEditing(null);
    } catch (e) { toast && toast(e.message || 'Could not update the clip'); }
    finally { setEditBusy(false); }
  };

  const list = clips || [];
  return (
    <div className="fadeup" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <ScreenCoach id="feed" steps={FEED_COACH} />
      <SectionCard title="Post a clip" sub="Shortform videos that appear on your store page and in the YoteFeed." data-coach="feed-composer">
        <div style={{ display:'flex', gap:18, flexWrap:'wrap', padding:20 }}>
          <input ref={inputRef} type="file" accept="video/*" onChange={pick} style={{ display:'none' }} />
          {!url ? (
            <button onClick={() => inputRef.current?.click()} style={{ width:150, aspectRatio:'9 / 16', borderRadius:14, border:'2px dashed var(--m-line)', background:'var(--m-surface-2)', color:'var(--m-fg3)', display:'flex', flexDirection:'column', gap:8, alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              <FA i="fa-film" style={{ fontSize:26, color:'var(--m-primary)' }} />
              <span style={{ fontWeight:600, fontSize:13 }}>Choose video</span>
              <span style={{ fontSize:11 }}>MP4 · ≤60 MB</span>
            </button>
          ) : (
            <div style={{ width:150, flexShrink:0, position:'relative', borderRadius:14, overflow:'hidden', background:'#000', aspectRatio:'9 / 16' }}>
              <video src={url} controls playsInline style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <button onClick={clear} disabled={busy} title="Choose another" style={{ position:'absolute', top:6, right:6, width:30, height:30, borderRadius:9999, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', cursor:'pointer' }}><FA i="fa-arrows-rotate" /></button>
            </div>
          )}
          <div style={{ flex:1, minWidth:220, display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label className="ym-label">Caption</label>
              <textarea className="ym-input" value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} placeholder="Say something about this clip…" rows={2} style={{ height:'auto', minHeight:72, padding:'12px 14px', resize:'vertical' }} />
            </div>
            <div>
              <label className="ym-label">Tag a product (optional)</label>
              <select className="ym-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">No product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {ksh(p.price)}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10, padding:'11px 13px', borderRadius:12, background:'var(--m-surface-2)', border:'1px solid var(--m-line)', fontSize:12.5, color:'var(--m-fg2)', lineHeight:1.55 }}>
              <FA i="fa-music" style={{ color:'var(--m-primary)', marginTop:2, flexShrink:0 }} />
              <span><strong style={{ color:'var(--m-fg1)' }}>Music &amp; copyright:</strong> only post clips using audio you own or are licensed to use. Copyrighted music used without permission may be muted, removed, or taken down, and repeat infringement can lead to suspension. You are responsible for the content you upload — see our <a href="/terms" target="_blank" rel="noreferrer" style={{ color:'var(--m-primary)', fontWeight:600 }}>Terms of Service</a>.</span>
            </div>
            {err && <div style={{ color:'var(--m-danger,#dc2626)', fontSize:13 }}><FA i="fa-triangle-exclamation" /> {err}</div>}
            {busy && <div style={{ fontSize:13, color:'var(--m-fg3)' }}>Uploading… {Math.round(pct * 100)}%</div>}
            <Btn kind="primary" icon={busy ? 'fa-circle-notch' : 'fa-paper-plane'} disabled={busy || !file} onClick={post} style={{ alignSelf:'flex-start' }}>{busy ? 'Posting…' : 'Post clip'}</Btn>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Your clips${list.length ? ` · ${list.length}` : ''}`} sub="Views, likes and shop-taps update as shoppers watch. Remove a clip with the bin.">
        {clips === null ? (
          <div style={{ color:'var(--m-fg3)', fontSize:14, padding:'20px' }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ color:'var(--m-fg3)', fontSize:14, padding:'20px' }}>No clips yet — post your first one above.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap:14, padding:16 }}>
            {list.map((c) => (
              <Card key={c.id} style={{ padding:0, overflow:'hidden' }}>
                <div style={{ position:'relative', aspectRatio:'9 / 16', background:'#000' }}>
                  <video src={`${feedVideoUrl(c)}#t=0.1`} muted playsInline preload="metadata" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:6 }}>
                    <button onClick={() => setEditing({ id:c.id, caption:c.caption || '', productId:c.productId || '' })} title="Edit clip" style={{ width:30, height:30, borderRadius:9999, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', cursor:'pointer' }}><FA i="fa-pen" /></button>
                    <button onClick={() => del(c)} title="Remove clip" style={{ width:30, height:30, borderRadius:9999, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', cursor:'pointer' }}><FA i="fa-trash" /></button>
                  </div>
                  {c.caption && <span style={{ position:'absolute', left:6, bottom:6, right:6, color:'#fff', fontSize:11, fontWeight:500, textShadow:'0 1px 3px rgba(0,0,0,.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.caption}</span>}
                  {c.product && <span style={{ position:'absolute', left:6, bottom:c.caption?24:6, background:'rgba(255,255,255,.94)', color:'#111', fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:7 }}>{ksh(c.product.price)}</span>}
                </div>
                <div style={{ padding:'9px 11px', display:'flex', gap:13, fontSize:12.5, color:'var(--m-fg2)' }}>
                  <span title="Views"><FA i="fa-eye" style={{ color:'var(--m-fg4)' }} /> {c.views || 0}</span>
                  <span title="Likes"><FA i="fa-heart" style={{ color:'var(--m-fg4)' }} /> {c.likes || 0}</span>
                  <span title="Shop taps"><FA i="fa-bag-shopping" style={{ color:'var(--m-fg4)' }} /> {c.shopTaps || 0}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {editing && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(17,24,39,.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={(e)=>{ if(e.target===e.currentTarget && !editBusy) setEditing(null); }}>
          <div className="ym-card" style={{ width:'100%', maxWidth:460, padding:0, boxShadow:'var(--m-shadow-float)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid var(--m-border)' }}>
              <h2 className="ym-h2" style={{ fontSize:17 }}>Edit clip</h2>
              <button onClick={()=>!editBusy && setEditing(null)} className="icon-btn" aria-label="Close"><FA i="fa-xmark" /></button>
            </div>
            <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="ym-label">Caption</label>
                <textarea className="ym-input" value={editing.caption} onChange={(e)=>setEditing(s=>({ ...s, caption:e.target.value.slice(0,300) }))} rows={2} placeholder="Say something about this clip…" style={{ height:'auto', minHeight:72, padding:'12px 14px', resize:'vertical' }} />
              </div>
              <div>
                <label className="ym-label">Tagged product</label>
                <select className="ym-input" value={editing.productId} onChange={(e)=>setEditing(s=>({ ...s, productId:e.target.value }))}>
                  <option value="">No product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {ksh(p.price)}</option>)}
                </select>
              </div>
              <div className="ym-cap" style={{ color:'var(--m-fg3)' }}>To change the video, remove this clip and post a new one.</div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <Btn kind="ghost" onClick={()=>setEditing(null)} disabled={editBusy} style={{ flex:1 }}>Cancel</Btn>
                <Btn kind="primary" icon={editBusy?'fa-circle-notch':'fa-check'} onClick={saveEdit} disabled={editBusy} style={{ flex:1 }}>{editBusy?'Saving…':'Save changes'}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
