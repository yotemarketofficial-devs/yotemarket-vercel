/* overview.jsx — Merchant dashboard overview (aligned theme). */
import React from 'react';
import { FA, Card, Btn, Pill, Avatar, Thumb, Stat, SectionCard } from './primitives.jsx';
import { INSIGHTS, ksh } from './data.js';
import { useShop, useStoreOverview } from './merchant.jsx';
const { useState: useStateO } = React;

function WelcomeBanner({ onCopy }){
  const shop = useShop();
  const [copied, setCopied] = useStateO(false);
  const link = `yotemarket.com/store/${shop.shopId}`;
  const copy = ()=>{ navigator.clipboard && navigator.clipboard.writeText('https://'+link); setCopied(true); onCopy&&onCopy(); setTimeout(()=>setCopied(false),1600); };
  return (
    <div className="ym-card" style={{ padding:26, marginBottom:22, color:'#fff', position:'relative', overflow:'hidden', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
      <div style={{ position:'absolute', right:-30, top:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(252,211,77,.4), transparent 70%)' }} />
      <div style={{ display:'flex', justifyContent:'space-between', gap:24, flexWrap:'wrap', alignItems:'center', position:'relative' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, margin:0 }}>Karibu, {shop.first}! 👋</h1>
          <p style={{ color:'rgba(255,255,255,.85)', fontSize:14.5, marginTop:6, maxWidth:420 }}>Share your storefront link and keep customers coming back.</p>
        </div>
        <div style={{ background:'rgba(255,255,255,.14)', borderRadius:14, padding:14, minWidth:320, border:'1px solid rgba(255,255,255,.2)' }}>
          <div style={{ color:'rgba(255,255,255,.75)', fontSize:12, marginBottom:8 }}>Your store link</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, color:'#fff', fontSize:13, fontFamily:'ui-monospace,Menlo,monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{link}</code>
            <button onClick={copy} style={{ background:'#fff', color:'var(--m-primary-deep)', fontWeight:700, padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>{copied?'Copied':'Copy'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekChart({ data }){
  const week = data && data.length ? data : [];
  const max = Math.max(1, ...week.map(d=>d.v));
  return (
    <Card style={{ padding:22, marginBottom:22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div><div className="ym-h2" style={{ fontSize:17 }}>Orders this week</div><div className="ym-cap" style={{ marginTop:2 }}>Daily orders across all products</div></div>
        <div className="scroll-x" style={{ gap:4, background:'var(--m-surface-2)', borderRadius:10, padding:4 }}>
          {['Day','Week','Month'].map((t,i)=>(<button key={t} style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, background:i===1?'var(--m-surface)':'transparent', color:i===1?'var(--m-fg1)':'var(--m-fg3)', boxShadow:i===1?'var(--m-shadow-card)':'none' }}>{t}</button>))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:180 }}>
        {week.map((d,i)=>(
          <div key={i} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div className="ym-cap" style={{ fontWeight:700, color:'var(--m-fg2)' }}>{d.v}</div>
            <div style={{ flex:1, width:'100%', display:'flex', alignItems:'flex-end' }}>
              <div style={{ width:'100%', borderRadius:'8px 8px 0 0', height:`${(d.v/max)*100}%`, minHeight:6, background: i===week.length-1?'var(--m-grad)':'var(--m-surface-3)', boxShadow: i===week.length-1?'var(--m-glow)':'none' }} />
            </div>
            <div className="ym-cap">{d.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Insights(){
  return (
    <Card style={{ padding:22, marginBottom:22 }}>
      <div className="ym-h2" style={{ fontSize:17, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><FA i="fa-wand-magic-sparkles" style={{ color:'var(--m-secondary)' }} /> Store intelligence</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
        {INSIGHTS.map((it,i)=>(
          <div key={i} style={{ display:'flex', gap:12, padding:13, borderRadius:14, background:'var(--m-surface-2)' }}>
            <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:it.tint+'22', color:it.tint }}><FA i={it.icon} /></div>
            <div><div className="ym-h3" style={{ fontSize:13.5 }}>{it.label}</div><div className="ym-cap" style={{ marginTop:2 }}>{it.detail}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyRow({ icon, text }){
  return <div style={{ padding:'34px 18px', textAlign:'center', color:'var(--m-fg3)' }}><FA i={icon} style={{ fontSize:26, color:'var(--m-fg4)' }} /><div style={{ marginTop:10, fontSize:13.5 }}>{text}</div></div>;
}

export function ProductsTable({ rows, onAdd, onOpenProducts }){
  return (
    <SectionCard title="Recent products" sub={`${rows.length} product${rows.length!==1?'s':''}`}
      action={<div style={{ display:'flex', gap:8 }}><Btn kind="ghost" size="sm" onClick={onOpenProducts}>View all</Btn><Btn kind="primary" size="sm" icon="fa-plus" onClick={onAdd}>Add product</Btn></div>}>
      {rows.length === 0 ? <EmptyRow icon="fa-box-open" text="No products yet — add your first product to start selling." /> : (
      <div style={{ overflowX:'auto' }}>
        <table className="ym-table" style={{ minWidth:640 }}>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sales</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:12 }}><Thumb icon={r.icon} tint={r.tint} size={40} /><span style={{ fontWeight:600, color:'var(--m-fg1)' }}>{r.name}</span></div></td>
                <td>{r.cat}</td>
                <td style={{ fontWeight:600, color:'var(--m-fg1)' }}>{ksh(r.price)}</td>
                <td>{r.stock===0 ? <span style={{ color:'var(--m-danger)', fontWeight:600 }}>Out</span> : r.stock}</td>
                <td>{r.sales}</td>
                <td><Pill tone={r.status}>{r.status==='active'?'Active':r.status==='pending'?'Pending':'Inactive'}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </SectionCard>
  );
}

export function OrdersTable({ rows }){
  const lbl = { active:'Paid', pending:'Processing', inactive:'Refunded' };
  return (
    <SectionCard title="Recent orders" sub={`${rows.length} order${rows.length!==1?'s':''}`} action={<Btn kind="ghost" size="sm" iconRight="fa-arrow-right">View all sales</Btn>}>
      {rows.length === 0 ? <EmptyRow icon="fa-receipt" text="No orders yet — they'll appear here once customers buy." /> : (
      <div style={{ overflowX:'auto' }}>
        <table className="ym-table" style={{ minWidth:680 }}>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Hub</th><th>Status</th><th>When</th></tr></thead>
          <tbody>
            {rows.map((o,idx)=>(
              <tr key={o.id+'-'+idx}>
                <td style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5 }}>#{o.id}</td>
                <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><Avatar src={`/assets/avatars/${o.avatar}`} name={o.buyer} size={30} /><span style={{ fontWeight:600, color:'var(--m-fg1)' }}>{o.buyer}</span></div></td>
                <td>{o.items}</td>
                <td style={{ fontWeight:700, color:'var(--m-fg1)' }}>{ksh(o.total)}</td>
                <td>{o.hub}</td>
                <td><Pill tone={o.status}>{lbl[o.status]}</Pill></td>
                <td className="ym-cap">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </SectionCard>
  );
}

export function Overview({ onAdd, onCopyLink, onOpenProducts }){
  const ov = useStoreOverview();
  return (
    <div className="anim-up">
      <WelcomeBanner onCopy={onCopyLink} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:22 }}>
        {ov.kpis.map(k=><Stat key={k.label} {...k} delta={k.delta} up={k.up} />)}
      </div>
      <WeekChart data={ov.week} />
      {!ov.live && <Insights />}
      <div style={{ marginBottom:22 }}><ProductsTable rows={ov.products.slice(0,5)} onAdd={onAdd} onOpenProducts={onOpenProducts} /></div>
      <OrdersTable rows={ov.orders} />
    </div>
  );
}
