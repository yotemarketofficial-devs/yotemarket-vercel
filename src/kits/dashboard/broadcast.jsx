/* broadcast.jsx (merchant) — "Followers" channel. Post an update to everyone who
   follows the store: a new arrival, restock, or a followers-only offer. Posts are
   SHOPPABLE (tag a product → tap to buy) and push a notification to followers.
   The follower graph becomes a re-marketing + sales channel. */
import React from 'react';
import { FA, Card, Btn } from './primitives.jsx';
import { useMerchant } from './merchant.jsx';
import { createStorePost, listMyStorePosts, deleteStorePost, listPostComments, deletePostComment, listStoreFollowers } from '../../lib/firebase.js';
import { ksh } from './data.js';
const { useState, useEffect, useCallback } = React;

const KINDS = [
  ['update', 'Update', 'fa-bullhorn'],
  ['new_product', 'New arrival', 'fa-sparkles'],
  ['restock', 'Back in stock', 'fa-rotate'],
  ['offer', 'Offer', 'fa-tag'],
  ['sale', 'Sale', 'fa-fire'],
];
const KIND_LABEL = Object.fromEntries(KINDS.map(([k, l]) => [k, l]));
const fmt = (ms) => { try { return new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }); } catch { return ''; } };

export function Broadcast({ toast }){
  const { store, products } = useMerchant();
  const followers = Number(store?.followers) || 0;
  const prodList = Array.isArray(products) ? products : [];
  const [tab, setTab] = useState('broadcast'); // 'broadcast' | 'audience'
  const [posts, setPosts] = useState(null);

  const load = useCallback(async () => {
    try { const r = await listMyStorePosts(); setPosts(r.posts || []); }
    catch { setPosts([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const TABS = [['broadcast', 'Broadcast', 'fa-bullhorn'], ['audience', 'Audience' + (followers ? ` · ${followers.toLocaleString()}` : ''), 'fa-users']];

  return (
    <div className="anim-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:6 }}>
        <h1 className="ym-h1">Followers</h1>
        <div className="ym-card" style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:9 }}>
          <FA i="fa-users" style={{ color:'var(--m-primary)' }} />
          <div><div className="ym-h3" style={{ fontSize:16, lineHeight:1 }}>{followers.toLocaleString()}</div><div className="ym-cap">followers</div></div>
        </div>
      </div>
      <p className="ym-sub" style={{ marginBottom:16 }}>Post to everyone who follows you — a new arrival, a restock, or a followers-only deal. They get a notification and see it in their feed. Tag a product to make it tap-to-buy.</p>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display:'inline-flex', alignItems:'center', gap:7, height:36, padding:'0 15px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700,
            border:'1px solid '+(tab===k?'var(--m-primary)':'var(--m-border)'), background: tab===k?'var(--m-primary)':'var(--m-surface)', color: tab===k?'#fff':'var(--m-fg2)' }}>
            <FA i={ic} style={{ fontSize:12 }} /> {l}
          </button>
        ))}
      </div>

      {tab === 'broadcast' ? (
        <>
          <Composer followers={followers} products={prodList} toast={toast} onPosted={load} />

          <div className="ym-h3" style={{ fontSize:15, margin:'26px 0 12px' }}>Your posts</div>
          {posts === null ? (
            <Card style={{ padding:'34px', textAlign:'center' }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)', fontSize:20 }} /></Card>
          ) : posts.length === 0 ? (
            <Card style={{ padding:'34px 24px', textAlign:'center' }}>
              <div className="ym-h3">No posts yet</div>
              <div className="ym-sub" style={{ marginTop:4 }}>Your first broadcast will reach all {followers} followers.</div>
            </Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {posts.map((p) => <PostCard key={p.id} p={p} toast={toast} onDeleted={load} />)}
            </div>
          )}
        </>
      ) : (
        <Audience />
      )}
    </div>
  );
}

/* Who follows this store — the audience behind the broadcast channel. Its own tab
   so the follower list is separate from composing posts. Owner/manager only. */
function Audience(){
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    listStoreFollowers().then((r) => { if (alive) setList(r.followers || []); }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, []);
  const when = (ms) => { if (!ms) return ''; try { return new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }); } catch { return ''; } };

  if (list === null) return <Card style={{ padding:'34px', textAlign:'center' }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)', fontSize:20 }} /></Card>;
  if (list.length === 0) return (
    <Card style={{ padding:'34px 24px', textAlign:'center' }}>
      <FA i="fa-users" style={{ color:'var(--m-primary)', fontSize:22, marginBottom:10 }} />
      <div className="ym-h3">No followers yet</div>
      <div className="ym-sub" style={{ marginTop:4 }}>Share your store and post great updates — the shoppers who follow you will appear here.</div>
    </Card>
  );
  return (
    <Card style={{ padding:8 }}>
      {list.map((f) => (
        <div key={f.uid} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}>
          <div style={{ width:42, height:42, borderRadius:999, flexShrink:0, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>{f.photoUrl ? <img src={f.photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-user" />}</div>
          <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name || 'Shopper'}</div><div className="ym-cap">Following since {when(f.followedAt) || '—'}</div></div>
        </div>
      ))}
    </Card>
  );
}

function Composer({ followers, products, toast, onPosted }){
  const [kind, setKind] = useState('update');
  const [text, setText] = useState('');
  const [productId, setProductId] = useState('');
  const [offerText, setOfferText] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [busy, setBusy] = useState(false);
  const showOffer = kind === 'offer' || kind === 'sale';
  const inp = { width:'100%', padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  const post = async () => {
    if (text.trim().length < 2 && !productId) { toast && toast('Write something or tag a product', 'fa-triangle-exclamation'); return; }
    setBusy(true);
    try {
      const r = await createStorePost({ kind, text: text.trim(), ...(productId ? { productId } : {}), ...(showOffer && offerText.trim() ? { offerText: offerText.trim() } : {}), ...(showOffer && offerCode.trim() ? { offerCode: offerCode.trim() } : {}) });
      toast && toast(`Posted to ${r.notified ?? followers} follower${(r.notified ?? followers) === 1 ? '' : 's'}`, 'fa-circle-check');
      setText(''); setProductId(''); setOfferText(''); setOfferCode(''); setKind('update');
      onPosted && onPosted();
    } catch (e) { toast && toast(e.message || 'Could not post', 'fa-triangle-exclamation'); }
    finally { setBusy(false); }
  };

  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        {KINDS.map(([k, l, ic]) => (
          <button key={k} onClick={() => setKind(k)} style={{ display:'inline-flex', alignItems:'center', gap:7, height:34, padding:'0 13px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600,
            border:'1px solid '+(kind===k?'var(--m-primary)':'var(--m-border)'), background:kind===k?'var(--m-primary)':'var(--m-surface)', color:kind===k?'#fff':'var(--m-fg2)' }}>
            <FA i={ic} style={{ fontSize:12 }} /> {l}
          </button>
        ))}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What do you want your followers to know? e.g. New Ankara dresses just landed 🌟" style={{ ...inp, resize:'vertical' }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginTop:10 }}>
        <label className="ym-cap" style={{ fontWeight:600 }}>Tag a product (shoppable — optional)
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inp}>
            <option value="">No product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price != null ? ` · ${ksh(p.price)}` : ''}</option>)}
          </select>
        </label>
        {showOffer && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:10 }}>
            <label className="ym-cap" style={{ fontWeight:600 }}>Offer line
              <input value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="20% off this weekend for followers" style={inp} />
            </label>
            <label className="ym-cap" style={{ fontWeight:600 }}>Code (optional)
              <input value={offerCode} onChange={(e) => setOfferCode(e.target.value.toUpperCase())} placeholder="FOLLOW20" style={inp} />
            </label>
          </div>
        )}
      </div>

      <Btn kind="primary" style={{ width:'100%', marginTop:14, justifyContent:'center' }} disabled={busy} onClick={post}>
        {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Posting…</> : <><FA i="fa-paper-plane" /> Post to {followers.toLocaleString()} follower{followers === 1 ? '' : 's'}</>}
      </Btn>
    </Card>
  );
}

function PostCard({ p, toast, onDeleted }){
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const del = async () => {
    if (!window.confirm('Delete this post?')) return;
    setBusy(true);
    try { await deleteStorePost({ id: p.id }); toast && toast('Post deleted', 'fa-check'); onDeleted && onDeleted(); }
    catch (e) { toast && toast(e.message || 'Could not delete', 'fa-triangle-exclamation'); setBusy(false); }
  };
  return (
    <Card style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--m-primary)', background:'var(--m-surface-2)', padding:'2px 9px', borderRadius:999 }}>{KIND_LABEL[p.kind] || 'Update'}</span>
        <span className="ym-cap">{fmt(p.createdAt)}</span>
        <div style={{ flex:1 }} />
        <button onClick={del} disabled={busy} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:13 }} title="Delete"><FA i="fa-trash-can" /></button>
      </div>
      {p.text && <div className="ym-sub" style={{ color:'var(--m-fg1)', whiteSpace:'pre-wrap', marginBottom:8 }}>{p.text}</div>}
      {p.productId && (
        <div className="ym-card" style={{ padding:10, display:'flex', alignItems:'center', gap:10, marginBottom:8, background:'var(--m-surface-2)' }}>
          <div style={{ width:38, height:38, borderRadius:9, background:'var(--m-surface)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--m-primary)', overflow:'hidden' }}>{p.productImage ? <img src={p.productImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-box" />}</div>
          <div style={{ flex:1, minWidth:0 }}><div className="ym-cap" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{p.productName}</div>{p.productPrice != null && <div className="ym-cap">{ksh(p.productPrice)}</div>}</div>
          <span className="ym-cap" style={{ color:'var(--m-primary)' }}><FA i="fa-cart-shopping" /> Shoppable</span>
        </div>
      )}
      {(p.offerText || p.offerCode) && (
        <div className="ym-cap" style={{ display:'inline-flex', alignItems:'center', gap:7, color:'var(--m-amber,#d97706)', background:'color-mix(in srgb,var(--m-amber,#d97706) 12%, transparent)', padding:'5px 11px', borderRadius:9, marginBottom:8 }}>
          <FA i="fa-tag" /> {p.offerText || 'Offer'}{p.offerCode ? ` · ${p.offerCode}` : ''}
        </div>
      )}
      <div className="ym-cap" style={{ display:'flex', gap:14, marginTop:2, alignItems:'center' }}>
        <span><FA i="fa-heart" /> {p.reactionCount || 0}</span>
        <button onClick={() => setSheet(true)} style={{ background:'none', border:'none', cursor:'pointer', color: (p.commentCount || 0) ? 'var(--m-primary)' : 'var(--m-fg3)', fontFamily:'inherit', fontSize:'inherit', fontWeight:600, padding:0 }}>
          <FA i="fa-comment" /> {p.commentCount || 0} {p.commentCount ? 'comments' : 'comment'}
        </button>
      </div>
      {sheet && <CommentsModal post={p} toast={toast} onClose={() => setSheet(false)} />}
    </Card>
  );
}

function CommentsModal({ post, toast, onClose }){
  const [items, setItems] = useState(null);
  const load = () => { listPostComments({ postId: post.id }).then((r) => setItems(r.comments || [])).catch(() => setItems([])); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const del = async (id) => {
    if (!window.confirm('Remove this comment?')) return;
    try { await deletePostComment({ postId: post.id, commentId: id }); setItems((a) => (a || []).filter((c) => c.id !== id)); toast && toast('Comment removed', 'fa-check'); }
    catch (e) { toast && toast(e.message || 'Could not remove', 'fa-triangle-exclamation'); }
  };
  const ago = (ms) => { if (!ms) return ''; const s = Math.max(0, (Date.now() - ms) / 1000); if (s < 3600) return Math.round(s / 60) + 'm'; if (s < 86400) return Math.round(s / 3600) + 'h'; return Math.round(s / 86400) + 'd'; };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e) => e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:460, maxHeight:'80vh', overflowY:'auto', padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div className="ym-h2" style={{ fontSize:17 }}>Comments</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>
        {items === null ? <div style={{ textAlign:'center', padding:20 }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)' }} /></div>
          : items.length === 0 ? <div className="ym-sub" style={{ textAlign:'center', padding:'20px 0' }}>No comments yet.</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {items.map((c) => (
                <div key={c.id} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:999, flexShrink:0, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>{c.photo ? <img src={c.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FA i="fa-user" />}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="ym-sub" style={{ color:'var(--m-fg1)' }}><b>{c.name}</b> {c.text}</div>
                    <div className="ym-cap">{ago(c.createdAt)}</div>
                  </div>
                  <button onClick={() => del(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:12 }} title="Remove comment"><FA i="fa-trash-can" /></button>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}
