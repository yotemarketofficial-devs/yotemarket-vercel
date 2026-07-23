/* kit.jsx — the scout's Marketing kit: everything needed to actually sign a merchant.
   Scouts work face-to-face in markets and over WhatsApp, so this is share-first:
   a working invite link, messages they can send without writing anything, and a
   pitch that answers what shop owners actually ask.

   Every claim here is taken from what the product really does — Entry is KSh 500/mo
   and free for a month with a scout code (pages/Pricing.jsx), and YoteMarket takes no
   commission. Nothing in this file is aspirational: a scout repeating it is telling
   the truth, and a merchant who signs up gets exactly what they were promised. */
import React from 'react';
import { ME } from './data.js';
import { Card, Btn, Icon } from './ui.jsx';
const { useState: useK } = React;

/* The invite has to land on the merchant signup with the code attached — that route
   reads ?ref= and pre-fills it (see dashboard/MerchantGate.jsx). Sending merchants to
   /marketers instead would be the scout-recruitment page, which earns the scout
   nothing. Canonical host is yotemarket.co.ke (NOT .com). */
const SITE = 'https://yotemarket.co.ke';
export const inviteLink = (code) => `${SITE}/dashboard?ref=${encodeURIComponent(code || '')}`;

/* clipboard fails on http:// and in some in-app browsers — fall back rather than
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

/* ── the messages ─────────────────────────────────────────────────────────────
   Written to be SENT, not edited: no blanks to fill except the shop's name, which
   the scout usually knows. Kept short — a wall of text gets ignored on WhatsApp. */
const TEMPLATES = (code, link) => ([
  {
    id: 'intro',
    label: 'First message',
    icon: 'comment',
    note: 'Opening a shop owner you just met, or one you know.',
    text:
`Habari 👋 I'm a YoteMarket scout.

YoteMarket is an online mall where Kenyan shops sell — customers find you, message you and pay by M-Pesa.

• No commission — you keep 100% of every sale
• KSh 500/month, and your FIRST MONTH IS FREE with my code
• Your own storefront page you can share anywhere

Set up here (my code is already applied):
${link}

Or enter code ${code} yourself. Takes about 5 minutes — I'll help you list your first items.`,
  },
  {
    id: 'followup',
    label: 'Follow-up',
    icon: 'rotate-right',
    note: 'For someone who showed interest but has not signed up yet.',
    text:
`Hi again 👋 Just checking in about YoteMarket.

Your first month is still free with my code ${code} — no commission on anything you sell, and you get paid straight to M-Pesa.

Here's the link when you're ready:
${link}

Happy to sit with you and set it up, it only takes a few minutes.`,
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: 'mobile-screen',
    note: 'Short enough to send as a normal text.',
    text:
`Habari, it's your YoteMarket scout. Sell online with no commission - KSh 500/mo and your first month free with code ${code}. Sign up: ${link}`,
  },
  {
    id: 'social',
    label: 'Social caption',
    icon: 'bullhorn',
    note: 'For your status or page, when you want shops to come to you.',
    text:
`Do you sell anything in Kenya? 🇰🇪

Get your shop online on YoteMarket:
✅ No commission — keep 100% of your sales
✅ Customers message you and pay by M-Pesa
✅ Your own storefront link to share
✅ First month FREE with my code: ${code}

Start here 👉 ${link}

DM me and I'll set it up with you.`,
  },
]);

/* ── the pitch ────────────────────────────────────────────────────────────────
   Answers are the ones shop owners actually push back with. Each is factual: the
   commission and pricing come from the public pricing page, payouts go to M-Pesa. */
const SELLING_POINTS = [
  { icon: 'percent', title: 'No commission', body: 'They keep 100% of every sale. YoteMarket charges a monthly plan, not a cut — this is the point most sellers react to.' },
  { icon: 'gift', title: 'First month free', body: 'Your code makes month one free, so they can try it before paying anything. After that Entry is KSh 500/month.' },
  { icon: 'mobile-screen', title: 'Paid by M-Pesa', body: 'Customers pay with M-Pesa and money is settled to the seller — no card machine, no bank setup.' },
  { icon: 'comments', title: 'Customers can message them', body: 'Buyers chat and negotiate in the app, the way they already do on WhatsApp — but with the order attached.' },
  { icon: 'link', title: 'A storefront link of their own', body: 'A page they can post anywhere, instead of re-sending photos and prices to every new customer.' },
];

const OBJECTIONS = [
  {
    q: '"I already sell on WhatsApp / Instagram."',
    a: 'Good — this does not replace that. It gives them one link to send instead of repeating photos and prices, and the order, payment and delivery are handled in one place. They can keep posting exactly as they do now.',
  },
  {
    q: '"Is it free?"',
    a: 'The first month is free with your code. After that it is KSh 500/month for Entry. Be straight about this — a merchant who feels tricked in month two is a merchant who leaves, and you are not credited for someone who never activates.',
  },
  {
    q: '"Do you take a percentage of my sales?"',
    a: 'No. That is the strongest line you have — no commission, they keep 100%. The monthly plan is the whole cost.',
  },
  {
    q: '"How do I get my money?"',
    a: 'Customers pay by M-Pesa and the seller is paid out to their M-Pesa number. They set that number up during signup.',
  },
  {
    q: '"I am not good with phones / apps."',
    a: 'Offer to sit with them and do it there — it takes about five minutes. This is the single biggest reason a signup does not happen, and it is the easiest one to fix in person.',
  },
];

function Row({ children, className = '' }) {
  return <div className={'flex items-center gap-2 flex-wrap ' + className}>{children}</div>;
}

/* One sendable message: preview, copy, and a real WhatsApp hand-off. */
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
        style={{ background: 'var(--surface2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.5,
          maxHeight: open ? 'none' : 132, overflow: 'hidden', position: 'relative' }}>{t.text}</pre>
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold mt-1.5"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--purple)' }}>
        {open ? 'Show less' : 'Show full message'}
      </button>

      <Row className="mt-3">
        <Btn kind="primary" size="sm" icon={copied === 'yes' ? 'check' : 'copy'} onClick={copy}>
          {copied === 'yes' ? 'Copied' : copied === 'no' ? 'Press Ctrl+C' : 'Copy message'}
        </Btn>
        <a href={waShare(t.text)} target="_blank" rel="noreferrer"
          className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white"
          style={{ background: '#25D366' }}>
          <Icon name="whatsapp" brand /> Send on WhatsApp
        </a>
      </Row>
    </Card>
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
    <div className="fadeup space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold t1" style={{ letterSpacing: '-.01em' }}>Marketing kit</h1>
        <p className="t3 text-sm mt-1">Your link, ready-made messages and the pitch — everything to sign a merchant today.</p>
      </div>

      {/* invite link + code */}
      <div className="grad rounded-2xl p-6 text-white relative overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(244,181,48,.35), transparent 70%)' }} />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.7)' }}>Your invite link</div>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,.85)' }}>
            Opens the merchant signup with your code already filled in — so you get credited even if they forget to type it.
          </p>

          <div className="rounded-xl p-3 mt-4" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)' }}>
            <code className="num text-sm text-white block" style={{ wordBreak: 'break-all' }}>{link}</code>
          </div>

          <Row className="mt-3">
            <button onClick={() => copyOne('link', link)}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: '#fff', color: 'var(--purple-deep)' }}>
              <Icon name={copied === 'link' ? 'check' : 'copy'} /> {copied === 'link' ? 'Copied' : 'Copy link'}
            </button>
            <a href={waShare(templates[0].text)} target="_blank" rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white"
              style={{ background: '#25D366' }}>
              <Icon name="whatsapp" brand /> Share on WhatsApp
            </a>
            <button onClick={() => copyOne('code', code)}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white"
              style={{ background: 'rgba(255,255,255,.16)' }}>
              <Icon name={copied === 'code' ? 'check' : 'hashtag'} /> {copied === 'code' ? 'Copied' : `Copy code ${code}`}
            </button>
          </Row>

          <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,.7)' }}>
            If they sign up on their own phone, ask them to type <b className="num">{code}</b> in the “Referral code” box.
          </p>
        </div>
      </div>

      {/* sendable messages */}
      <div>
        <h2 className="font-bold t1 text-lg mb-1">Ready to send</h2>
        <p className="t3 text-sm mb-4">Copy, or hand straight to WhatsApp. Your code and link are already in each one.</p>
        <div className="grid lg:grid-cols-2 gap-4">
          {templates.map((t) => <Template key={t.id} t={t} />)}
        </div>
      </div>

      {/* what to say */}
      <div>
        <h2 className="font-bold t1 text-lg mb-1">Why a shop should say yes</h2>
        <p className="t3 text-sm mb-4">Lead with no commission — it is the line sellers react to.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SELLING_POINTS.map((p) => (
            <Card key={p.title} className="p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: 'var(--surface2)', color: 'var(--gold-strong, var(--purple))' }}><Icon name={p.icon} /></div>
              <div className="font-bold t1 text-sm">{p.title}</div>
              <p className="text-sm t2 mt-1" style={{ lineHeight: 1.5 }}>{p.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* objections */}
      <div>
        <h2 className="font-bold t1 text-lg mb-1">When they push back</h2>
        <p className="t3 text-sm mb-4">Answer honestly — you are only paid once a merchant actually activates, so a signup won under a false promise is worth nothing.</p>
        <div className="space-y-3">
          {OBJECTIONS.map((o) => (
            <Card key={o.q} className="p-4">
              <div className="font-bold t1 text-sm">{o.q}</div>
              <p className="text-sm t2 mt-1.5" style={{ lineHeight: 1.55 }}>{o.a}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--surface2)', color: 'var(--purple)' }}><Icon name="circle-info" /></div>
        <p className="text-sm t2" style={{ lineHeight: 1.55 }}>
          You are credited when a merchant you referred <b className="t1">activates</b> — not at signup. The fastest way to get there is to
          help them list a few items before you leave, so their store is actually ready to sell.
        </p>
      </Card>
    </div>
  );
}

export default MarketingKit;
