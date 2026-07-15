/* following.jsx — Storefront: the Following feed. Updates from the stores you
   follow: new arrivals, restocks and followers-only offers. Shoppable — tap a
   tagged product to buy, or copy an offer code. Reads getFollowingFeed. */
import React from 'react';
import { useYM, FA, Thumb, GuestGate, Modal } from './ui.jsx';
import { ymPrice } from './data.js';
import { getFollowingFeed, reactToPost, commentOnPost, listPostComments, deletePostComment, auth } from '../../lib/firebase.js';
const { useState, useEffect } = React;

const KIND = { update:['Update', 'var(--m-primary)'], new_product:['New arrival', '#7c3aed'], restock:['Back in stock', '#0ea5e9'], offer:['Offer', '#d97706'], sale:['Sale', '#ef4444'] };
const ago = (ms) => { if (!ms) return ''; const s = Math.max(0, (Date.now() - ms) / 1000); if (s < 3600) return Math.round(s / 60) + 'm'; if (s < 86400) return Math.round(s / 3600) + 'h'; return Math.round(s / 86400) + 'd'; };

export function FollowingScreen(){
  const { nav, account, toast } = useYM();
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    if (!account.hasAccount) { setPosts([]); return undefined; }
    let alive = true;
    getFollowingFeed().then((r) => { if (alive) setPosts(r.posts || []); }).catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, [account.hasAccount]);

  if (!account.hasAccount) return <GuestGate icon="fa-heart" title="Following" sub="Sign in to see updates, new arrivals and offers from the stores you follow." />;

  return (
    <div className="wrap" style={{ paddingTop:18, paddingBottom:40, maxWidth:640 }}>
      <h1 className="ym-h1" style={{ marginBottom:4 }}>Following</h1>
      <p className="ym-sub" style={{ marginBottom:18 }}>New arrivals, restocks and offers from the stores you follow.</p>

      {posts === null ? (
        <div className="ym-card" style={{ padding:40, textAlign:'center' }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)', fontSize:22 }} /></div>
      ) : posts.length === 0 ? (
        <div className="ym-card" style={{ padding:'44px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:15, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}><FA i="fa-heart" /></div>
          <div className="ym-h3">Nothing here yet</div>
          <div className="ym-sub" style={{ marginTop:4, marginBottom:16 }}>Follow your favourite stores and their updates will show up here.</div>
          <button className="ym-btn ym-btn-primary" onClick={() => nav('home')}><FA i="fa-store" /> Explore stores</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {posts.map((p) => <FeedPost key={p.id} p={p} nav={nav} toast={toast} />)}
        </div>
      )}
    </div>
  );
}

function FeedPost({ p, nav, toast }){
  const [kindLabel, kindColor] = KIND[p.kind] || KIND.update;
  const [liked, setLiked] = useState(!!p.liked);
  const [count, setCount] = useState(p.reactionCount || 0);
  const [comments, setComments] = useState(p.commentCount || 0);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const copyCode = () => { try { navigator.clipboard.writeText(p.offerCode); toast('Code copied · ' + p.offerCode, 'fa-copy'); } catch { /* clipboard blocked */ } };
  const toggleLike = async () => {
    if (busy) return; setBusy(true);
    const nl = !liked; setLiked(nl); setCount((c) => Math.max(0, c + (nl ? 1 : -1)));
    try { const r = await reactToPost({ postId: p.id }); setLiked(r.liked); setCount(r.count); }
    catch { setLiked(!nl); setCount((c) => Math.max(0, c + (nl ? -1 : 1))); }
    finally { setBusy(false); }
  };
  return (
    <div className="ym-card" style={{ padding:0, overflow:'hidden' }}>
      <button onClick={() => nav('store', { sid:p.storeId })} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:14, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <Thumb icon="fa-store" img={p.storeLogo} size={40} radius={10} />
        <div style={{ flex:1, minWidth:0 }}>
          <div className="ym-h3" style={{ fontSize:14 }}>{p.storeName || 'Store'}</div>
          <div className="ym-cap"><span style={{ color:kindColor, fontWeight:700 }}>{kindLabel}</span> · {ago(p.createdAt)}</div>
        </div>
        <FA i="fa-chevron-right" style={{ color:'var(--m-fg3)' }} />
      </button>

      {p.image && <img src={p.image} alt="" style={{ width:'100%', maxHeight:340, objectFit:'cover', display:'block' }} />}
      {p.text && <div className="ym-sub" style={{ color:'var(--m-fg1)', whiteSpace:'pre-wrap', padding:'0 14px 12px' }}>{p.text}</div>}

      {(p.offerText || p.offerCode) && (
        <div style={{ margin:'0 14px 12px', padding:'10px 12px', borderRadius:11, background:'color-mix(in srgb,#d97706 12%, transparent)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <FA i="fa-tag" style={{ color:'#d97706' }} />
          <span className="ym-sub" style={{ color:'var(--m-fg1)', flex:1, minWidth:0 }}>{p.offerText || 'Special offer'}</span>
          {p.offerCode && <button onClick={copyCode} className="ym-btn ym-btn-ghost" style={{ padding:'5px 11px', fontFamily:'ui-monospace,Menlo,monospace', fontWeight:700, color:'#d97706' }}>{p.offerCode} <FA i="fa-copy" style={{ fontSize:11 }} /></button>}
        </div>
      )}

      {p.productId && (
        <button onClick={() => nav('product', { pid:p.productId })} style={{ width:'calc(100% - 28px)', margin:'0 14px 14px', display:'flex', alignItems:'center', gap:12, padding:10, borderRadius:12, border:'1px solid var(--m-border)', background:'var(--m-surface-2)', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
          <Thumb icon="fa-box" img={p.productImage} size={46} radius={10} />
          <div style={{ flex:1, minWidth:0 }}>
            <div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.productName}</div>
            {p.productPrice != null && <div className="ym-h3" style={{ fontSize:14 }}>{ymPrice(p.productPrice)}</div>}
          </div>
          <span className="ym-btn ym-btn-primary" style={{ padding:'8px 14px', pointerEvents:'none' }}><FA i="fa-cart-shopping" /> Shop</span>
        </button>
      )}

      {/* reactions + comments */}
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px 8px', borderTop:'1px solid var(--m-border)', marginTop:2 }}>
        <button onClick={toggleLike} className="ym-btn ym-btn-ghost" style={{ gap:7, color: liked ? '#ef4444' : 'var(--m-fg2)', fontWeight:600 }}>
          <FA i="fa-heart" /> {count > 0 ? count : ''} Like
        </button>
        <button onClick={() => setSheet(true)} className="ym-btn ym-btn-ghost" style={{ gap:7, color:'var(--m-fg2)', fontWeight:600 }}>
          <FA i="fa-comment" /> {comments > 0 ? comments : ''} Comment
        </button>
      </div>

      {sheet && <CommentsSheet post={p} onClose={() => setSheet(false)} onCount={setComments} toast={toast} />}
    </div>
  );
}

function CommentsSheet({ post, onClose, onCount, toast }){
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const myUid = auth?.currentUser?.uid || null;
  useEffect(() => {
    let alive = true;
    listPostComments({ postId: post.id }).then((r) => { if (alive) setItems(r.comments || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [post.id]);
  const send = async () => {
    const t = text.trim(); if (!t || busy) return; setBusy(true);
    try {
      const r = await commentOnPost({ postId: post.id, text: t });
      setText(''); setItems((a) => [...(a || []), { id: r.id, uid: myUid, name: 'You', text: t, createdAt: Date.now() }]);
      onCount && onCount((n) => (n || 0) + 1);
    } catch (e) { toast(e.message || 'Could not comment', 'fa-triangle-exclamation'); }
    finally { setBusy(false); }
  };
  const del = async (id) => {
    try { await deletePostComment({ postId: post.id, commentId: id }); setItems((a) => (a || []).filter((c) => c.id !== id)); onCount && onCount((n) => Math.max(0, (n || 0) - 1)); }
    catch (e) { toast(e.message || 'Could not delete', 'fa-triangle-exclamation'); }
  };
  return (
    <Modal title="Comments" onClose={onClose} maxWidth={460}>
      <div style={{ maxHeight:'50vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
        {items === null ? <div style={{ textAlign:'center', padding:20 }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)' }} /></div>
          : items.length === 0 ? <div className="ym-sub" style={{ textAlign:'center', padding:'20px 0' }}>No comments yet — be the first.</div>
          : items.map((c) => (
            <div key={c.id} style={{ display:'flex', gap:10 }}>
              <Thumb icon="fa-user" img={c.photo} size={32} radius={999} />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="ym-sub" style={{ color:'var(--m-fg1)' }}><b>{c.name}</b> {c.text}</div>
                <div className="ym-cap">{ago(c.createdAt)}</div>
              </div>
              {c.uid && c.uid === myUid && <button onClick={() => del(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:12 }} aria-label="Delete"><FA i="fa-trash-can" /></button>}
            </div>
          ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Add a comment…"
          style={{ flex:1, padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
        <button onClick={send} disabled={busy || !text.trim()} className="ym-btn ym-btn-primary" style={{ flexShrink:0 }}><FA i="fa-paper-plane" /></button>
      </div>
    </Modal>
  );
}
