/* products.jsx — Merchant products CRUD + Add Product modal (aligned theme). */
import React from 'react';
import { FA, Card, Btn, Pill, Thumb, Stat } from './primitives.jsx';
import { PROD_ROWS, ksh } from './data.js';
import { useMerchant } from './merchant.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import { productImagePath } from '../../lib/storage.js';
import { saveProduct } from '../../lib/firebase.js';
const { useState: useStateP } = React;

// Map the modal's category labels onto the storefront catalog category ids.
const CAT_MAP = { Phones:'electronics', Electronics:'electronics', Audio:'electronics', Photography:'electronics', Fashion:'fashion', Groceries:'groceries', Beauty:'beauty', 'Home & Living':'home' };

export function Products({ onAdd, toast }){
  const [filter, setFilter] = useStateP('all');
  const [search, setSearch] = useStateP('');
  const rows = PROD_ROWS.filter(p=>(filter==='all'||p.status===filter)&&(search===''||p.name.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="anim-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:14, marginBottom:20 }}>
        <div><h1 className="ym-h1">My Products</h1><p className="ym-sub" style={{ marginTop:4 }}>47 products · 3 pending review · 1 out of stock</p></div>
        <Btn kind="primary" icon="fa-plus" onClick={onAdd}>Add product</Btn>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16, marginBottom:20 }}>
        <Stat label="Total" value="47" icon="fa-box" tone="#7c3aed" />
        <Stat label="Active" value="42" icon="fa-circle-check" tone="#10b981" />
        <Stat label="Pending" value="3" icon="fa-clock" tone="#f59e0b" />
        <Stat label="Out of stock" value="1" icon="fa-triangle-exclamation" tone="#ef4444" />
      </div>
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--m-border)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:380 }}>
            <FA i="fa-magnifying-glass" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--m-fg4)' }} />
            <input className="ym-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products by name or SKU…" style={{ paddingLeft:40 }} />
          </div>
          <div className="scroll-x" style={{ gap:4, background:'var(--m-surface-2)', borderRadius:10, padding:4 }}>
            {[['all','All'],['active','Active'],['pending','Pending'],['inactive','Inactive']].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, whiteSpace:'nowrap', background:filter===k?'var(--m-surface)':'transparent', color:filter===k?'var(--m-fg1)':'var(--m-fg3)', boxShadow:filter===k?'var(--m-shadow-card)':'none' }}>{l}</button>
            ))}
          </div>
          <Btn kind="ghost" size="sm" icon="fa-download" onClick={()=>toast&&toast('Exporting products…')}>Export</Btn>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="ym-table" style={{ minWidth:720 }}>
            <thead><tr><th style={{ width:36 }}><input type="checkbox" aria-label="Select all" /></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sales</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id}>
                  <td><input type="checkbox" aria-label={`Select ${r.name}`} /></td>
                  <td><div style={{ display:'flex', alignItems:'center', gap:12 }}><Thumb icon={r.icon} tint={r.tint} size={44} /><div><div style={{ fontWeight:600, color:'var(--m-fg1)' }}>{r.name}</div><div className="ym-cap" style={{ fontFamily:'ui-monospace,Menlo,monospace', marginTop:1 }}>{r.id.toUpperCase()}</div></div></div></td>
                  <td>{r.cat}</td>
                  <td style={{ fontWeight:600, color:'var(--m-fg1)' }}>{ksh(r.price)}</td>
                  <td>{r.stock===0 ? <span style={{ color:'var(--m-danger)', fontWeight:600 }}>Out</span> : r.stock}</td>
                  <td>{r.sales}</td>
                  <td><Pill tone={r.status}>{r.status==='active'?'Active':r.status==='pending'?'Pending':'Inactive'}</Pill></td>
                  <td><div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>{['fa-pen','fa-arrow-up-right-from-square','fa-trash'].map((ic,i)=><button key={ic} className="icon-btn" aria-label={ic.replace('fa-','')} style={{ width:32, height:32, fontSize:13, background:'transparent', color: i===2?'var(--m-danger)':'var(--m-fg3)' }}><FA i={ic} /></button>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--m-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="ym-cap">Showing {rows.length} of 47</span>
          <div style={{ display:'flex', gap:4 }}>{['←','1','2','3','→'].map((p,i)=><button key={i} aria-label={`Page ${p}`} style={{ minWidth:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, background:p==='1'?'var(--m-primary-deep)':'transparent', color:p==='1'?'#fff':'var(--m-fg3)' }}>{p}</button>)}</div>
        </div>
      </Card>
    </div>
  );
}

export function AddProductModal({ onClose, onSave }){
  const { store } = useMerchant();
  const storeId = store?.id;
  const [step, setStep] = useStateP(1);
  const [form, setForm] = useStateP({ name:'', category:'Phones', summary:'', desc:'', price:'', discount:'', img:'' });
  const [saving, setSaving] = useStateP(false);
  const [err, setErr] = useStateP('');
  const set = (k,v)=>setForm(f=>({ ...f, [k]:v }));
  const labels = ['Basics','Pricing & inventory','Images'];

  const publish = async () => {
    if (saving) return;
    if (!form.name.trim()) { setErr('Add a product name.'); setStep(1); return; }
    if (!storeId) { setErr('Set up your store before adding products.'); return; }
    setSaving(true); setErr('');
    try {
      await saveProduct({
        name: form.name.trim(), price: Number(form.price) || 0,
        was: form.discount ? Number(form.discount) : null,
        catId: CAT_MAP[form.category] || null, desc: form.desc || form.summary || '',
        img: form.img || null,
      });
      onSave(form);
    } catch (e) { setErr(e.message || 'Could not publish the product.'); setSaving(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(17,24,39,.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ym-card" style={{ width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--m-shadow-float)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid var(--m-border)' }}>
          <div><h2 className="ym-h2">Add a new product</h2><p className="ym-cap" style={{ marginTop:2 }}>Step {step} of 3 — {labels[step-1]}</p></div>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><FA i="fa-xmark" /></button>
        </div>
        <div style={{ padding:'16px 24px 0', display:'flex', gap:8 }}>{[1,2,3].map(n=><div key={n} style={{ flex:1, height:6, borderRadius:9999, background:n<=step?'var(--m-primary)':'var(--m-surface-2)' }} />)}</div>
        <div style={{ padding:24 }}>
          {step===1 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Field label="Product name"><input className="ipt" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Samsung Galaxy A05" /></Field>
            <Field label="Category"><select className="ipt" value={form.category} onChange={e=>set('category',e.target.value)}>{['Phones','Electronics','Fashion','Groceries','Beauty','Home & Living','Photography','Audio'].map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Short summary" hint="One line shown in product listings"><input className="ipt" value={form.summary} onChange={e=>set('summary',e.target.value)} placeholder="6.7&quot; display, 50MP camera, 2-year warranty" /></Field>
            <Field label="Full description"><textarea rows={4} className="ipt" style={{ resize:'none' }} value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="Tell shoppers what makes this product great…" /></Field>
          </div>}
          {step===2 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Price (Ksh)"><input className="ipt" type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="14360" /></Field>
              <Field label="Discounted price"><input className="ipt" type="number" value={form.discount} onChange={e=>set('discount',e.target.value)} placeholder="12250" /></Field>
            </div>
            <Field label="Quantity in stock"><input className="ipt" type="number" defaultValue={10} /></Field>
            <Field label="SKU" hint="For your inventory tracking"><input className="ipt" placeholder="YM-PHN-A05" /></Field>
            <div style={{ display:'flex', gap:12, padding:14, borderRadius:14, background:'var(--m-surface-3)' }}><FA i="fa-circle-info" style={{ color:'var(--m-primary)', marginTop:2 }} /><div className="ym-sub" style={{ color:'var(--m-link)' }}>YoteMarket holds funds in M-Pesa escrow. Buyers can negotiate via the in-app messenger before confirming.</div></div>
          </div>}
          {step===3 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="ym-label">Cover image</label>
              <ImageUpload aspect={1} outputSize={900} title="Product photo"
                pathFor={()=>productImagePath(storeId)}
                onUploaded={(url)=>set('img',url)}
                onError={(e)=>setErr(e.message || 'Upload failed')}>
                {({ pick, uploading })=>(
                  <button type="button" onClick={()=>storeId && pick()} disabled={!storeId}
                    style={{ width:'100%', border:'2px dashed var(--m-border)', borderRadius:14, padding: form.img?6:32, textAlign:'center', cursor: storeId?'pointer':'not-allowed', background:'transparent', overflow:'hidden', fontFamily:'inherit' }}>
                    {form.img
                      ? <img src={form.img} alt="" style={{ width:'100%', maxHeight:260, objectFit:'cover', borderRadius:10, display:'block' }} />
                      : <><FA i={uploading?'fa-circle-notch':'fa-cloud-arrow-up'} style={{ fontSize:28, color:'var(--m-primary)', marginBottom:8, animation: uploading?'ym-spin 1s linear infinite':'none' }} /><div className="ym-h3" style={{ fontSize:14 }}>{uploading?'Uploading…':'Click to upload & crop'}</div><div className="ym-cap" style={{ marginTop:2 }}>{storeId ? 'PNG or JPG · square crop' : 'Set up your store first'}</div></>}
                  </button>
                )}
              </ImageUpload>
              {form.img && <button type="button" onClick={()=>set('img','')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--m-link)', marginTop:6 }}>Replace / remove photo</button>}
            </div>
            {err && <div className="ym-sub" style={{ color:'var(--m-danger)', display:'flex', gap:8, alignItems:'center' }}><FA i="fa-triangle-exclamation" /> {err}</div>}
          </div>}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--m-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--m-fg3)', opacity:step===1?.4:1 }}><FA i="fa-arrow-left" /> Back</button>
          {step<3 ? <Btn kind="primary" iconRight="fa-arrow-right" onClick={()=>setStep(s=>s+1)}>Next</Btn> : <Btn kind="primary" icon={saving?'fa-circle-notch':'fa-check'} onClick={publish} disabled={saving}>{saving?'Publishing…':'Publish product'}</Btn>}
        </div>
      </div>
    </div>
  );
}
function Field({ label, hint, children }){ return <div><label className="ym-label">{label}</label>{children}{hint && <div className="ym-cap" style={{ marginTop:5 }}>{hint}</div>}</div>; }
