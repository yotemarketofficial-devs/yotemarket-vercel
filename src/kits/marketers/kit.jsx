/* kit.jsx — the Marketing kit, implementing the "YoteMarket Marketing Kit" design doc
   (Claude Design project 0c9210a7 · "Marketing kit with brand cheat sheet").

   Two halves, and they serve different moments:
     • things to SEND — the scout's invite link, ready-made messages, campaign posters
     • how to REPRESENT the brand — logo, colour, type, voice, contact
   The design doc covers the posters and the cheat sheet; the invite link and messages
   are the operational half a scout uses daily, so both live here.

   Copy discipline comes from the doc's own Voice & tone rules and is enforced, not
   decorative: NO EMOJI anywhere in the sendable messages, M-Pesa and WhatsApp named by
   brand (never "mobile money"), "you/your" to the reader. Product claims are checked
   against pages/Pricing.jsx — Entry is KSh 500/mo, free for a month with a scout code,
   and there is no commission. A scout repeating any of this is telling the truth. */
import React from 'react';
import { ME } from './data.js';
import { Card, Btn, Icon } from './ui.jsx';
const { useState: useK } = React;

/* The invite must land on the merchant signup with the code attached — that route reads
   ?ref= and pre-fills it (dashboard/MerchantGate.jsx). Sending merchants to /marketers
   would be the scout-recruitment page, which earns the scout nothing. Canonical host is
   yotemarket.co.ke (NOT .com). */
const SITE = 'https://yotemarket.co.ke';
export const inviteLink = (code) => `${SITE}/dashboard?ref=${encodeURIComponent(code || '')}`;

/* clipboard fails on http:// and inside some in-app browsers — fall back rather than
   silently doing nothing, since copying IS the feature here. */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

const waShare = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/* ── 01 · Campaign posters ────────────────────────────────────────────────────
   Approved artwork, one per audience. The doc is explicit: use as-is, never recrop,
   restretch or recolour — so these are download-and-send, not editable templates. */
const POSTERS = [
  { id: 'merchant', audience: 'Merchants', title: 'Boost Your Sales', dims: '1254 × 1254 · 1:1',
    src: '/assets/marketing/poster-merchant.png',
    blurb: 'Recruit shop owners to the Virtual Mall at KSh 500/month.' },
  { id: 'rider', audience: 'Riders', title: 'More Stops. More Earnings.', dims: '1254 × 1254 · 1:1',
    src: '/assets/marketing/poster-rider.png',
    blurb: 'Recruit riders into the hub-based delivery programme.' },
  { id: 'marketer', audience: 'Marketers', title: 'Sign Up a Shop. Get Paid.', dims: '1086 × 1448 · 3:4',
    src: '/assets/marketing/poster-marketer.png',
    blurb: 'Referral flyer — earn KSh 300–2,100 per merchant signed up.',
    // This flyer is printed with a MOCK referral code. The artwork itself is approved
    // and is not redesigned — the placeholder is simply covered and the scout's real
    // code drawn in its place, so every scout hands out a flyer that credits them.
    codeSlot: true },
];

/* Where the flyer's printed code sits. MEASURED off the shipped artwork
   (poster-marketer.png, 1086×1448) rather than eyeballed:
     • sample code "YOTE-AMANI" occupies x 99–701, y 1117–1178
     • panel interior sampled #FEFEFE, the code itself #4319D3
   Percentages (not pixels) so the same numbers drive the on-card preview and the
   full-resolution export. The cover patch stops short of the dashed border (x≈762) and
   clears both the "YOUR MARKETER CODE" pill above (ends y≈1087) and the caption below
   (starts y≈1211). The code is LEFT-aligned in the print, so replacements are too —
   centring would drift as code lengths differ.
   If the flyer is ever re-exported, re-measure and change only this block. */
const CODE_SLOT = {
  coverLeft: 8.3, coverTop: 75.9, coverWidth: 59.9, coverHeight: 6.7, // white patch
  textLeft: 9.12,        // % from left — matches the printed code's left edge
  centerY: 79.25,        // % from top — vertical centre of the cap-height box
  capHeightPct: 5.62,    // cap height as % of image WIDTH — matches the print size
  // Codes are longer than the "YOTE-AMANI" sample (e.g. YOTE-JOHN-1A2B). Room to grow
  // is measured to the dashed border (x≈762 = 70.2%), not to the patch — the panel to
  // the right of the sample is already white, so text may run past the patch safely.
  // A code wider than this is scaled down to fit rather than clipped or overflowing.
  maxTextWidth: 59.5,    // % of image width, from textLeft
  cover: '#FEFEFE',      // sampled panel interior
  color: '#4319D3',      // sampled code colour
};

const codeFace = (px) => `700 ${px}px Poppins, Inter, sans-serif`;

/* Pick the font size that reproduces the printed cap height, shrinking only when the
   code is too long for the panel. Shared by the preview and the export so what a scout
   sees on the card is what downloads. Returns the real ascent too, so the cap box stays
   centred on the printed centre line even after a shrink. */
function fitCodeFont(ctx, code, targetCap, maxWidth) {
  let size = targetCap / 0.7;                 // cap ≈ 0.7em as a starting guess
  ctx.font = codeFace(size);
  let m = ctx.measureText(code);
  if (m.actualBoundingBoxAscent > 0) {        // correct to the real font metrics
    size *= targetCap / m.actualBoundingBoxAscent;
    ctx.font = codeFace(size);
    m = ctx.measureText(code);
  }
  if (m.width > maxWidth) {                   // long code — scale to fit the panel
    size *= maxWidth / m.width;
    ctx.font = codeFace(size);
    m = ctx.measureText(code);
  }
  return { size, ascent: m.actualBoundingBoxAscent || targetCap };
}

/* ── 02 · Ready to send ───────────────────────────────────────────────────────
   Written to be sent as-is. Deliberately emoji-free per the brand voice rules — the
   earlier version of this screen used them and was off-brand. */
const TEMPLATES = (code, link) => ([
  {
    id: 'intro', label: 'First message', icon: 'comment',
    note: 'Opening a shop owner you just met, or one you already know.',
    text:
`Habari, I am a YoteMarket scout.

YoteMarket is Kenya's Virtual Mall — an online mall where local shops sell. Customers find you, message you, and pay with M-Pesa.

- No commission. You keep 100% of every sale.
- KSh 500 a month, and your first month is free with my code.
- Your own storefront page you can share anywhere.

Set up here, my code is already applied:
${link}

Or enter the code ${code} yourself. It takes about five minutes, and I will help you list your first items.`,
  },
  {
    id: 'followup', label: 'Follow-up', icon: 'rotate-right',
    note: 'For someone who was interested but has not signed up yet.',
    text:
`Hello again, following up on YoteMarket.

Your first month is still free with my code ${code}. There is no commission on anything you sell, and you are paid straight to M-Pesa.

Here is the link when you are ready:
${link}

I am happy to sit with you and set it up. It only takes a few minutes.`,
  },
  {
    id: 'sms', label: 'SMS', icon: 'mobile-screen',
    note: 'Short enough to send as a normal text message.',
    text:
`Habari, your YoteMarket scout here. Sell online with no commission - KSh 500/month and your first month free with code ${code}. Sign up: ${link}`,
  },
  {
    id: 'social', label: 'Social caption', icon: 'bullhorn',
    note: 'For your status or page, when you want shops to come to you.',
    text:
`Do you sell anything in Kenya?

Put your shop online on YoteMarket, Kenya's Virtual Mall:
- No commission. Keep 100% of your sales.
- Customers message you and pay with M-Pesa.
- Your own storefront link to share.
- First month free with my code: ${code}

Start here: ${link}

Message me and I will set it up with you.`,
  },
]);

/* ── 03 · Brand cheat sheet ───────────────────────────────────────────────────
   Values reproduced exactly from the design doc. Indigo is canon for product; the
   violet+gold face is marketing-tile only, which is why the gradient is called out
   separately rather than sitting in the main ramp. */
const SWATCHES = [
  { name: 'Primary 600', hex: '#4338CA' },
  { name: 'Interactive 500', hex: '#4F46E5' },
  { name: 'Pressed 700', hex: '#3730A3' },
  { name: 'Secondary', hex: '#A020F0' },
  { name: 'Amber accent', hex: '#F59E0B' },
  { name: 'Success', hex: '#10B981' },
  { name: 'Danger', hex: '#EF4444' },
  { name: 'Page bg', hex: '#F8FAFC' },
  { name: 'Footer dark', hex: '#111827' },
  { name: 'M-Pesa', hex: '#009B3A' },
  { name: 'WhatsApp', hex: '#25D366' },
];
const MARKETING_GRADIENT = 'linear-gradient(135deg, #3a1a78, #7c3aed, #b34df3)';

const TYPE_SCALE = [
  { spec: 'Bold · 48px', sample: 'Boost Your Sales', style: { fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' } },
  { spec: 'Bold · 20px', sample: 'Recent Products', style: { fontSize: 19, fontWeight: 700 } },
  { spec: 'Regular · 16px', sample: 'Body copy sits at 16px, preferring gray-600 over pure black.', style: { fontSize: 15 }, muted: true },
  { spec: 'Regular · 14px', sample: 'Labels and supporting copy at 14px, gray-500.', style: { fontSize: 13.5 }, muted: true },
];

const VOICE = [
  { ok: true, text: 'Friendly, plainspoken, bullet-driven. Short sentences, concrete promises (price, speed, payment).' },
  { ok: true, text: 'The three-benefit line is the signature pattern: Easy Ordering • Secure Payments • Fast Deliveries' },
  { ok: true, text: 'Say "you / your" to the user, "we / our" for the company. Never first-person singular.' },
  { ok: true, text: 'Sentence case in-product; Title Case for headlines; ALL CAPS and "!" for marketing emphasis only.' },
  { ok: false, text: 'No emoji, ever. Name M-Pesa and WhatsApp by brand — not "mobile money".' },
];

const OBJECTIONS = [
  { q: '"I already sell on WhatsApp."', a: 'Good — this does not replace that. It gives them one link to send instead of repeating photos and prices, and the order, payment and delivery are handled in one place. They keep posting exactly as they do now.' },
  { q: '"Is it free?"', a: 'The first month is free with your code. After that Entry is KSh 500 a month. Be straight about this — a merchant who feels tricked in month two leaves, and you are not credited for someone who never activates.' },
  { q: '"Do you take a percentage of my sales?"', a: 'No. That is the strongest line you have — no commission, they keep 100%. The monthly plan is the whole cost.' },
  { q: '"How do I get my money?"', a: 'Customers pay with M-Pesa and the seller is paid out to their M-Pesa number. They set that number during signup.' },
  { q: '"I am not good with phones."', a: 'Offer to sit with them and do it there — about five minutes. This is the biggest reason a signup does not happen, and the easiest to fix in person.' },
];

/* Section label: rule + numbered eyebrow, straight from the doc's section styling. */
function SectionLabel({ n, children }) {
  return (
    <div className="flex items-baseline gap-3 mb-2">
      <div style={{ width: 26, height: 4, borderRadius: 2, background: 'var(--purple)', flex: 'none' }} />
      <span className="text-xs font-semibold uppercase" style={{ letterSpacing: '.18em', color: 'var(--purple)' }}>
        {n} · {children}
      </span>
    </div>
  );
}

/* Poster artwork is committed to /public. If a file is missing the card shows a clear
   placeholder rather than a broken-image icon, so it degrades honestly. */
/* Draw the flyer at full resolution with the mock code replaced, then save it. Assets
   are same-origin (/public), so the canvas is never tainted and toDataURL works. */
async function downloadFlyerWithCode(src, code, filename) {
  // Poppins must be loaded before measuring, or the metrics come from the fallback and
  // the replacement lands at the wrong size.
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* */ }
  const img = new Image();
  img.decoding = 'sync';
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // 1. paint out the sample code
  ctx.fillStyle = CODE_SLOT.cover;
  ctx.fillRect(w * (CODE_SLOT.coverLeft / 100), h * (CODE_SLOT.coverTop / 100),
    w * (CODE_SLOT.coverWidth / 100), h * (CODE_SLOT.coverHeight / 100));

  // 2. size to the PRINTED cap height (metrics differ between Poppins and the fallback,
  //    and a long code is scaled to fit rather than running into the dashed border)
  const targetCap = w * (CODE_SLOT.capHeightPct / 100);
  const { ascent } = fitCodeFont(ctx, code, targetCap, w * (CODE_SLOT.maxTextWidth / 100));

  // 3. draw left-aligned, cap box centred on the printed code's centre line. Uses the
  //    ACTUAL ascent, so a shrunken long code stays centred instead of sitting low.
  ctx.fillStyle = CODE_SLOT.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(code, w * (CODE_SLOT.textLeft / 100), h * (CODE_SLOT.centerY / 100) + ascent / 2);

  const url = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function Poster({ p, code }) {
  const [failed, setFailed] = useK(false);
  const [saving, setSaving] = useK(false);
  const personalised = p.codeSlot && Boolean(code);

  /* Measure the preview with the same routine the export uses, against a reference
     width, then express it in cqw — so a long code shrinks on the card exactly as it
     will in the downloaded flyer. */
  const fit = React.useMemo(() => {
    if (!personalised) return null;
    try {
      const REF = 1000;
      const ctx = document.createElement('canvas').getContext('2d');
      const targetCap = REF * (CODE_SLOT.capHeightPct / 100);
      const { size, ascent } = fitCodeFont(ctx, code, targetCap, REF * (CODE_SLOT.maxTextWidth / 100));
      return { fontCqw: (size / REF) * 100, ascentCqw: (ascent / REF) * 100 };
    } catch { return { fontCqw: CODE_SLOT.capHeightPct / 0.7, ascentCqw: CODE_SLOT.capHeightPct }; }
  }, [code, personalised]);

  const save = async () => {
    if (!personalised) return;
    setSaving(true);
    try { await downloadFlyerWithCode(p.src, code, `yotemarket-flyer-${code}.png`); }
    catch { window.open(p.src, '_blank'); }   // fall back to the plain artwork
    finally { setSaving(false); }
  };
  return (
    <Card className="overflow-hidden" style={{ padding: 0 }}>
      <div style={{ background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 190 }}>
        {failed ? (
          <div className="text-center px-4 py-10">
            <Icon name="image" style={{ fontSize: 26, color: 'var(--t3)' }} />
            <div className="text-xs t3 mt-2">Artwork not uploaded yet<br /><code className="num">{p.src}</code></div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', containerType: 'inline-size' }}>
            <img src={p.src} alt={`${p.title} — ${p.audience} poster`} onError={() => setFailed(true)}
              style={{ width: '100%', display: 'block' }} />
            {/* live preview of the swap — matches what the canvas export writes */}
            {personalised && (
              <>
                {/* white patch over the sample code */}
                <div style={{
                  position: 'absolute',
                  left: `${CODE_SLOT.coverLeft}%`, top: `${CODE_SLOT.coverTop}%`,
                  width: `${CODE_SLOT.coverWidth}%`, height: `${CODE_SLOT.coverHeight}%`,
                  background: CODE_SLOT.cover,
                }} />
                {/* the scout's code, left-aligned on the printed code's centre line */}
                <div style={{
                  position: 'absolute',
                  left: `${CODE_SLOT.textLeft}%`, top: `${CODE_SLOT.centerY}%`,
                  transform: 'translateY(-50%)',
                  color: CODE_SLOT.color, fontWeight: 700, whiteSpace: 'nowrap',
                  fontSize: `${(fit ? fit.fontCqw : CODE_SLOT.capHeightPct / 0.7).toFixed(2)}cqw`,
                  lineHeight: 1,
                }}>{code}</div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ background: 'var(--surface2)', color: 'var(--purple)' }}>{p.audience}</span>
          <span className="text-xs t3 num">{p.dims}</span>
        </div>
        <div className="font-bold t1">{p.title}</div>
        <p className="text-sm t2 mt-1" style={{ lineHeight: 1.5 }}>{p.blurb}</p>
        {personalised && (
          <div className="rounded-xl mt-2.5 px-3 py-2 text-xs t2" style={{ background: 'var(--surface2)' }}>
            Your code <b className="num t1">{code}</b> replaces the sample one — the download carries it.
          </div>
        )}
        {!failed && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {personalised ? (
              <Btn kind="primary" size="sm" icon={saving ? 'spinner' : 'download'} onClick={save} disabled={saving}>
                {saving ? 'Preparing…' : 'Download with my code'}
              </Btn>
            ) : (
              <a href={p.src} download className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--purple)', color: '#fff' }}>
                <Icon name="download" /> Download
              </a>
            )}
            <a href={p.src} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'var(--surface2)', color: 'var(--t1)' }}>
              <Icon name="up-right-from-square" /> Open
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

function Template({ t }) {
  const [copied, setCopied] = useK(false);
  const [open, setOpen] = useK(false);
  const copy = async () => {
    const ok = await copyText(t.text);
    setCopied(ok ? 'yes' : 'no');
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--surface2)', color: 'var(--purple)' }}><Icon name={t.icon} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-bold t1">{t.label}</div>
          <div className="text-xs t3 mt-0.5">{t.note}</div>
        </div>
      </div>
      <pre className="text-sm t2 mt-3 rounded-xl p-3"
        style={{ background: 'var(--surface2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit',
          lineHeight: 1.5, maxHeight: open ? 'none' : 132, overflow: 'hidden' }}>{t.text}</pre>
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold mt-1.5"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--purple)' }}>
        {open ? 'Show less' : 'Show full message'}
      </button>
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <Btn kind="primary" size="sm" icon={copied === 'yes' ? 'check' : 'copy'} onClick={copy}>
          {copied === 'yes' ? 'Copied' : copied === 'no' ? 'Press Ctrl+C' : 'Copy message'}
        </Btn>
        <a href={waShare(t.text)} target="_blank" rel="noreferrer"
          className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white" style={{ background: '#25D366' }}>
          <Icon name="whatsapp" brand /> Send on WhatsApp
        </a>
      </div>
    </Card>
  );
}

function Swatch({ s, onCopy, copied }) {
  return (
    <button onClick={() => onCopy(s.hex)} title={`Copy ${s.hex}`}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <div style={{ height: 70, borderRadius: 10, background: s.hex, border: '1px solid var(--line)' }} />
      <div className="text-sm font-semibold t1 mt-2">{s.name}</div>
      <div className="text-xs num t3">{copied === s.hex ? 'Copied' : s.hex}</div>
    </button>
  );
}

export function MarketingKit() {
  const code = ME.code || '';
  const link = inviteLink(code);
  const [copied, setCopied] = useK('');
  const templates = TEMPLATES(code, link);

  const copyOne = async (what, value) => {
    const ok = await copyText(value);
    setCopied(ok ? what : '');
    setTimeout(() => setCopied(''), 1800);
  };

  return (
    <div className="fadeup space-y-8">
      {/* ── COVER ── */}
      <div className="rounded-2xl text-white relative overflow-hidden" style={{ background: MARKETING_GRADIENT, boxShadow: 'var(--shadow-lg)', padding: '38px 32px' }}>
        <div className="absolute -right-10 -top-14 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(244,181,48,.32), transparent 70%)' }} />
        <div className="relative">
          <div className="text-xs font-semibold uppercase" style={{ letterSpacing: '.22em', opacity: .82 }}>Brand &amp; Campaign Kit</div>
          <h1 className="font-bold mt-3" style={{ fontSize: 42, lineHeight: 1.04, letterSpacing: '-.02em' }}>Marketing Kit</h1>
          <p className="mt-3" style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 620, opacity: .92 }}>
            Everything you need to represent YoteMarket — Kenya's Virtual Mall — in one place. Campaign posters, brand colours, type and voice.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {['Shoppers', 'Merchants', 'Riders', 'Marketers'].map((t) => (
              <span key={t} className="rounded-full text-sm font-medium" style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', padding: '7px 15px' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── YOUR LINK (operational — not in the doc, but the thing that earns) ── */}
      <div>
        <SectionLabel n="01">Your invite link</SectionLabel>
        <h2 className="font-bold t1 mb-1" style={{ fontSize: 24, letterSpacing: '-.01em' }}>Get credited for every shop you sign</h2>
        <p className="t3 text-sm mb-4">Opens the merchant signup with your code already filled in, so you are credited even if they forget to type it.</p>
        <Card className="p-4">
          <div className="rounded-xl p-3" style={{ background: 'var(--surface2)' }}>
            <code className="num text-sm t1" style={{ wordBreak: 'break-all' }}>{link}</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <Btn kind="primary" size="sm" icon={copied === 'link' ? 'check' : 'copy'} onClick={() => copyOne('link', link)}>
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </Btn>
            <a href={waShare(templates[0].text)} target="_blank" rel="noreferrer"
              className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white" style={{ background: '#25D366' }}>
              <Icon name="whatsapp" brand /> Share on WhatsApp
            </a>
            <Btn kind="ghost" size="sm" icon={copied === 'code' ? 'check' : 'hashtag'} onClick={() => copyOne('code', code)}>
              {copied === 'code' ? 'Copied' : `Copy code ${code}`}
            </Btn>
          </div>
          <p className="text-xs t3 mt-3">If they sign up on their own phone, ask them to type <b className="num t1">{code}</b> in the “Referral code” box.</p>
        </Card>
      </div>

      {/* ── 02 · CAMPAIGN POSTERS ── */}
      <div>
        <SectionLabel n="02">Campaign posters</SectionLabel>
        <h2 className="font-bold t1 mb-1" style={{ fontSize: 24, letterSpacing: '-.01em' }}>Ready-to-share social tiles</h2>
        <p className="t3 text-sm mb-4" style={{ maxWidth: 640 }}>Three approved campaigns, one per audience. Use them as-is — do not recrop, restretch or recolour the artwork.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {POSTERS.map((p) => <Poster key={p.id} p={p} code={code} />)}
        </div>
      </div>

      {/* ── 03 · READY TO SEND ── */}
      <div>
        <SectionLabel n="03">Ready to send</SectionLabel>
        <h2 className="font-bold t1 mb-1" style={{ fontSize: 24, letterSpacing: '-.01em' }}>Messages you can send as they are</h2>
        <p className="t3 text-sm mb-4">Your code and link are already in each one. Copy, or hand straight to WhatsApp.</p>
        <div className="grid lg:grid-cols-2 gap-4">
          {templates.map((t) => <Template key={t.id} t={t} />)}
        </div>
      </div>

      {/* ── 04 · BRAND CHEAT SHEET ── */}
      <div>
        <SectionLabel n="04">Brand cheat sheet</SectionLabel>
        <h2 className="font-bold t1 mb-4" style={{ fontSize: 24, letterSpacing: '-.01em' }}>The essentials, at a glance</h2>

        {/* logo */}
        <Card className="p-5 mb-5">
          <div className="text-xs font-semibold uppercase t3 mb-4" style={{ letterSpacing: '.16em' }}>Logo</div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/logo.png" alt="Logo on light" style={{ height: 34, maxWidth: '80%', objectFit: 'contain' }} />
            </div>
            <div style={{ background: '#111827', borderRadius: 12, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/logo-white.png" alt="Logo on dark" style={{ height: 34, maxWidth: '80%', objectFit: 'contain' }} />
            </div>
            <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 12, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/logo-white.png" alt="Logo on brand" style={{ height: 34, maxWidth: '80%', objectFit: 'contain' }} />
            </div>
          </div>
          <p className="text-sm t2 mt-4" style={{ lineHeight: 1.6 }}>
            The wordmark renders lowercase <b className="t1">yotemarket</b> — that is logotype only. In running prose always write <b className="t1">YoteMarket</b> (one word, capital Y and M).
            Pair with the strapline <i>“Kenya's Virtual Mall”</i>. Use the white lockup on dark or brand-gradient surfaces; never place the colour mark on a busy photo.
          </p>
        </Card>

        {/* colour */}
        <Card className="p-5 mb-5">
          <div className="text-xs font-semibold uppercase t3 mb-1" style={{ letterSpacing: '.16em' }}>Colour</div>
          <p className="text-sm t2 mb-4">Indigo is canon for product; the deep violet and gold face is for marketing tiles only. Tap a swatch to copy its hex.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SWATCHES.map((s) => <Swatch key={s.hex} s={s} copied={copied} onCopy={(hex) => copyOne(hex, hex)} />)}
          </div>
          <div className="rounded-xl mt-5 text-sm text-white" style={{ background: MARKETING_GRADIENT, padding: '14px 16px' }}>
            <b>Marketing gradient</b> · <code className="num" style={{ opacity: .9 }}>{MARKETING_GRADIENT}</code> — poster backgrounds only.
          </div>
        </Card>

        {/* type */}
        <Card className="p-5 mb-5">
          <div className="text-xs font-semibold uppercase t3 mb-1" style={{ letterSpacing: '.16em' }}>Typography</div>
          <p className="text-sm t2 mb-4"><b className="t1">Poppins</b> is the single product typeface (Inter is the fallback). No serif, no display face.</p>
          <div className="space-y-3">
            {TYPE_SCALE.map((r) => (
              <div key={r.spec} className="flex items-baseline gap-4 flex-wrap pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-xs t3" style={{ width: 104, flex: 'none' }}>{r.spec}</span>
                <span className={r.muted ? 't2' : 't1'} style={r.style}>{r.sample}</span>
              </div>
            ))}
          </div>
          <p className="text-sm t2 mt-4" style={{ lineHeight: 1.6 }}>
            Signature move: highlight <b className="t1">one word</b> of a neutral headline in indigo — “Connect, Trade &amp; <b style={{ color: '#4F46E5' }}>Earn</b> in Kenya's Social Marketplace”.
          </p>
        </Card>

        {/* voice + contact */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase t3 mb-4" style={{ letterSpacing: '.16em' }}>Voice &amp; tone</div>
            <ul className="space-y-3.5" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {VOICE.map((v) => (
                <li key={v.text} className="flex gap-3 text-sm t2" style={{ lineHeight: 1.55 }}>
                  <Icon name={v.ok ? 'circle-check' : 'circle-xmark'} style={{ color: v.ok ? 'var(--purple)' : 'var(--red, #EF4444)', marginTop: 3, flex: 'none' }} />
                  <span>{v.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5" style={{ background: '#111827', borderColor: '#111827' }}>
            <div className="text-xs font-semibold uppercase mb-4" style={{ letterSpacing: '.16em', color: '#A5B4FC' }}>Contact &amp; handles</div>
            <img src="/assets/logo-white.png" alt="YoteMarket" style={{ height: 30, display: 'block', marginBottom: 18 }} />
            <div className="space-y-3.5" style={{ fontSize: 15, color: '#fff' }}>
              <div className="flex items-center gap-3.5"><Icon name="phone" style={{ color: '#A5B4FC', width: 18 }} /><span className="num">0720 730 861</span></div>
              <div className="flex items-center gap-3.5"><Icon name="globe" style={{ color: '#A5B4FC', width: 18 }} /><span>www.yotemarket.co.ke</span></div>
              <div className="flex items-center gap-3.5"><Icon name="store" style={{ color: '#A5B4FC', width: 18 }} /><span>200+ local stores · 47 counties</span></div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,.12)', margin: '20px 0' }} />
            <div className="text-xs font-semibold uppercase mb-2.5" style={{ letterSpacing: '.14em', color: '#9CA3AF' }}>Iconography</div>
            <p style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.6, margin: 0 }}>
              Font Awesome 6 (solid) on web and dashboards; Material Symbols Rounded in the Flutter app. Brand marks for M-Pesa, WhatsApp and socials.
            </p>
          </Card>
        </div>
      </div>

      {/* ── 05 · OBJECTIONS ── */}
      <div>
        <SectionLabel n="05">When they push back</SectionLabel>
        <h2 className="font-bold t1 mb-1" style={{ fontSize: 24, letterSpacing: '-.01em' }}>Answer honestly</h2>
        <p className="t3 text-sm mb-4">You are paid once a merchant activates, so a signup won on a false promise is worth nothing.</p>
        <div className="space-y-3">
          {OBJECTIONS.map((o) => (
            <Card key={o.q} className="p-4">
              <div className="font-bold t1 text-sm">{o.q}</div>
              <p className="text-sm t2 mt-1.5" style={{ lineHeight: 1.55 }}>{o.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MarketingKit;
