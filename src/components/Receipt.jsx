/* Receipt.jsx — ONE modular receipt used everywhere.
   - `normalizeReceipt(raw, opts)` maps a raw receipts/{id} doc into a canonical model
     so every surface reads the same shape.
   - `<Receipt receipt variant>` renders that model as a clean on-screen card
     (`digital`, the shopper's receipt modal today) or a narrow monochrome strip
     (`thermal`, for POS thermal printouts next).
   - `receiptPlainText(model, width)` emits a fixed-width monospace string for raw
     ESC/POS thermal printers that take plain text.

   The component is self-contained (no kit-specific CSS vars) so it drops into the
   storefront, the dashboard/POS, or a print window unchanged. FontAwesome is loaded
   globally, so `fa-*` icons work anywhere. */
import React from 'react';

const TYPE_LABEL = { order: 'Order payment', wallet_topup: 'Wallet top-up', subscription: 'Subscription', redemption: 'Points redemption', pos: 'In-store sale', payout: 'Payout', refund: 'Order refund' };
const METHOD_LABEL = { mpesa: 'M-Pesa', wallet: 'YoteWallet', cash: 'Cash', points: 'YotePoints', card: 'Card' };
const TYPE_ICON = { order: 'fa-bag-shopping', wallet_topup: 'fa-wallet', subscription: 'fa-crown', redemption: 'fa-star', pos: 'fa-cash-register', payout: 'fa-money-bill-transfer', refund: 'fa-rotate-left' };
const MPESA_GREEN = '#0a9d4a';

export const fmtKsh = (n) => 'Ksh ' + Number(n || 0).toLocaleString('en-KE');
const shortId = (v) => `#${String(v).slice(0, 8).toUpperCase()}`;

/** Map a raw receipts/{id} doc (+ context) to the canonical receipt model. */
export function normalizeReceipt(raw = {}, opts = {}) {
  const type = raw.type || 'order';
  const when = raw.createdAt?.seconds ? new Date(raw.createdAt.seconds * 1000)
    : (raw.when && !Number.isNaN(Date.parse(raw.when)) ? new Date(raw.when) : null);
  return {
    type,
    typeLabel: TYPE_LABEL[type] || type || 'Payment',
    icon: TYPE_ICON[type] || 'fa-receipt',
    title: raw.title || TYPE_LABEL[type] || 'Payment',
    storeName: raw.storeName || '',
    storeLogo: raw.storeLogo || '',
    amount: Number(raw.amount || 0),
    currency: raw.currency || 'KES',
    method: raw.method || '',
    methodLabel: METHOD_LABEL[raw.method] || raw.method || '—',
    // The M-Pesa transaction code lives on `ref` for M-Pesa payments.
    mpesaCode: raw.method === 'mpesa' ? (raw.ref || '') : '',
    ref: raw.ref || '',
    orderNo: raw.orderNo || (raw.meta?.orderId ? shortId(raw.meta.orderId) : ''),
    saleNo: raw.meta?.saleId ? shortId(raw.meta.saleId) : '',
    receiptNo: raw.receiptNo || raw.id || '',
    paidBy: opts.paidBy || raw.customerName || raw.buyerName || 'Customer',
    whenText: when ? when.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (raw.when || '—'),
    lines: Array.isArray(raw.lines) ? raw.lines.map((l) => ({ label: l.label || 'Item', qty: l.qty || null, amount: Number(l.amount || 0) })) : [],
    footerNote: opts.footerNote || 'Official YoteMarket receipt. Keep it as proof of payment for this transaction.',
    brand: opts.brand || 'YoteMarket',
  };
}

const FA = ({ i, style }) => <i className={`fas ${i}`} style={style} aria-hidden="true" />;

// Ordered metadata rows shared by every variant (falsy values are dropped).
function metaRows(r) {
  return [
    ['Type', r.typeLabel],
    ['Paid with', r.methodLabel],
    r.mpesaCode ? ['M-Pesa code', r.mpesaCode] : null,
    (!r.mpesaCode && r.ref) ? ['Reference', r.ref] : null,
    r.orderNo ? ['Order no.', r.orderNo] : null,
    r.saleNo ? ['Sale no.', r.saleNo] : null,
    ['Paid by', r.paidBy],
    ['Receipt no.', r.receiptNo],
    ['Currency', r.currency],
  ].filter(Boolean);
}

/* ── Digital: an on-screen card that adapts to light/dark (inherits text colour,
   uses translucent greys for surfaces so it needs no theme wiring). ── */
function DigitalReceipt({ r }) {
  const muted = { opacity: 0.62 };
  const surface = { background: 'rgba(128,128,128,.10)', border: '1px solid rgba(128,128,128,.18)' };
  return (
    <div style={{ color: 'inherit', fontSize: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        {r.storeLogo
          ? <img src={r.storeLogo} alt={r.storeName || 'Store'} style={{ width: 60, height: 60, borderRadius: 16, margin: '0 auto 12px', objectFit: 'cover', display: 'block', border: '1px solid rgba(128,128,128,.25)' }} />
          : <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, ...surface }}><FA i={r.icon} /></div>}
        {r.storeName && <div style={{ fontWeight: 700, fontSize: 15 }}>{r.storeName}</div>}
        <div style={{ ...muted, marginTop: r.storeName ? 2 : 0 }}>{r.title}</div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>{fmtKsh(r.amount)}</div>
        <div style={{ ...muted, fontSize: 12.5, marginTop: 4 }}>{r.whenText}</div>
      </div>

      {r.lines.length > 0 && (
        <div style={{ margin: '16px 0', padding: '4px 14px', borderRadius: 12, ...surface }}>
          {r.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: i ? '1px solid rgba(128,128,128,.18)' : 'none' }}>
              <span style={muted}>{l.qty ? `${l.qty}× ` : ''}{l.label}</span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtKsh(l.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {metaRows(r).map(([label, value]) => {
          const isCode = label === 'M-Pesa code';
          return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: '1px solid rgba(128,128,128,.14)' }}>
              <span style={muted}>{label}</span>
              <span style={{ textAlign: 'right', wordBreak: 'break-word', ...(isCode ? { fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.03em', color: MPESA_GREEN } : { fontWeight: 500 }), ...(label === 'Receipt no.' ? { fontFamily: 'monospace', fontSize: 12 } : {}) }}>{value}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, ...surface, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <FA i="fa-shield-halved" style={{ marginTop: 2, color: MPESA_GREEN }} />
        <span style={{ ...muted, fontSize: 12, lineHeight: 1.5 }}>{r.footerNote}</span>
      </div>
    </div>
  );
}

/* ── Thermal: a fixed-width monochrome strip for a receipt printer. Always
   black-on-white (independent of theme) so it previews exactly like the print. ── */
function ThermalReceipt({ r, width = 300 }) {
  const dash = { borderTop: '1px dashed #000', margin: '8px 0' };
  const row = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, lineHeight: 1.5 };
  return (
    <div data-receipt="thermal" style={{ width, maxWidth: '100%', margin: '0 auto', background: '#fff', color: '#111', fontFamily: 'ui-monospace, "Courier New", monospace', padding: '14px 16px', boxShadow: '0 1px 0 rgba(0,0,0,.06)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '.06em' }}>{r.brand.toUpperCase()}</div>
        {r.storeName && <div style={{ fontSize: 12.5, marginTop: 2 }}>{r.storeName}</div>}
        <div style={{ fontSize: 11.5, marginTop: 2 }}>{r.typeLabel}</div>
      </div>
      <div style={dash} />
      <div style={{ ...row }}><span>Date</span><span>{r.whenText}</span></div>
      <div style={{ ...row }}><span>Receipt</span><span>{r.receiptNo}</span></div>
      {r.orderNo && <div style={{ ...row }}><span>Order</span><span>{r.orderNo}</span></div>}
      {r.saleNo && <div style={{ ...row }}><span>Sale</span><span>{r.saleNo}</span></div>}
      <div style={dash} />
      {r.lines.length > 0 ? (
        <>
          {r.lines.map((l, i) => (
            <div key={i} style={{ ...row }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.qty ? `${l.qty}x ` : ''}{l.label}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{fmtKsh(l.amount)}</span>
            </div>
          ))}
          <div style={dash} />
        </>
      ) : null}
      <div style={{ ...row, fontWeight: 800, fontSize: 13.5 }}><span>TOTAL</span><span>{fmtKsh(r.amount)}</span></div>
      <div style={{ ...row, marginTop: 4 }}><span>Paid with</span><span>{r.methodLabel}</span></div>
      {r.mpesaCode && <div style={{ ...row }}><span>M-Pesa</span><span style={{ fontWeight: 700 }}>{r.mpesaCode}</span></div>}
      <div style={dash} />
      <div style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.5 }}>{r.footerNote}</div>
      <div style={{ textAlign: 'center', fontSize: 11, marginTop: 6, fontWeight: 700 }}>· Thank you ·</div>
    </div>
  );
}

export function Receipt({ receipt, variant = 'digital', width }) {
  if (!receipt) return null;
  return variant === 'thermal'
    ? <ThermalReceipt r={receipt} width={width} />
    : <DigitalReceipt r={receipt} />;
}

/** Fixed-width monospace text for raw ESC/POS thermal printers (default 32 cols). */
export function receiptPlainText(r, width = 32) {
  const line = (ch = '-') => ch.repeat(width);
  const center = (s) => { s = String(s).slice(0, width); const pad = Math.max(0, Math.floor((width - s.length) / 2)); return ' '.repeat(pad) + s; };
  const lr = (l, rr) => { l = String(l); rr = String(rr); const space = Math.max(1, width - l.length - rr.length); return (l + ' '.repeat(space) + rr).slice(0, width); };
  const out = [center(r.brand.toUpperCase())];
  if (r.storeName) out.push(center(r.storeName));
  out.push(center(r.typeLabel), line());
  out.push(lr('Date', r.whenText.replace(',', '')), lr('Receipt', r.receiptNo));
  if (r.orderNo) out.push(lr('Order', r.orderNo));
  if (r.lines.length) { out.push(line()); r.lines.forEach((l) => out.push(lr(`${l.qty ? l.qty + 'x ' : ''}${l.label}`, fmtKsh(l.amount)))); }
  out.push(line(), lr('TOTAL', fmtKsh(r.amount)), lr('Paid with', r.methodLabel));
  if (r.mpesaCode) out.push(lr('M-Pesa', r.mpesaCode));
  out.push(line(), center('Thank you'));
  return out.join('\n');
}
