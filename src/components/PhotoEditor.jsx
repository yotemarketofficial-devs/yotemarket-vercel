/* PhotoEditor.jsx — dependency-free image editor used for avatars, store covers
   and product photos. A canvas-preview cropper with pan (drag), zoom (slider/
   wheel), 90° rotate and a fixed output aspect ratio. The preview is rendered
   on a canvas with the exact transform used for export, so it's WYSIWYG.

   Usage:
     <PhotoEditor file={File|Blob} aspect={1} outputSize={800}
       title="Edit photo" onCancel={fn} onSave={(blob, dataUrl) => …} />
*/
import React from 'react';
const { useState, useRef, useEffect, useCallback } = React;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function PhotoEditor({ file, src, aspect = 1, outputSize = 800, title = 'Edit photo', round = false, onCancel, onSave }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canvasRef = useRef(null);
  const drag = useRef(null);

  // Preview viewport (fits the modal), keeping the target aspect ratio.
  const VMAX = 360;
  const Vw = aspect >= 1 ? VMAX : Math.round(VMAX * aspect);
  const Vh = aspect >= 1 ? Math.round(VMAX / aspect) : VMAX;

  // Load the source into an Image.
  useEffect(() => {
    let url = src;
    let revoke = false;
    if (file) { url = URL.createObjectURL(file); revoke = true; }
    if (!url) return undefined;
    const im = new Image();
    im.onload = () => { setImg(im); setZoom(1); setRot(0); setOffset({ x: 0, y: 0 }); };
    im.onerror = () => setErr('Could not load that image.');
    im.src = url;
    return () => { if (revoke) URL.revokeObjectURL(url); };
  }, [file, src]);

  // cover scale so the (possibly rotated) image fully covers a W×H box.
  const coverScale = useCallback((W, H) => {
    if (!img) return 1;
    const ew = rot % 180 === 0 ? img.naturalWidth : img.naturalHeight;
    const eh = rot % 180 === 0 ? img.naturalHeight : img.naturalWidth;
    return Math.max(W / ew, H / eh);
  }, [img, rot]);

  // Max pan (px in preview space) that keeps the image covering the viewport.
  const maxPan = useCallback(() => {
    if (!img) return { x: 0, y: 0 };
    const s = coverScale(Vw, Vh) * zoom;
    const ew = (rot % 180 === 0 ? img.naturalWidth : img.naturalHeight) * s;
    const eh = (rot % 180 === 0 ? img.naturalHeight : img.naturalWidth) * s;
    return { x: Math.max(0, (ew - Vw) / 2), y: Math.max(0, (eh - Vh) / 2) };
  }, [img, coverScale, Vw, Vh, zoom, rot]);

  // Draw to any W×H canvas; offsets are scaled from preview space by k=W/Vw.
  const paint = useCallback((ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const k = W / Vw;
    const s = coverScale(W, H) * zoom;
    ctx.save();
    ctx.translate(W / 2 + offset.x * k, H / 2 + offset.y * k);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [img, Vw, coverScale, zoom, offset, rot]);

  // Live preview.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    paint(c.getContext('2d'), Vw, Vh);
  }, [paint, Vw, Vh]);

  // Re-clamp pan whenever zoom/rotation change.
  useEffect(() => {
    const m = maxPan();
    setOffset((o) => ({ x: clamp(o.x, -m.x, m.x), y: clamp(o.y, -m.y, m.y) }));
  }, [zoom, rot, maxPan]);

  // ── pointer pan ──
  const onDown = (e) => { const p = pt(e); drag.current = { px: p.x, py: p.y, ox: offset.x, oy: offset.y }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = pt(e);
    const m = maxPan();
    setOffset({
      x: clamp(drag.current.ox + (p.x - drag.current.px), -m.x, m.x),
      y: clamp(drag.current.oy + (p.y - drag.current.py), -m.y, m.y),
    });
  };
  const onUp = () => { drag.current = null; };
  const onWheel = (e) => { e.preventDefault(); setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.08 : -0.08), 1, 4)); };

  const save = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const oh = Math.round(outputSize / aspect);
      const out = document.createElement('canvas');
      out.width = outputSize; out.height = oh;
      paint(out.getContext('2d'), outputSize, oh);
      const blob = await new Promise((res) => out.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Export failed.');
      onSave(blob, out.toDataURL('image/jpeg', 0.9));
    } catch (e) { setErr(e.message || 'Could not process the image.'); setBusy(false); }
  };

  return (
    <div style={overlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <div style={sheet}>
        <div style={head}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onCancel} aria-label="Close" style={iconBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 14px' }}>
          <div style={{ position: 'relative', width: Vw, height: Vh, touchAction: 'none' }}>
            <canvas
              ref={canvasRef} width={Vw} height={Vh}
              style={{ width: Vw, height: Vh, borderRadius: round ? '50%' : 12, cursor: drag.current ? 'grabbing' : 'grab', display: 'block', userSelect: 'none' }}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              onWheel={onWheel}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: round ? '50%' : 12, boxShadow: '0 0 0 1px rgba(255,255,255,.25) inset', pointerEvents: 'none' }} />
          </div>
        </div>

        {err && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{err}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
          <span aria-hidden style={{ opacity: .7, fontSize: 13 }}>🔍</span>
          <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#7c3aed' }} aria-label="Zoom" />
          <button onClick={() => setRot((r) => (r + 90) % 360)} style={ctrlBtn} title="Rotate 90°" aria-label="Rotate">⟳</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} style={{ ...btn, ...btnGhost }}>Cancel</button>
          <button onClick={save} disabled={busy || !img} style={{ ...btn, ...btnPrimary, opacity: busy || !img ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Use photo'}</button>
        </div>
      </div>
    </div>
  );
}

function pt(e) {
  const t = e.touches && e.touches[0];
  return { x: t ? t.clientX : e.clientX, y: t ? t.clientY : e.clientY };
}

const overlay = { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(10,12,24,.62)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const sheet = { width: 'min(440px, 100%)', background: '#15151f', color: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 24px 60px -12px rgba(0,0,0,.6)', fontFamily: 'inherit' };
const head = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 };
const iconBtn = { background: 'rgba(255,255,255,.08)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14 };
const ctrlBtn = { background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: 10, cursor: 'pointer', fontSize: 18, flexShrink: 0 };
const btn = { flex: 1, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700 };
const btnGhost = { background: 'rgba(255,255,255,.1)', color: '#fff' };
const btnPrimary = { background: 'linear-gradient(135deg,#7c3aed,#a020f0)', color: '#fff' };
