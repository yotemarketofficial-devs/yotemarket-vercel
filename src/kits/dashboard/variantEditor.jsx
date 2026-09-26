/* variantEditor.jsx — the merchant's colours & variants for a product.
   One axis (colour, size, capacity…); each value a name, an optional swatch
   colour and an optional photo picked from the product's own photos. Shoppers
   never see a colour the merchant didn't set here. Saved via saveProduct as
   `variants: [{ id?, name, hex?, image? }]` + `variantLabel` — ids are minted by
   the server and sent back on edit, so a cart line naming one stays valid. */
import React from 'react';
import { FA, Btn } from './primitives.jsx';
import { VARIANT_PALETTE, inkOn } from '../../lib/variants.js';
const { useState } = React;

const LABELS = ['Colour', 'Size', 'Capacity', 'Style'];

export function VariantEditor({ variants, label, photos, onChange }){
  const [paletteFor, setPaletteFor] = useState(null);   // row index whose palette is open
  const [photoFor, setPhotoFor] = useState(null);       // row index whose photo picker is open
  const set = (next, nextLabel = label) => onChange(next, nextLabel);
  const patch = (i, p) => set(variants.map((v, j) => (j === i ? { ...v, ...p } : v)));
  const add = () => set([...variants, { id: '', name: '', hex: null, image: null }]);
  const remove = (i) => { setPaletteFor(null); setPhotoFor(null); set(variants.filter((_, j) => j !== i)); };

  return (
    <div>
      <label className="ym-label">Colours &amp; variants <span className="ym-cap" style={{ fontWeight:400 }}>· optional</span></label>
      <div className="ym-cap" style={{ marginBottom:10 }}>
        {variants.length
          ? 'Shoppers choose one before adding to cart. One stock count covers all of them together.'
          : 'Sold in more than one colour, size or capacity? Add each one and shoppers choose before adding to cart.'}
      </div>

      {variants.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
          <span className="ym-cap" style={{ fontWeight:600 }}>What varies:</span>
          {LABELS.map((l) => {
            const on = label.trim().toLowerCase() === l.toLowerCase();
            return (
              <button key={l} type="button" onClick={() => set(variants, on ? '' : l)} aria-pressed={on}
                style={{ padding:'6px 12px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600,
                  border: on ? '2px solid var(--m-primary)' : '1px solid var(--m-border)', background: on ? 'var(--m-surface-3)' : 'var(--m-surface)',
                  color: on ? 'var(--m-primary)' : 'var(--m-fg2)' }}>{l}</button>
            );
          })}
          <input className="ipt" value={label} maxLength={24} onChange={(e) => set(variants, e.target.value)} placeholder="or type it"
            style={{ width:130, height:34, padding:'0 10px' }} aria-label="What varies" />
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {variants.map((v, i) => (
          <div key={i} style={{ border:'1px solid var(--m-border)', borderRadius:12, padding:10 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button type="button" onClick={() => { setPhotoFor(null); setPaletteFor(paletteFor === i ? null : i); }}
                title={v.hex ? 'Change colour' : 'Choose a colour'} aria-label={v.hex ? 'Change colour' : 'Choose a colour'}
                style={{ width:38, height:38, borderRadius:9999, flexShrink:0, cursor:'pointer', padding:0,
                  background: v.hex || 'var(--m-surface-2)', border: v.hex ? 'none' : '1px dashed var(--m-border)',
                  boxShadow: v.hex ? 'inset 0 0 0 1px rgba(0,0,0,.18)' : 'none', color: v.hex ? inkOn(v.hex) : 'var(--m-fg3)' }}>
                {!v.hex && <FA i="fa-palette" />}
              </button>
              <input className="ipt" value={v.name} maxLength={40} onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="e.g. Navy, 128 GB, 42" aria-label={`Variant ${i + 1} name`} style={{ flex:1, minWidth:0 }} />
              <button type="button" onClick={() => { setPaletteFor(null); setPhotoFor(photoFor === i ? null : i); }}
                title={v.image ? 'Change photo' : 'Choose a photo'} aria-label={v.image ? 'Change photo' : 'Choose a photo'}
                style={{ width:38, height:38, borderRadius:10, flexShrink:0, cursor:'pointer', padding:0, overflow:'hidden',
                  border:'1px solid var(--m-border)', background:'var(--m-surface-2)', color:'var(--m-fg3)' }}>
                {v.image ? <img src={v.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /> : <FA i="fa-image" />}
              </button>
              <button type="button" onClick={() => remove(i)} className="icon-btn" aria-label="Remove variant" title="Remove"
                style={{ width:32, height:32, fontSize:13, background:'transparent', color:'var(--m-fg3)' }}><FA i="fa-xmark" /></button>
            </div>

            {paletteFor === i && (
              <div style={{ marginTop:10 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(62px, 1fr))', gap:8 }}>
                  {VARIANT_PALETTE.map(([name, hex]) => (
                    <button key={hex} type="button" title={name}
                      onClick={() => { patch(i, { hex, ...(v.name.trim() ? {} : { name }) }); setPaletteFor(null); }}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:2 }}>
                      <span style={{ width:28, height:28, borderRadius:9999, background:hex,
                        boxShadow: v.hex === hex ? '0 0 0 2px var(--m-bg), 0 0 0 4px var(--m-primary)' : 'inset 0 0 0 1px rgba(0,0,0,.18)' }} />
                      <span className="ym-cap" style={{ fontSize:10.5 }}>{name}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
                  <label className="ym-cap" style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                    <input type="color" value={v.hex || '#888888'} onChange={(e) => patch(i, { hex: e.target.value })} style={{ width:30, height:26, border:'none', background:'none', padding:0 }} />
                    Exact colour
                  </label>
                  <button type="button" onClick={() => { patch(i, { hex: null }); setPaletteFor(null); }}
                    style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--m-link)' }}>
                    No colour — show the name as text
                  </button>
                </div>
              </div>
            )}

            {photoFor === i && (
              <div style={{ marginTop:10 }}>
                {photos.length === 0
                  ? <div className="ym-cap">Add the product photos above first, then pick one for each variant.</div>
                  : <>
                      <div className="ym-cap" style={{ marginBottom:8 }}>Shown when a shopper picks this one.</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {photos.map((url) => (
                          <button key={url} type="button" onClick={() => { patch(i, { image: url }); setPhotoFor(null); }}
                            style={{ width:56, height:56, borderRadius:10, overflow:'hidden', padding:0, cursor:'pointer',
                              border: v.image === url ? '2px solid var(--m-primary)' : '1px solid var(--m-border)' }}>
                            <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                          </button>
                        ))}
                        {v.image && (
                          <button type="button" onClick={() => { patch(i, { image: null }); setPhotoFor(null); }}
                            style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--m-link)' }}>
                            No photo
                          </button>
                        )}
                      </div>
                    </>}
              </div>
            )}
          </div>
        ))}
      </div>

      {variants.length < 20 && (
        <Btn kind="ghost" size="sm" icon="fa-plus" onClick={add} style={{ marginTop:10 }}>
          {variants.length ? 'Add another' : 'Add colours or sizes'}
        </Btn>
      )}
    </div>
  );
}
