/* engage.jsx — Storefront: Messages (chat inbox + thread) and YoteAI assistant.
   Messages are real, two-sided in-app chat backed by Firestore (shared model with
   the merchant dashboard + Flutter apps). Chat requires a signed-in account; guests
   are prompted to sign in. YoteAI is wired to the real `aiChat` Cloud Function
   (Ollama Cloud) with a warm local fallback. */
import React from 'react';
import { useYM, FA, Thumb, GuestGate } from './ui.jsx';
import Markdown from '../../components/Markdown.jsx';
import { YM_PRODUCTS, ymStore, ymProduct, ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { aiAssistant, firebaseEnabled } from '../../lib/firebase.js';
import {
  chatEnabled, conversationId, openStoreConversation, subscribeConversations,
  subscribeMessages, sendChatMessage, markConversationRead, otherParticipant,
  hideConversation, reportConversation, fmtTime, fmtWhen, tsMillis, visibleMessages, dayLabel, sameDayMs, offerItems, offerTotal,
} from '../../lib/chat.js';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import { usePushPrompt } from '../../lib/push.js';
const { useState: useSE, useRef: useRefE, useEffect: useEffE } = React;

/* Dismissible opt-in to browser push (only shows when permission is unanswered). */
function NotifyBanner({ user }){
  const { canPrompt, enable } = usePushPrompt(user);
  const [hidden, setHidden] = useSE(false);
  if (!canPrompt || hidden) return null;
  return (
    <div className="ym-card" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', marginBottom:16, background:'var(--m-surface-2)' }}>
      <FA i="fa-bell" style={{ color:'var(--m-primary)', fontSize:16 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:13.5 }}>Turn on message notifications</div>
        <div className="ym-cap">Get a push when a store replies — even when this tab is closed.</div>
      </div>
      <button className="ym-btn ym-btn-primary ym-btn-sm" onClick={()=>enable()}>Enable</button>
      <button className="icon-btn" aria-label="Dismiss" onClick={()=>setHidden(true)}><FA i="fa-xmark" /></button>
    </div>
  );
}

const QUICK_CHIPS = ['Is this available?', 'What’s your last price?', 'Do you deliver today?'];

function shopperNameOf(account, user) {
  return account?.name && account.name !== 'Guest'
    ? account.name
    : (user?.displayName || (user?.email ? user.email.split('@')[0] : 'Shopper'));
}

/* Local YoteAI fallback used when the AI backend isn't reachable. */
function localAiReply(text){
  const l = text.toLowerCase();
  const priceMatch = l.match(/(\d[\d,]{2,})/);
  const budget = priceMatch ? Number(priceMatch[1].replace(/,/g,'')) : null;
  if (budget){
    const hits = YM_PRODUCTS.filter(p=>p.price<=budget).slice(0,3);
    if (hits.length) return `Within Ksh ${budget.toLocaleString('en-KE')} you could grab: ${hits.map(p=>`${p.name} (${ymPrice(p.price)})`).join(', ')}. Want me to open any of them?`;
  }
  if (l.includes('fresh') || l.includes('produce') || l.includes('grocer')) return 'For fresh produce, Mama Njeri Fresh in Westlands is a favourite — farm-fresh and same-day to your hub. 🥑';
  if (l.includes('phone') || l.includes('electronic')) return 'Check out Wanjiku Electronics in the CBD — phones, earbuds and speakers with warranty. The Samsung Galaxy A15 is a great pick at Ksh 18,500.';
  if (l.includes('deal') || l.includes('offer') || l.includes('discount')) return 'Today’s best deals: Wireless Earbuds Pro (-23%), Ankara Shift Dress (-20%) and the Bluetooth Party Speaker (-19%). Karibu kushop! 🎉';
  return 'Karibu! Tell me a category, budget or store and I’ll point you to the best options in the mall.';
}

export function MessagesScreen({ params }){
  const { account } = useYM();
  const { user } = useAuth();
  if (chatEnabled(user)) return <LiveMessages params={params} user={user} account={account} />;
  return <GuestGate icon="fa-comments" title="Sign in to your messages" sub="Chat directly with stores about price, stock and delivery — sign in to start a conversation." />;
}

/* ---------- LIVE MESSAGES (Firestore, two-sided shopper ↔ store) ---------- */
function LiveMessages({ params, user, account }){
  const { nav, reset, toast } = useYM();
  const [convos, setConvos] = useSE(null); // null = still loading
  const [sel, setSel] = useSE(null);
  const myUid = user.uid;

  // Live inbox.
  useEffE(() => subscribeConversations(myUid, setConvos, 'shopper'), [myUid]);

  // Opened from a store/product "Chat with seller" CTA → ensure the thread exists
  // and select it (we can derive its id synchronously so selection is instant).
  const paramStore = params?.store;
  const paramProduct = params?.product || null;
  const paramOrder = params?.order || null;
  useEffE(() => {
    if (!paramStore?.id) return;
    setSel(conversationId(paramStore.id, myUid));
    openStoreConversation({ store: paramStore, user, shopperName: shopperNameOf(account, user), product: paramProduct || undefined })
      .catch((e) => toast(e.message || 'Couldn’t open chat', 'fa-triangle-exclamation'));
  }, [paramStore?.id, myUid]);

  const list = convos || [];
  const visible = list.filter((c) => !c.hidden); // rows exclude "deleted for me"
  const removeConv = (c) => {
    if (!window.confirm('Remove this conversation from your inbox? It’ll come back if they message you again.')) return;
    if (sel === c.id) setSel(null);
    hideConversation(c.id, myUid).then(()=>toast && toast('Conversation removed')).catch(()=>toast && toast('Could not remove', 'fa-triangle-exclamation'));
  };
  // Fall back to a synthesized thread for a just-opened store not yet in the snapshot.
  const selConv = list.find((c) => c.id === sel)
    || (paramStore && sel === conversationId(paramStore.id, myUid)
      ? { id: sel, storeId: paramStore.id, participants: [myUid, paramStore.ownerId], info: {
          [paramStore.ownerId]: { name: paramStore.name, role: 'merchant', icon: paramStore.icon, tint: paramStore.tint, img: paramStore.img, logo: paramStore.logo },
        }, unread: {}, ...(paramProduct ? { product: paramProduct } : {}) }
      : visible[0] || null);

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <button onClick={()=>reset('home')} aria-label="Back to home" className="icon-btn" style={{ flexShrink:0 }}><FA i="fa-arrow-left" /></button>
        <h1 className="ym-h1" style={{ margin:0 }}>Messages</h1>
      </div>
      <NotifyBanner user={user} />
      <div className="ym-card msg-grid" data-view={sel ? 'thread' : 'list'} style={{ display:'grid', gridTemplateColumns:'320px 1fr', overflow:'hidden', height:'min(680px, calc(100dvh - 200px))', minHeight:460 }}>
        <div className="msg-list" style={{ borderRight:'1px solid var(--m-border)', overflowY:'auto' }}>
          <button onClick={()=>nav('ai')} style={{ width:'100%', textAlign:'left', border:'none', cursor:'pointer', fontFamily:'inherit', padding:14, display:'flex', alignItems:'center', gap:12, background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><YoteAiMark size={24} color="#fff" /></div>
            <div style={{ flex:1, minWidth:0 }}><div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>YoteAI Assistant</div><div style={{ color:'rgba(255,255,255,.85)', fontSize:12 }}>Find products & best deals</div></div>
            <span style={{ background:'rgba(255,255,255,.18)', color:'#fff', fontSize:10.5, fontWeight:700, padding:'4px 9px', borderRadius:9999 }}>AI</span>
          </button>
          {convos === null && <div style={{ padding:'22px 16px', color:'var(--m-fg3)', fontSize:13.5 }}>Loading your chats…</div>}
          {convos !== null && visible.length === 0 && (
            <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>
              <FA i="fa-comments" style={{ fontSize:30, color:'var(--m-fg4)', marginBottom:12, display:'block' }} />
              No messages yet. Tap “Chat with seller” on any store to start a conversation.
            </div>
          )}
          {visible.map((c) => {
            const otherId = otherParticipant(c, myUid);
            const info = (c.info && c.info[otherId]) || {};
            const unread = (c.unread && c.unread[myUid]) || 0;
            return (
              <div key={c.id} className="conv-row" style={{ position:'relative', borderBottom:'1px solid var(--m-border)' }}>
                <button onClick={()=>setSel(c.id)} style={{ width:'100%', textAlign:'left', border:'none', cursor:'pointer', fontFamily:'inherit', padding:'13px 42px 13px 14px', display:'flex', alignItems:'center', gap:12, background: sel===c.id?'var(--m-surface-3)':'transparent' }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <Thumb icon={info.icon || 'fa-store'} tint={info.tint || '#4f46e5'} size={46} radius={9999} img={info.logo || info.img} />
                    {unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>{unread}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><span className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{info.name || 'Store'}</span><span className="ym-cap" style={{ flexShrink:0 }}>{fmtWhen(c.updatedAt)}</span></div>
                    <div className="ym-sub" style={{ fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:unread?'var(--m-fg1)':'var(--m-fg3)', fontWeight:unread?600:400 }}>{c.lastMessage || 'Say hello 👋'}</div>
                  </div>
                </button>
                <button onClick={(e)=>{ e.stopPropagation(); removeConv(c); }} className="conv-del" aria-label="Delete conversation" title="Delete conversation" style={{ position:'absolute', top:'50%', right:6, transform:'translateY(-50%)', width:30, height:30, borderRadius:8, border:'none', background:'transparent', color:'var(--m-fg4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-trash" style={{ fontSize:12 }} /></button>
              </div>
            );
          })}
        </div>
        <div className="msg-thread" style={{ minWidth:0, display:'flex', flexDirection:'column' }}>
          {selConv
            ? <LiveChatThread key={selConv.id} conv={selConv} user={user} onBack={()=>setSel(null)} openProduct={paramStore && selConv.storeId === paramStore.id ? paramProduct : null} openOrder={paramStore && selConv.storeId === paramStore.id ? paramOrder : null} />
            : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--m-fg3)', fontSize:14, padding:24, textAlign:'center' }}>Select a conversation to start chatting.</div>}
        </div>
      </div>
      <style>{`
        @media (max-width:820px){
          /* Collapse to a single full-width column early so the thread never gets
             squeezed next to the 320px conversation list on tablets/large phones. */
          .msg-grid{ grid-template-columns:1fr !important; height:calc(100dvh - 168px) !important; min-height:440px; }
          .msg-grid[data-view="thread"] .msg-list{ display:none !important; }
          .msg-grid[data-view="list"] .msg-thread{ display:none !important; }
          .msg-back{ display:inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

/* Compact order-reference card rendered inside a chat bubble when a message
   carries an `order` tag (post-purchase support). `dark` = on my own bubble. */
function OrderRefCard({ order, dark }){
  const fg = dark ? 'rgba(255,255,255,.95)' : 'var(--m-fg1)';
  const sub = dark ? 'rgba(255,255,255,.72)' : 'var(--m-fg3)';
  const bits = [order.items ? `${order.items} item${order.items !== 1 ? 's' : ''}` : '', order.total != null ? ymPrice(order.total) : ''].filter(Boolean).join(' · ');
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:7, padding:'8px 10px', borderRadius:10, background: dark ? 'rgba(255,255,255,.15)' : 'var(--m-surface-2)' }}>
      <span style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: dark ? 'rgba(255,255,255,.2)' : 'var(--m-bg)', color: dark ? '#fff' : 'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-receipt" style={{ fontSize:13 }} /></span>
      <span style={{ minWidth:0 }}>
        <span style={{ display:'block', fontWeight:700, fontSize:12.5, fontFamily:'monospace', color:fg, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{order.no || 'Order'}</span>
        {bits && <span style={{ fontSize:11, color:sub }}>{bits}</span>}
      </span>
    </div>
  );
}

/* A negotiation card — an offer or counter-offer either side sent in chat. On the
   latest, still-open offer the recipient can Accept & pay, Counter or Decline;
   the sender sees "waiting", and superseded/closed offers render static. */
function OfferCard({ offer, myRole, active, onAccept, onCounter, onDecline }){
  const mine = offer.by === myRole;
  const dark = mine;
  const fg = dark ? 'rgba(255,255,255,.96)' : 'var(--m-fg1)';
  const sub = dark ? 'rgba(255,255,255,.75)' : 'var(--m-fg3)';
  const accent = dark ? '#fff' : 'var(--m-primary)';
  const its = offerItems(offer);
  const total = offerTotal(offer);
  const bundle = its.length > 1;
  const label = bundle ? 'Bundle offer' : (mine ? 'Your offer' : (offer.by === 'merchant' ? 'Store’s offer' : 'Offer'));
  const ico = { flexShrink:0, width:38, height:34, borderRadius:9, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:13, background: dark?'rgba(255,255,255,.16)':'var(--m-surface-3)' };
  return (
    <div style={{ marginBottom:7, borderRadius:12, overflow:'hidden', border:'1px solid ' + (dark ? 'rgba(255,255,255,.25)' : 'var(--m-primary)'), opacity: active ? 1 : .66 }}>
      <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:7, background: dark ? 'rgba(255,255,255,.14)' : 'color-mix(in srgb, var(--m-primary) 12%, transparent)' }}>
        <FA i={bundle ? 'fa-boxes-stacked' : 'fa-handshake'} style={{ color:accent, fontSize:13 }} />
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:.4, textTransform:'uppercase', color:accent }}>{label}</span>
      </div>
      <div style={{ padding:'10px 12px', background: dark ? 'rgba(255,255,255,.06)' : 'var(--m-surface-2)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {its.map((it, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Thumb icon={it.productIcon || 'fa-box'} tint="#7c3aed" size={bundle ? 32 : 38} radius={8} img={it.productImage} />
              <div style={{ flex:1, minWidth:0, fontWeight:600, fontSize:13, color:fg, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.productName || 'Product'}</div>
              {(Number(it.qty) || 1) > 1 && <span style={{ fontSize:11.5, color:sub, flexShrink:0 }}>× {it.qty}</span>}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:9, paddingTop:8, borderTop:'1px solid '+(dark?'rgba(255,255,255,.16)':'var(--m-border)') }}>
          <span style={{ fontSize:11.5, color:sub }}>{bundle ? `${its.length} items` : 'Total'}</span>
          <b style={{ fontSize:15, color:fg }}>{ymPrice(total)}</b>
        </div>
        {offer.note && <div style={{ fontSize:12, color:sub, marginTop:7 }}>{offer.note}</div>}
        {active && !mine && (
          <div style={{ display:'flex', gap:7, marginTop:9 }}>
            <button onClick={()=>onAccept(offer)} className="ym-btn ym-btn-primary ym-btn-sm" style={{ flex:1 }}><FA i="fa-bolt" /> Accept &amp; pay {ymPrice(total)}</button>
            <button onClick={()=>onCounter(offer)} title="Counter" aria-label="Counter" style={{ ...ico, color: dark?'#fff':'var(--m-fg2)' }}><FA i="fa-arrow-right-arrow-left" /></button>
            <button onClick={()=>onDecline(offer)} title="Decline" aria-label="Decline" style={{ ...ico, color:'var(--m-danger)' }}><FA i="fa-xmark" /></button>
          </div>
        )}
        {active && mine && <div style={{ fontSize:11, color:sub, marginTop:8, display:'flex', alignItems:'center', gap:6 }}><FA i="fa-clock" style={{ fontSize:10 }} /> Waiting for the store to reply…</div>}
      </div>
    </div>
  );
}

/* Price prompt to make/counter an offer. The items are fixed (from the offer being
   countered or the pinned product); only the TOTAL price is negotiated. */
function OfferCounterModal({ base, onClose, onSend }){
  const its = offerItems(base);
  const bundle = its.length > 1;
  const [price, setPrice] = useSE(String(offerTotal(base) || ''));
  const [note, setNote] = useSE('');
  const pr = Number(price);
  const inp = { width:'100%', padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e)=>e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:400, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div className="ym-h2" style={{ fontSize:17, display:'flex', alignItems:'center', gap:8 }}><FA i={bundle ? 'fa-boxes-stacked' : 'fa-handshake'} style={{ color:'var(--m-primary)' }} /> {bundle ? 'Offer for the bundle' : 'Make an offer'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
          {its.map((it, i) => <div key={i} className="ym-sub" style={{ fontSize:13, display:'flex', justifyContent:'space-between', gap:8 }}><span style={{ minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.productName || 'Product'}</span>{(Number(it.qty) || 1) > 1 && <span style={{ color:'var(--m-fg3)', flexShrink:0 }}>× {it.qty}</span>}</div>)}
        </div>
        <label className="ym-cap" style={{ fontWeight:600, display:'block' }}>Your price{bundle ? ' for the bundle' : ''} (KSh)
          <input value={price} onChange={(e)=>setPrice(e.target.value.replace(/[^\d.]/g,''))} inputMode="decimal" placeholder="0" style={inp} autoFocus />
        </label>
        <label className="ym-cap" style={{ fontWeight:600, display:'block', marginTop:10 }}>Note (optional)
          <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="e.g. can you do this price?" style={inp} />
        </label>
        <button disabled={!(pr > 0)} onClick={()=>onSend(base, pr, note.trim())} className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:16 }}><FA i="fa-paper-plane" /> Send offer · {ymPrice(pr > 0 ? pr : 0)}</button>
      </div>
    </div>
  );
}

function LiveChatThread({ conv, user, onBack, openProduct, openOrder }){
  const { toast, nav } = useYM();
  const myUid = user.uid;
  const otherId = otherParticipant(conv, myUid);
  const info = (conv.info && conv.info[otherId]) || {};
  const blocked = conv.status === 'blocked';
  const pinned = conv.product || openProduct || null; // the product this chat is about
  const [msgs, setMsgs] = useSE([]);
  const [loaded, setLoaded] = useSE(false);
  const [draft, setDraft] = useSE('');
  const [counterFor, setCounterFor] = useSE(null); // offer/product being (counter-)offered
  const scrollRef = useRefE(null);
  const autoSentRef = useRefE(false);

  useEffE(() => subscribeMessages(conv.id, (list)=>{ setMsgs(list); setLoaded(true); }), [conv.id]);
  // Clear my unread badge whenever I'm viewing the thread and new messages land.
  useEffE(() => { markConversationRead(conv.id, myUid); }, [conv.id, msgs.length]);
  useEffE(() => { const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; }, [msgs]);

  const [reported, setReported] = useSE(false);
  const send = (text, extra) => {
    const t=(text||draft).trim(); if(!t) return;
    if (blocked) { toast('This conversation is closed.', 'fa-ban'); return; }
    setDraft('');
    sendChatMessage({ convId: conv.id, conv, user, text: t, recipientUid: otherId, ...(extra || {}) })
      .catch((e) => toast(e?.message || 'Message failed to send', 'fa-triangle-exclamation'));
  };
  // Opened from a product / YoteFeed → greet with the product named, once, on a fresh
  // thread (the product also stays pinned above so both sides know what it's about).
  useEffE(() => {
    if (!openProduct || !loaded || blocked || autoSentRef.current || msgs.length > 0) return;
    autoSentRef.current = true;
    send(`Hi! I'm interested in ${openProduct.name || 'this product'}. Is it still available?`);
  }, [openProduct, loaded, blocked, msgs.length]);
  // Opened from an order ("Message store about this order") → post the order as a
  // tagged message once per open. Unlike the product greeting we DON'T gate on an
  // empty thread: post-purchase support usually happens on a store the shopper
  // already has a thread with, and the order card is the whole point.
  useEffE(() => {
    if (!openOrder || !loaded || blocked || autoSentRef.current) return;
    autoSentRef.current = true;
    send(`Hi! I have a question about my order ${openOrder.no || ''}.`.trim(), { order: openOrder });
  }, [openOrder, loaded, blocked]);
  const report = () => {
    if (reported) return;
    setReported(true);
    reportConversation({
      convId: conv.id, reporterUid: myUid,
      reporterName: user.displayName || (user.email ? user.email.split('@')[0] : 'Shopper'),
      reportedName: info.name || 'Store', reason: 'Reported by shopper',
    }).then(() => toast('Reported — our team will review this chat.', 'fa-flag'))
      .catch(() => { setReported(false); toast('Couldn’t submit report', 'fa-triangle-exclamation'); });
  };

  // Messages I can see — a chat I "deleted" starts fresh for me on re-open.
  const shown = visibleMessages(msgs, conv, myUid);
  // Read receipt: has the other participant read past my latest message?
  const otherReadMs = tsMillis((conv.lastReadAt && conv.lastReadAt[otherId]) || 0);
  let myLastIdx = -1;
  for (let i = shown.length - 1; i >= 0; i--) { if (shown[i].senderId === myUid) { myLastIdx = i; break; } }

  // Negotiation: only the latest offer is actionable, until a decline closes it.
  let lastOfferIdx = -1;
  for (let i = shown.length - 1; i >= 0; i--) { if (shown[i].offer) { lastOfferIdx = i; break; } }
  const negotiationClosed = lastOfferIdx >= 0 && shown.some((m, i) => i > lastOfferIdx && m.offerClosed);
  const acceptOffer = (o) => nav('checkout', { offer: o });
  const declineOffer = () => send('I’ll pass on this offer — thanks anyway.', { offerClosed: true });
  const sendCounter = (base, price, note) => { setCounterFor(null); const its = offerItems(base); send(`My offer: ${ymPrice(price)}${its.length > 1 ? ` for the bundle (${its.length} items)` : ''}`, { offer: { id: 'of_' + Math.random().toString(36).slice(2, 9), by: 'shopper', items: its, price: Number(price), note: note || '', storeId: base.storeId || conv.storeId || null } }); };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--m-border)' }}>
        <button className="msg-back" onClick={onBack} aria-label="Back to conversations" style={{ display:'none', width:34, height:34, borderRadius:9999, border:'none', background:'var(--m-surface-2)', color:'var(--m-fg2)', cursor:'pointer', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FA i="fa-arrow-left" /></button>
        <Thumb icon={info.icon || 'fa-store'} tint={info.tint || '#4f46e5'} size={42} radius={9999} img={info.logo || info.img} />
        <div style={{ flex:1, minWidth:0 }}>
          <div className="ym-h3">{info.name || 'Store'}</div>
          <div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'var(--m-success)' }} /> {blocked ? 'Conversation closed' : 'Usually replies quickly'}</div>
        </div>
        <button className="icon-btn" aria-label="Report conversation" title={reported?'Reported':'Report conversation'} onClick={report} disabled={reported} style={{ color: reported?'var(--m-fg4)':'var(--m-fg3)' }}><FA i="fa-flag" /></button>
      </div>
      {pinned && (
        <button onClick={()=> pinned.id && nav('product', { pid: pinned.id })}
          style={{ display:'flex', alignItems:'center', gap:12, textAlign:'left', width:'100%', border:'none', borderBottom:'1px solid var(--m-border)', cursor: pinned.id?'pointer':'default', fontFamily:'inherit', padding:'10px 16px', background:'var(--m-surface-2)' }}>
          <span className="ym-cap" style={{ flexShrink:0, color:'var(--m-fg3)' }}><FA i="fa-tag" /> About this product</span>
          <Thumb icon={pinned.icon || 'fa-box'} tint={pinned.tint || '#7c3aed'} size={38} radius={10} img={pinned.img} />
          <span style={{ flex:1, minWidth:0 }}>
            <span className="ym-h3" style={{ fontSize:13.5, display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pinned.name || 'Product'}</span>
            {pinned.price!=null && <span className="ym-cap">{ymPrice(pinned.price)}</span>}
          </span>
          {pinned.id && <span className="ym-cap" style={{ flexShrink:0, color:'var(--m-link)', fontWeight:600 }}>View <FA i="fa-chevron-right" style={{ fontSize:10 }} /></span>}
        </button>
      )}
      <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
        {shown.length===0 && <div style={{ margin:'auto', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5, maxWidth:260 }}>This is the start of your conversation with {info.name || 'this store'}. Ask about price, stock or delivery.</div>}
        {shown.map((m, idx) => {
          const mine = m.senderId === myUid;
          const seen = mine && idx === myLastIdx && tsMillis(m.at) > 0 && otherReadMs >= tsMillis(m.at);
          const ms = tsMillis(m.at);
          const showDay = !!ms && (idx === 0 || !sameDayMs(ms, tsMillis(shown[idx-1].at)));
          return (
            <React.Fragment key={m.id}>
              {showDay && <div style={{ alignSelf:'center', margin:'4px 0', padding:'3px 12px', borderRadius:9999, background:'var(--m-surface-2)', color:'var(--m-fg3)', fontSize:11, fontWeight:600 }}>{dayLabel(ms)}</div>}
              <div style={{ maxWidth:'80%', padding:'10px 14px', fontSize:14, lineHeight:1.45,
                alignSelf: mine?'flex-end':'flex-start',
                background: mine?'var(--m-primary-deep)':'var(--m-surface)', color: mine?'#fff':'var(--m-fg1)',
                borderRadius: mine?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>
                {m.offer && <OfferCard offer={m.offer} myRole="shopper" active={idx === lastOfferIdx && !negotiationClosed} onAccept={acceptOffer} onCounter={setCounterFor} onDecline={declineOffer} />}{m.order && <OrderRefCard order={m.order} dark={mine} />}{m.text}<div style={{ fontSize:10, opacity:.65, marginTop:4, textAlign:'right' }}>{fmtTime(m.at)}{seen ? <> · <FA i="fa-check-double" /> Seen</> : ''}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {shown.length===0 && !blocked && (
        <div className="scroll-x" style={{ gap:8, padding:'10px 18px 0' }}>
          {QUICK_CHIPS.map(c=><button key={c} className="ym-chip ym-btn-sm" style={{ height:34, flexShrink:0, fontSize:13 }} onClick={()=>send(c)}>{c}</button>)}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderTop:'1px solid var(--m-border)', background:'var(--m-surface)' }}>
        {pinned && pinned.id && !blocked && (
          <button onClick={()=>setCounterFor({ items: [{ productId: pinned.id, productName: pinned.name, productImage: pinned.img || null, productIcon: pinned.icon || 'fa-box', qty: 1 }], price: pinned.price || 0, storeId: conv.storeId || null })} title="Make an offer" aria-label="Make an offer" style={{ flexShrink:0, width:46, height:46, borderRadius:9999, border:'1px solid var(--m-border)', background:'var(--m-surface-2)', color:'var(--m-primary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}><FA i="fa-handshake" /></button>
        )}
        <input className="ym-input" placeholder={blocked ? 'Conversation closed' : 'Message…'} aria-label="Message" disabled={blocked} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ flex:1, minWidth:0, height:46, padding:'0 18px', fontSize:15, borderRadius:9999, background:'var(--m-surface-2)', border:'none', opacity:blocked?.6:1 }} />
        <button onClick={()=>send()} disabled={blocked} aria-label="Send" style={{ flexShrink:0, width:46, height:46, borderRadius:9999, border:'none', background:'var(--m-primary-deep)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, opacity:blocked?.6:1 }}><FA i="fa-paper-plane" /></button>
      </div>
      {counterFor && <OfferCounterModal base={counterFor} onClose={()=>setCounterFor(null)} onSend={sendCounter} />}
    </div>
  );
}

/* A product the AI surfaced, shown as a card that links straight to its store. */
function AIResultCard({ r }){
  const { nav } = useYM();
  const prod = ymProduct(r.id) || {};
  const store = ymStore(r.storeId);
  const open = () => store ? nav('store', { sid: r.storeId }) : nav('product', { pid: r.id });
  return (
    <button onClick={open} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', border:'1px solid var(--m-border)', background:'var(--m-surface)', cursor:'pointer', fontFamily:'inherit', borderRadius:14, padding:10 }}>
      <Thumb icon={prod.icon || 'fa-box'} tint={store?.tint || '#7c3aed'} size={48} radius={11} img={prod.img} />
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
        <div className="ym-cap" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ymPrice(r.price)}{store ? ' · ' + store.name : ''}</div>
      </div>
      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--m-link)', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>{store ? 'Visit store' : 'View'} <FA i="fa-arrow-right" style={{ fontSize:10 }} /></span>
    </button>
  );
}

/* ---------- YOTE AI ---------- */
export function AIScreen(){
  const { back } = useYM();
  const { user } = useAuth();
  const suggestions = ['Find me a phone under Ksh 20,000','Which stores sell fresh produce?','Best deals right now','What can I gift under Ksh 1,500?'];
  const [msgs, setMsgs] = useSE([{ role:'assistant', content:'Karibu! I’m YoteAI — your shopping assistant. Tell me what you’re looking for and I’ll point you to the right stores and deals.' }]);
  const [draft, setDraft] = useSE(''); const [busy, setBusy] = useSE(false);
  const scrollRef = useRefE(null);
  useEffE(()=>{ const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; },[msgs,busy]);

  const send = async (text)=>{
    const t=(text||draft).trim(); if(!t||busy) return;
    const next=[...msgs,{role:'user',content:t}]; setMsgs(next); setDraft(''); setBusy(true);
    try{
      if (!firebaseEnabled || !user || user.isGuest) {
        await new Promise(r=>setTimeout(r, 500));
        setMsgs(m=>[...m,{role:'assistant',content:localAiReply(t)}]);
      } else {
        // Grounded assistant returns real catalog matches → render store links.
        const { reply, products } = await aiAssistant({ role:'shopper', messages: next.map(m=>({ role:m.role, content:m.content })) });
        setMsgs(m=>[...m,{role:'assistant',content:(reply||'').trim()||localAiReply(t),products:Array.isArray(products)?products:[]}]);
      }
    }catch(e){ setMsgs(m=>[...m,{role:'assistant',content:localAiReply(t)}]); }
    finally{ setBusy(false); }
  };

  return (
    <div className="ai-overlay" onClick={(e)=>{ if(e.target===e.currentTarget) back(); }}>
      <div className="ym-card ai-glass genie" onClick={e=>e.stopPropagation()} style={{ position:'relative', width:'100%', maxWidth:760, overflow:'hidden', display:'flex', flexDirection:'column', height:'min(620px, 80vh)', minHeight:440 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><YoteAiMark size={22} color="#fff" /></div>
          <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>YoteAI</div><div style={{ color:'rgba(255,255,255,.82)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'#6ee7b7' }} /> Shopping assistant</div></div>
          <button onClick={back} aria-label="Close" className="icon-btn" style={{ width:36, height:36, background:'rgba(255,255,255,.16)', color:'#fff' }}><FA i="fa-xmark" /></button>
        </div>
        <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, background:'transparent' }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:8, alignItems:m.role==='user'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:m.role==='user'?'80%':'94%', padding:'11px 15px', fontSize:14.5, lineHeight:1.5, whiteSpace:m.role==='user'?'pre-wrap':'normal',
                background:m.role==='user'?'var(--m-primary-deep)':'var(--m-surface)',
                color:m.role==='user'?'#fff':'var(--m-fg1)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.role==='assistant' ? <Markdown text={m.content} /> : m.content}</div>
              {m.role==='assistant' && m.products && m.products.length>0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:'92%' }}>
                  {m.products.slice(0,5).map(r=><AIResultCard key={r.id} r={r} />)}
                </div>
              )}
            </div>
          ))}
          {busy && <div style={{ alignSelf:'flex-start', padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', gap:5 }}>{[0,1,2].map(d=><span key={d} style={{ width:7, height:7, borderRadius:9999, background:'var(--m-fg4)', animation:`ym-fade 1s ease ${d*0.18}s infinite alternate` }} />)}</div>}
        </div>
        {msgs.length<=1 && (
          <div style={{ padding:'0 20px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
            {suggestions.map(s=><button key={s} onClick={()=>send(s)} style={{ border:'1px solid var(--m-border)', background:'var(--m-surface)', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--m-fg2)', borderRadius:12, padding:'9px 13px', display:'flex', alignItems:'center', gap:8 }}><FA i="fa-wand-magic-sparkles" style={{ color:'var(--m-primary)', fontSize:12 }} /> {s}</button>)}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', borderTop:'1px solid var(--m-border)' }}>
          <input className="ym-input" placeholder="Ask YoteAI…" aria-label="Ask YoteAI" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ height:48, padding:'0 20px', fontSize:15, borderRadius:9999, background:'var(--m-surface-2)', border:'none' }} />
          <button onClick={()=>send()} disabled={busy} className="icon-btn" aria-label="Send" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)', opacity:busy?.6:1 }}><FA i="fa-paper-plane" /></button>
        </div>
      </div>
    </div>
  );
}
