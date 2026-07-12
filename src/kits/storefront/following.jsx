/* following.jsx — Storefront: the Following feed. Updates from the stores you
   follow: new arrivals, restocks and followers-only offers. Shoppable — tap a
   tagged product to buy, or copy an offer code. Reads getFollowingFeed. */
import React from 'react';
import { useYM, FA, Thumb, GuestGate } from './ui.jsx';
import { ymPrice } from './data.js';
import { getFollowingFeed } from '../../lib/firebase.js';
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
  const copyCode = () => { try { navigator.clipboard.writeText(p.offerCode); toast('Code copied · ' + p.offerCode, 'fa-copy'); } catch { /* clipboard blocked */ } };
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
    </div>
  );
}
