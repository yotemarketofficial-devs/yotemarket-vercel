/* engage.jsx — Storefront: Messages (chat inbox + thread) and YoteAI assistant.
   Messages are real, two-sided in-app chat backed by Firestore (shared model with
   the merchant dashboard + Flutter apps). Chat requires a signed-in account; guests
   are prompted to sign in. YoteAI is wired to the real `aiChat` Cloud Function
   (Ollama Cloud) with a warm local fallback. */
import React from 'react';
import { useYM, FA, Thumb, GuestGate } from './ui.jsx';
import { YM_STORES, YM_PRODUCTS, ymStore, ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { aiChat, firebaseEnabled } from '../../lib/firebase.js';
import {
  chatEnabled, conversationId, openStoreConversation, subscribeConversations,
  subscribeMessages, sendChatMessage, markConversationRead, otherParticipant,
  fmtTime, fmtWhen,
} from '../../lib/chat.js';
const { useState: useSE, useRef: useRefE, useEffect: useEffE } = React;

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
  useEffE(() => subscribeConversations(myUid, setConvos), [myUid]);

  // Opened from a store/product "Chat with seller" CTA → ensure the thread exists
  // and select it (we can derive its id synchronously so selection is instant).
  const paramStore = params?.store;
  useEffE(() => {
    if (!paramStore?.id) return;
    setSel(conversationId(paramStore.id, myUid));
    openStoreConversation({ store: paramStore, user, shopperName: shopperNameOf(account, user) })
      .catch((e) => toast(e.message || 'Couldn’t open chat', 'fa-triangle-exclamation'));
  }, [paramStore?.id, myUid]);

  const list = convos || [];
  // Fall back to a synthesized thread for a just-opened store not yet in the snapshot.
  const selConv = list.find((c) => c.id === sel)
    || (paramStore && sel === conversationId(paramStore.id, myUid)
      ? { id: sel, participants: [myUid, paramStore.ownerId], info: {
          [paramStore.ownerId]: { name: paramStore.name, role: 'merchant', icon: paramStore.icon, tint: paramStore.tint, img: paramStore.img },
        }, unread: {} }
      : list[0] || null);

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Messages</h1>
      <div className="ym-card msg-grid" style={{ display:'grid', gridTemplateColumns:'320px 1fr', overflow:'hidden', height:560 }}>
        <div style={{ borderRight:'1px solid var(--m-border)', overflowY:'auto' }}>
          <button onClick={()=>nav('ai')} style={{ width:'100%', textAlign:'left', border:'none', cursor:'pointer', fontFamily:'inherit', padding:14, display:'flex', alignItems:'center', gap:12, background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-wand-magic-sparkles" style={{ color:'#fff', fontSize:18 }} /></div>
            <div style={{ flex:1, minWidth:0 }}><div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>YoteAI Assistant</div><div style={{ color:'rgba(255,255,255,.85)', fontSize:12 }}>Find products & best deals</div></div>
            <span style={{ background:'rgba(255,255,255,.18)', color:'#fff', fontSize:10.5, fontWeight:700, padding:'4px 9px', borderRadius:9999 }}>AI</span>
          </button>
          {convos === null && <div style={{ padding:'22px 16px', color:'var(--m-fg3)', fontSize:13.5 }}>Loading your chats…</div>}
          {convos !== null && list.length === 0 && (
            <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>
              <FA i="fa-comments" style={{ fontSize:30, color:'var(--m-fg4)', marginBottom:12, display:'block' }} />
              No messages yet. Tap “Chat with seller” on any store to start a conversation.
            </div>
          )}
          {list.map((c) => {
            const otherId = otherParticipant(c, myUid);
            const info = (c.info && c.info[otherId]) || {};
            const unread = (c.unread && c.unread[myUid]) || 0;
            return (
              <button key={c.id} onClick={()=>setSel(c.id)} style={{ width:'100%', textAlign:'left', border:'none', borderBottom:'1px solid var(--m-border)', cursor:'pointer', fontFamily:'inherit', padding:'13px 14px', display:'flex', alignItems:'center', gap:12, background: sel===c.id?'var(--m-surface-3)':'transparent' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <Thumb icon={info.icon || 'fa-store'} tint={info.tint || '#4f46e5'} size={46} radius={9999} img={info.img} />
                  {unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>{unread}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><span className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{info.name || 'Store'}</span><span className="ym-cap" style={{ flexShrink:0 }}>{fmtWhen(c.updatedAt)}</span></div>
                  <div className="ym-sub" style={{ fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:unread?'var(--m-fg1)':'var(--m-fg3)', fontWeight:unread?600:400 }}>{c.lastMessage || 'Say hello 👋'}</div>
                </div>
              </button>
            );
          })}
        </div>
        {selConv
          ? <LiveChatThread key={selConv.id} conv={selConv} user={user} />
          : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--m-fg3)', fontSize:14, padding:24, textAlign:'center' }}>Select a conversation to start chatting.</div>}
      </div>
      <style>{`@media (max-width:640px){ .msg-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function LiveChatThread({ conv, user }){
  const { toast } = useYM();
  const myUid = user.uid;
  const otherId = otherParticipant(conv, myUid);
  const info = (conv.info && conv.info[otherId]) || {};
  const blocked = conv.status === 'blocked';
  const [msgs, setMsgs] = useSE([]);
  const [draft, setDraft] = useSE('');
  const scrollRef = useRefE(null);

  useEffE(() => subscribeMessages(conv.id, setMsgs), [conv.id]);
  // Clear my unread badge whenever I'm viewing the thread and new messages land.
  useEffE(() => { markConversationRead(conv.id, myUid); }, [conv.id, msgs.length]);
  useEffE(() => { const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; }, [msgs]);

  const send = (text) => {
    const t=(text||draft).trim(); if(!t) return;
    if (blocked) { toast('This conversation is closed.', 'fa-ban'); return; }
    setDraft('');
    sendChatMessage({ convId: conv.id, user, text: t, recipientUid: otherId })
      .catch(() => toast('Message failed to send', 'fa-triangle-exclamation'));
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--m-border)' }}>
        <Thumb icon={info.icon || 'fa-store'} tint={info.tint || '#4f46e5'} size={42} radius={9999} img={info.img} />
        <div style={{ flex:1, minWidth:0 }}>
          <div className="ym-h3">{info.name || 'Store'}</div>
          <div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'var(--m-success)' }} /> {blocked ? 'Conversation closed' : 'Usually replies quickly'}</div>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
        {msgs.length===0 && <div style={{ margin:'auto', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5, maxWidth:260 }}>This is the start of your conversation with {info.name || 'this store'}. Ask about price, stock or delivery.</div>}
        {msgs.map((m) => {
          const mine = m.senderId === myUid;
          return (
            <div key={m.id} style={{ maxWidth:'72%', padding:'10px 14px', fontSize:14, lineHeight:1.45,
              alignSelf: mine?'flex-end':'flex-start',
              background: mine?'var(--m-primary-deep)':'var(--m-surface)', color: mine?'#fff':'var(--m-fg1)',
              borderRadius: mine?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>
              {m.text}<div style={{ fontSize:10, opacity:.65, marginTop:4, textAlign:'right' }}>{fmtTime(m.at)}</div>
            </div>
          );
        })}
      </div>
      {msgs.length===0 && !blocked && (
        <div className="scroll-x" style={{ gap:8, padding:'10px 18px 0' }}>
          {QUICK_CHIPS.map(c=><button key={c} className="ym-chip ym-btn-sm" style={{ height:34, flexShrink:0, fontSize:13 }} onClick={()=>send(c)}>{c}</button>)}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderTop:'1px solid var(--m-border)' }}>
        <input className="ym-input" placeholder={blocked ? 'Conversation closed' : 'Message…'} aria-label="Message" disabled={blocked} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ height:46, borderRadius:9999, background:'var(--m-surface-2)', border:'none', opacity:blocked?.6:1 }} />
        <button onClick={()=>send()} disabled={blocked} className="icon-btn" aria-label="Send" style={{ background:'var(--m-primary-deep)', color:'#fff', opacity:blocked?.6:1 }}><FA i="fa-paper-plane" /></button>
      </div>
    </div>
  );
}

/* ---------- YOTE AI ---------- */
export function AIScreen(){
  const { reset } = useYM();
  const { user } = useAuth();
  const stores = YM_STORES.map(s=>`${s.name} (${s.area}, ${s.tagline})`).join('; ');
  const prods = YM_PRODUCTS.slice(0,10).map(p=>`${p.name} — ${ymPrice(p.price)} at ${ymStore(p.store).name}`).join('; ');
  const primer = `You are YoteAI, the friendly shopping assistant inside the YoteMarket web storefront — a Kenyan virtual mall where merchants run storefronts and orders are collected from nearby pickup hubs. Prices are in Kenyan Shillings (Ksh). Help the shopper discover STORES first, then products, compare options and find the best deals. Be concise and warm (2-4 sentences), a little Swahili/Sheng is welcome. Stores in the mall: ${stores}. Some products: ${prods}.`;
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
        const { reply } = await aiChat({ messages: next.map(m=>({ role:m.role, content:m.content })), system: primer });
        setMsgs(m=>[...m,{role:'assistant',content:(reply||'').trim()||localAiReply(t)}]);
      }
    }catch(e){ setMsgs(m=>[...m,{role:'assistant',content:localAiReply(t)}]); }
    finally{ setBusy(false); }
  };

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40, maxWidth:760, margin:'0 auto' }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>
      <div className="ym-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', height:600 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-wand-magic-sparkles" style={{ color:'#fff', fontSize:17 }} /></div>
          <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>YoteAI</div><div style={{ color:'rgba(255,255,255,.82)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'#6ee7b7' }} /> Shopping assistant</div></div>
        </div>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ maxWidth:'80%', padding:'11px 15px', fontSize:14.5, lineHeight:1.5, whiteSpace:'pre-wrap',
              alignSelf:m.role==='user'?'flex-end':'flex-start', background:m.role==='user'?'var(--m-primary-deep)':'var(--m-surface)',
              color:m.role==='user'?'#fff':'var(--m-fg1)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.content}</div>
          ))}
          {busy && <div style={{ alignSelf:'flex-start', padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', gap:5 }}>{[0,1,2].map(d=><span key={d} style={{ width:7, height:7, borderRadius:9999, background:'var(--m-fg4)', animation:`ym-fade 1s ease ${d*0.18}s infinite alternate` }} />)}</div>}
        </div>
        {msgs.length<=1 && (
          <div style={{ padding:'0 20px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
            {suggestions.map(s=><button key={s} onClick={()=>send(s)} style={{ border:'1px solid var(--m-border)', background:'var(--m-surface)', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--m-fg2)', borderRadius:12, padding:'9px 13px', display:'flex', alignItems:'center', gap:8 }}><FA i="fa-wand-magic-sparkles" style={{ color:'var(--m-primary)', fontSize:12 }} /> {s}</button>)}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderTop:'1px solid var(--m-border)' }}>
          <input className="ym-input" placeholder="Ask YoteAI…" aria-label="Ask YoteAI" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ height:48, borderRadius:9999, background:'var(--m-surface-2)', border:'none' }} />
          <button onClick={()=>send()} disabled={busy} className="icon-btn" aria-label="Send" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)', opacity:busy?.6:1 }}><FA i="fa-paper-plane" /></button>
        </div>
      </div>
    </div>
  );
}
