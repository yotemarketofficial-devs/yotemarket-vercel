/* products.jsx — Merchant products CRUD + Add Product modal (aligned theme). */
import React from 'react';
import { FA, Card, Btn, Pill, Thumb, Stat } from './primitives.jsx';
import { ksh } from './data.js';
import { useMerchant, useStoreOverview } from './merchant.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import { productImagePath } from '../../lib/storage.js';
import { saveProduct, deleteProduct } from '../../lib/firebase.js';
import { useEscape } from '../../lib/useEscape.js';
import { CATEGORY_TREE } from '../storefront/categories.js';
import { ScreenCoach } from './ScreenCoach.jsx';
const { useState: useStateP } = React;

const PRODUCTS_COACH = [
  { selector: '[data-coach="products-add"]', title: 'Add your products', body: 'Tap here to list an item — photo, price and stock. Each one gets an automatic SKU and appears on your storefront the moment you publish.' },
  { selector: '[data-coach="products-list"]', title: 'Manage your catalogue', body: 'Everything you sell lives here. Search by name or SKU, filter by status, and update price or stock anytime.' },
];

export function Products({ onAdd, toast }){
  const [filter, setFilter] = useStateP('all');
  const [search, setSearch] = useStateP('');
  const [editing, setEditing] = useStateP(null);   // product row being edited, or null
  const [busyId, setBusyId] = useStateP(null);      // product being deleted
  const { products } = useStoreOverview();
  const delProduct = async (r) => {
    if (busyId) return;
    if (!window.confirm(`Delete “${r.name}”? This removes it from your storefront and can't be undone.`)) return;
    setBusyId(r.id);
    try { await deleteProduct({ id: r.id }); toast && toast(`Deleted “${r.name}”`); }
    catch (e) { toast && toast(e.message || 'Could not delete the product'); }
    finally { setBusyId(null); }
  };
  const viewProduct = (r) => window.open(`/storefront?product=${encodeURIComponent(r.id)}`, '_blank');
  const all = products || [];
  const total = all.length;
  const active = all.filter(p=>p.status==='active').length;
  const out = all.filter(p=>p.stock===0).length;
  const rows = all.filter(p=>(filter==='all'||p.status===filter||(filter==='out'&&p.stock===0))&&(search===''||p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="anim-up">
      <ScreenCoach id="products" steps={PRODUCTS_COACH} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:14, marginBottom:20 }}>
        <div><h1 className="ym-h1">My Products</h1><p className="ym-sub" style={{ marginTop:4 }}>{total} product{total!==1?'s':''}{out?` · ${out} out of stock`:''}</p></div>
        <Btn kind="primary" icon="fa-plus" onClick={onAdd} data-coach="products-add">Add product</Btn>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16, marginBottom:20 }}>
        <Stat label="Total" value={String(total)} icon="fa-box" tone="#7c3aed" />
        <Stat label="Active" value={String(active)} icon="fa-circle-check" tone="#10b981" />
        <Stat label="Inactive" value={String(total-active)} icon="fa-eye-slash" tone="#f59e0b" />
        <Stat label="Out of stock" value={String(out)} icon="fa-triangle-exclamation" tone="#ef4444" />
      </div>
      <Card style={{ padding:0, overflow:'hidden' }} data-coach="products-list">
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--m-border)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:380 }}>
            <FA i="fa-magnifying-glass" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--m-fg4)' }} />
            <input className="ym-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products by name or SKU…" style={{ paddingLeft:40 }} />
          </div>
          <div className="scroll-x" style={{ gap:4, background:'var(--m-surface-2)', borderRadius:10, padding:4 }}>
            {[['all','All'],['active','Active'],['inactive','Inactive'],['out','Out of stock']].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{ padding:'7px 13px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, whiteSpace:'nowrap', background:filter===k?'var(--m-surface)':'transparent', color:filter===k?'var(--m-fg1)':'var(--m-fg3)', boxShadow:filter===k?'var(--m-shadow-card)':'none' }}>{l}</button>
            ))}
          </div>
          <Btn kind="ghost" size="sm" icon="fa-download" onClick={()=>toast&&toast('Exporting products…')}>Export</Btn>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="ym-table" style={{ minWidth:720 }}>
            <thead><tr><th style={{ width:36 }}><input type="checkbox" aria-label="Select all" /></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sales</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.length===0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--m-fg3)', padding:'40px 20px' }}>
                  <FA i="fa-box-open" style={{ fontSize:26, color:'var(--m-fg4)', display:'block', marginBottom:10 }} />
                  {all.length===0 ? 'No products yet — tap “Add product” to list your first item.' : 'No products match this filter.'}
                </td></tr>
              )}
              {rows.map(r=>(
                <tr key={r.id}>
                  <td><input type="checkbox" aria-label={`Select ${r.name}`} /></td>
                  <td><div style={{ display:'flex', alignItems:'center', gap:12 }}><Thumb icon={r.icon} tint={r.tint} size={44} /><div><div style={{ fontWeight:600, color:'var(--m-fg1)' }}>{r.name}</div><div className="ym-cap" style={{ fontFamily:'ui-monospace,Menlo,monospace', marginTop:1 }}>{r.sku || (r.id||'').toUpperCase()}</div></div></div></td>
                  <td>{r.cat}</td>
                  <td style={{ fontWeight:600, color:'var(--m-fg1)' }}>{ksh(r.price)}</td>
                  <td>{r.stock===0 ? <span style={{ color:'var(--m-danger)', fontWeight:600 }}>Out</span> : r.stock}</td>
                  <td>{r.sales}</td>
                  <td><Pill tone={r.status}>{r.status==='active'?'Active':r.status==='pending'?'Pending':'Inactive'}</Pill></td>
                  <td><div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                    <button className="icon-btn" aria-label="Edit product" title="Edit" onClick={()=>setEditing(r)} style={{ width:32, height:32, fontSize:13, background:'transparent', color:'var(--m-fg3)' }}><FA i="fa-pen" /></button>
                    <button className="icon-btn" aria-label="View on storefront" title="View on storefront" onClick={()=>viewProduct(r)} style={{ width:32, height:32, fontSize:13, background:'transparent', color:'var(--m-fg3)' }}><FA i="fa-arrow-up-right-from-square" /></button>
                    <button className="icon-btn" aria-label="Delete product" title="Delete" onClick={()=>delProduct(r)} disabled={busyId===r.id} style={{ width:32, height:32, fontSize:13, background:'transparent', color:'var(--m-danger)' }}><FA i={busyId===r.id?'fa-circle-notch':'fa-trash'} style={{ animation: busyId===r.id?'ym-spin 1s linear infinite':'none' }} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--m-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="ym-cap">Showing {rows.length} of {total}</span>
        </div>
      </Card>
      {editing && <AddProductModal editing={editing} onClose={()=>setEditing(null)} onSave={()=>{ setEditing(null); toast && toast('Product updated'); }} />}
    </div>
  );
}

export function AddProductModal({ onClose, onSave, editing }){
  const { store } = useMerchant();
  const storeId = store?.id;
  const isEdit = !!editing;
  useEscape(onClose); // Esc closes, same as the overlay click / X button
  const [step, setStep] = useStateP(1);
  const [form, setForm] = useStateP(() => isEdit ? {
    name: editing.name || '', catId: editing.catId || 'electronics', sub: editing.sub || '',
    summary: '', desc: editing.desc || '', price: editing.price != null ? String(editing.price) : '',
    discount: editing.was ? String(editing.was) : '',
    images: Array.isArray(editing.images) && editing.images.length ? editing.images.filter(Boolean) : (editing.img ? [editing.img] : []),
  } : { name:'', catId:'electronics', sub:'', summary:'', desc:'', price:'', discount:'', images:[] });
  const [saving, setSaving] = useStateP(false);
  const [err, setErr] = useStateP('');
  const set = (k,v)=>setForm(f=>({ ...f, [k]:v }));
  const addImage = (url)=>setForm(f=>({ ...f, images:[...f.images, url].slice(0,6) }));
  const removeImage = (idx)=>setForm(f=>({ ...f, images:f.images.filter((_,i)=>i!==idx) }));
  const makeCover = (idx)=>setForm(f=>{ const a=[...f.images]; const [x]=a.splice(idx,1); return { ...f, images:[x,...a] }; });
  const labels = ['Basics','Pricing & inventory','Photos'];

  const publish = async () => {
    if (saving) return;
    if (!form.name.trim()) { setErr('Add a product name.'); setStep(1); return; }
    if (!storeId) { setErr('Set up your store before adding products.'); return; }
    setSaving(true); setErr('');
    try {
      await saveProduct({
        ...(isEdit ? { id: editing.id } : {}),
        name: form.name.trim(), price: Number(form.price) || 0,
        was: form.discount ? Number(form.discount) : null,
        catId: form.catId || null, sub: form.sub || null, desc: form.desc || form.summary || '',
        images: form.images, img: form.images[0] || null,
      });
      onSave(form);
    } catch (e) { setErr(e.message || 'Could not save the product.'); setSaving(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(17,24,39,.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ym-card" style={{ width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--m-shadow-float)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid var(--m-border)' }}>
          <div><h2 className="ym-h2">{isEdit ? 'Edit product' : 'Add a new product'}</h2><p className="ym-cap" style={{ marginTop:2 }}>Step {step} of 3 — {labels[step-1]}</p></div>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><FA i="fa-xmark" /></button>
        </div>
        <div style={{ padding:'16px 24px 0', display:'flex', gap:8 }}>{[1,2,3].map(n=><div key={n} style={{ flex:1, height:6, borderRadius:9999, background:n<=step?'var(--m-primary)':'var(--m-surface-2)' }} />)}</div>
        <div style={{ padding:24 }}>
          {step===1 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Field label="Product name"><input className="ipt" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Samsung Galaxy A05" /></Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Category"><select className="ipt" value={form.catId} onChange={e=>setForm(f=>({ ...f, catId:e.target.value, sub:'' }))}>{CATEGORY_TREE.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
              {(() => { const node = CATEGORY_TREE.find(c=>c.id===form.catId); return (
                <Field label="Subcategory" hint="Lets shoppers filter to exactly this type">
                  <select className="ipt" value={form.sub} onChange={e=>set('sub',e.target.value)} disabled={!node?.subs?.length}>
                    <option value="">— None —</option>
                    {node?.subs?.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              ); })()}
            </div>
            <Field label="Short summary" hint="One line shown in product listings"><input className="ipt" value={form.summary} onChange={e=>set('summary',e.target.value)} placeholder="6.7&quot; display, 50MP camera, 2-year warranty" /></Field>
            <Field label="Full description"><textarea rows={4} className="ipt" style={{ resize:'none' }} value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="Tell shoppers what makes this product great…" /></Field>
          </div>}
          {step===2 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Price (Ksh)"><input className="ipt" type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="14360" /></Field>
              <Field label="Discounted price"><input className="ipt" type="number" value={form.discount} onChange={e=>set('discount',e.target.value)} placeholder="12250" /></Field>
            </div>
            <Field label="Quantity in stock"><input className="ipt" type="number" defaultValue={10} /></Field>
            <Field label="SKU" hint={isEdit ? 'Your store SKU (assigned on first save)' : 'Assigned automatically per store on save (e.g. WAN-0001)'}><input className="ipt" value={isEdit && editing.sku ? editing.sku : 'Auto-generated'} disabled style={{ opacity:.65 }} /></Field>
            <div style={{ display:'flex', gap:12, padding:14, borderRadius:14, background:'var(--m-surface-3)' }}><FA i="fa-circle-info" style={{ color:'var(--m-primary)', marginTop:2 }} /><div className="ym-sub" style={{ color:'var(--m-link)' }}>YoteMarket holds funds in M-Pesa escrow. Buyers can negotiate via the in-app messenger before confirming.</div></div>
          </div>}
          {step===3 && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="ym-label">Photos <span className="ym-cap" style={{ fontWeight:400 }}>· {form.images.length}/6 · first is the cover</span></label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:12, marginTop:8 }}>
                {form.images.map((url, idx)=>(
                  <div key={idx} style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'1 / 1', border:'1px solid var(--m-border)' }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    {idx===0 && <span style={{ position:'absolute', top:6, left:6, background:'var(--m-primary)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:9999 }}>Cover</span>}
                    <button type="button" onClick={()=>removeImage(idx)} aria-label="Remove photo" style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:9999, border:'none', background:'rgba(0,0,0,.6)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-xmark" style={{ fontSize:11 }} /></button>
                    {idx!==0 && <button type="button" onClick={()=>makeCover(idx)} style={{ position:'absolute', bottom:6, left:6, right:6, background:'rgba(0,0,0,.62)', color:'#fff', border:'none', borderRadius:8, fontSize:10.5, fontWeight:600, padding:'3px 0', cursor:'pointer', fontFamily:'inherit' }}>Make cover</button>}
                  </div>
                ))}
                {form.images.length < 6 && (
                  <ImageUpload aspect={1} outputSize={900} title="Product photo"
                    pathFor={()=>productImagePath(storeId)}
                    onUploaded={(url)=>addImage(url)}
                    onError={(e)=>setErr(e.message || 'Upload failed')}>
                    {({ pick, uploading })=>(
                      <button type="button" onClick={()=>storeId && pick()} disabled={!storeId}
                        style={{ aspectRatio:'1 / 1', border:'2px dashed var(--m-border)', borderRadius:12, cursor: storeId?'pointer':'not-allowed', background:'transparent', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit', color:'var(--m-fg3)' }}>
                        <FA i={uploading?'fa-circle-notch':'fa-plus'} style={{ fontSize:22, color:'var(--m-primary)', animation: uploading?'ym-spin 1s linear infinite':'none' }} />
                        <span className="ym-cap">{uploading?'Uploading…':(form.images.length?'Add photo':'Add cover')}</span>
                      </button>
                    )}
                  </ImageUpload>
                )}
              </div>
              <div className="ym-cap" style={{ marginTop:8 }}>{storeId ? 'PNG or JPG · square crop · add up to 6' : 'Set up your store first'}</div>
            </div>
            <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:'var(--m-surface-3)', fontSize:12.5, color:'var(--m-fg2)', lineHeight:1.55 }}>
              <FA i="fa-shield-halved" style={{ color:'var(--m-primary)', marginTop:2, flexShrink:0 }} />
              <span>By publishing, you confirm this product is genuine, lawful, and accurately described, and that you hold any licenses required for regulated goods (e.g. medicines, alcohol). Counterfeit, substandard, misrepresented, unlicensed, or illegal goods will be removed, may forfeit payouts, and can be reported to the authorities — see our <a href="/terms" target="_blank" rel="noreferrer" style={{ color:'var(--m-primary)', fontWeight:600 }}>Terms of Service</a>.</span>
            </div>
            {err && <div className="ym-sub" style={{ color:'var(--m-danger)', display:'flex', gap:8, alignItems:'center' }}><FA i="fa-triangle-exclamation" /> {err}</div>}
          </div>}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--m-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--m-fg3)', opacity:step===1?.4:1 }}><FA i="fa-arrow-left" /> Back</button>
          {step<3 ? <Btn kind="primary" iconRight="fa-arrow-right" onClick={()=>setStep(s=>s+1)}>Next</Btn> : <Btn kind="primary" icon={saving?'fa-circle-notch':'fa-check'} onClick={publish} disabled={saving}>{saving?(isEdit?'Saving…':'Publishing…'):(isEdit?'Save changes':'Publish product')}</Btn>}
        </div>
      </div>
    </div>
  );
}
function Field({ label, hint, children }){ return <div><label className="ym-label">{label}</label>{children}{hint && <div className="ym-cap" style={{ marginTop:5 }}>{hint}</div>}</div>; }
