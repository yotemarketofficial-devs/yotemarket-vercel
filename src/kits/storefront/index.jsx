/* index.jsx — Storefront shell: context, theme, in-app router.
   Open to guests — the mall renders for everyone; signing in is optional and only
   required to check out. Native React port wired to Firebase auth + catalog. */
import React from 'react';
import './storefront.css';
import { YMContext, Toast } from './ui.jsx';
import { Auth } from './auth.jsx';
import { Header, Footer, CartDrawer } from './chrome.jsx';
import { HomeScreen, SearchScreen, ProductScreen, StoreScreen } from './screens.jsx';
import { CheckoutScreen, OrdersScreen } from './commerce.jsx';
import { MessagesScreen, AIScreen } from './engage.jsx';
import { ProfileScreen } from './profile.jsx';
import { FollowingScreen } from './following.jsx';
import { FeedScreen } from './feed.jsx';
import { applyCatalog } from './data.js';
import { useCatalogSync, subscribeUserOrders } from '../../lib/catalog.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useChatPush } from '../../lib/push.js';
const { useState, useEffect, useRef } = React;

const SCREENS = { home:HomeScreen, search:SearchScreen, product:ProductScreen, store:StoreScreen, feed:FeedScreen, following:FollowingScreen, checkout:CheckoutScreen, orders:OrdersScreen, messages:MessagesScreen, ai:AIScreen, profile:ProfileScreen };

const initialsFrom = (s) => (s || 'A').split(/[ @._-]/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** The screen a real URL points at: /store/:sid or /product/:pid → null otherwise. */
export function screenFromPath(pathname) {
  let m = /^\/store\/([^/?#]+)/.exec(pathname || '');
  if (m) return { screen: 'store', params: { sid: decodeURIComponent(m[1]) } };
  m = /^\/product\/([^/?#]+)/.exec(pathname || '');
  if (m) return { screen: 'product', params: { pid: decodeURIComponent(m[1]) } };
  return null;
}

/** The URL a screen lives at, or null for screens that have no public address
 *  (cart, checkout, orders, messages — nothing a crawler or a shared link wants). */
function pathForScreen(screen, params) {
  if (screen === 'store' && params?.sid) return `/store/${encodeURIComponent(params.sid)}`;
  if (screen === 'product' && params?.pid) return `/product/${encodeURIComponent(params.pid)}`;
  return null;
}

export default function StorefrontApp(){
  const { user, hasAccount, signOutUser } = useAuth();
  const [theme, setThemeS] = useState(() => localStorage.getItem('ym_store_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  // Real routes: /store/:sid and /product/:pid. Until these existed the catalogue
  // had no URLs at all — browsing never left /storefront — so no store or product
  // could be linked, shared, put in a sitemap or indexed by Google. The whole
  // inventory was invisible to search. See [[seo]].
  // The legacy ?store=/?product= query links (merchant dashboard, YoteMarket
  // Insight, anything already sent out) still open the same screens.
  const [stack, setStack] = useState(() => {
    const home = { screen: 'home', params: {} };
    try {
      const target = screenFromPath(window.location.pathname);
      if (target) return [home, target];
      const q = new URLSearchParams(window.location.search);
      const sid = q.get('store'); const pid = q.get('product');
      if (sid) return [home, { screen: 'store', params: { sid } }];
      if (pid) return [home, { screen: 'product', params: { pid } }];
    } catch { /* no-op */ }
    return [home];
  });
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('ym_cart'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem('ym_cart', JSON.stringify(cart)); } catch { /* ignore */ } }, [cart]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastState, setToast] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const toastTimer = useRef(null);
  const pendingRef = useRef(null);

  // Pull real Firestore catalog (no-op in demo mode); re-renders this tree when it lands.
  useCatalogSync(applyCatalog);

  // Live orders for the signed-in shopper (null = demo/guest → bundled sample orders).
  const [liveOrders, setLiveOrders] = useState(null);
  useEffect(() => {
    if (!hasAccount || !user?.uid) { setLiveOrders(null); return undefined; }
    return subscribeUserOrders(user.uid, setLiveOrders);
  }, [user?.uid, hasAccount]);

  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ym_store_theme', theme); }, [theme]);
  useEffect(()=>()=>clearTimeout(toastTimer.current), []);
  const setTheme = (t)=> setThemeS(t);

  const top = stack[stack.length-1];
  // Keep the address bar on the screen you're actually looking at, so a product
  // can be copied, shared and re-opened. replaceState (not pushState) on purpose:
  // it doesn't invent history entries, so the browser Back button keeps behaving
  // exactly as it did before real routes existed. Screens with no public address
  // (cart, checkout, orders) fall back to /storefront.
  useEffect(() => {
    const top = stack[stack.length - 1];
    if (!top) return;
    const url = pathForScreen(top.screen, top.params) || '/storefront';
    if (window.location.pathname !== url) {
      try { window.history.replaceState(null, '', url + window.location.hash); } catch { /* no-op */ }
    }
  }, [stack]);

  const nav = (screen, params={}) => { setStack(s=>[...s,{screen,params}]); window.scrollTo(0,0); };
  const back = () => setStack(s=> s.length>1 ? s.slice(0,-1) : s);

  const toast = (msg, icon) => { clearTimeout(toastTimer.current); setToast({ msg, icon, key:Date.now() }); toastTimer.current = setTimeout(()=>setToast(null), 2200); };

  // Register this browser for chat/order push; show foreground messages as a toast.
  useChatPush(user, (payload) => {
    const t = payload?.notification?.title; const b = payload?.notification?.body;
    toast(t ? (b ? `${t}: ${b}` : t) : 'New message', 'fa-comment-dots');
  });
  const addToCart = (pid, qty=1) => { setCart(c=>{ const ex=c.find(x=>x.pid===pid); return ex? c.map(x=>x.pid===pid?{...x,qty:x.qty+qty}:x):[...c,{pid,qty}]; }); toast('Added to cart','fa-cart-plus'); };
  const setCartQty = (pid,qty)=> setCart(c=>c.map(x=>x.pid===pid?{...x,qty}:x));
  const removeFromCart = (pid)=> setCart(c=>c.filter(x=>x.pid!==pid));
  const clearCart = ()=> setCart([]);
  const cartCount = cart.reduce((n,c)=>n+c.qty,0);

  // ── auth (optional; required only to check out) ──
  const openAuth = () => setShowAuth(true);
  const closeAuth = () => { setShowAuth(false); pendingRef.current = null; };
  // run cb immediately if signed in, else open the sign-in overlay and run it on success
  const requireAuth = (cb) => { if (hasAccount) { cb && cb(); } else { pendingRef.current = cb || null; setShowAuth(true); } };
  const onAuthedReal = () => { setShowAuth(false); const cb = pendingRef.current; pendingRef.current = null; if (cb) cb(); };
  const doSignOut = async () => { await signOutUser(); setStack([{ screen:'home', params:{} }]); window.scrollTo(0,0); toast('Signed out','fa-arrow-right-from-bracket'); };

  const reset = (screen, params={}) => {
    if (screen==='auth') { doSignOut(); return; }
    setStack([{ screen, params }]); window.scrollTo(0,0);
  };

  const account = {
    hasAccount,
    name: hasAccount ? (user.displayName || (user.email ? user.email.split('@')[0] : 'Account')) : 'Guest',
    first: hasAccount ? (user.displayName ? user.displayName.split(' ')[0] : 'Account') : 'Guest',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    photo: user?.photoURL || null,
    initials: hasAccount ? initialsFrom(user.displayName || user.email || 'A') : 'G',
  };

  const ctx = { nav, back, reset, theme, setTheme, cart, cartCount, addToCart, setCartQty, removeFromCart, clearCart,
    cartOpen, openCart:()=>setCartOpen(true), closeCart:()=>setCartOpen(false), toast,
    account, openAuth, requireAuth, signOut: doSignOut, liveOrders };

  // YoteAI floats as a glass overlay over the page you were on — so render the
  // underlying (previous) screen as the base and paint AIScreen on top; its
  // backdrop-blur then frosts the real storefront behind it.
  const aiOpen = top.screen === 'ai';
  const baseEntry = aiOpen ? (stack[stack.length - 2] || { screen: 'home', params: {} }) : top;
  const Screen = SCREENS[baseEntry.screen] || HomeScreen;
  // YoteFeed runs edge-to-edge (immersive full-screen shortform): hide the site chrome and pin
  // the shell to the viewport so the feed fills the screen with its own overlay bar.
  const immersive = baseEntry.screen === 'feed';
  return (
    <YMContext.Provider value={ctx}>
      <div data-screen-label={'Storefront — '+top.screen} style={immersive
        ? { height:'100dvh', overflow:'hidden', display:'flex', flexDirection:'column' }
        : { minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        {!immersive && <Header />}
        <main key={(aiOpen ? stack.length - 1 : stack.length) + baseEntry.screen} style={{ flex:1, ...(immersive ? { minHeight:0 } : {}) }}><Screen params={baseEntry.params} /></main>
        {!immersive && <Footer />}
        {aiOpen && <AIScreen />}
        <CartDrawer />
        <Toast toast={toastState} />
        {showAuth && (
          <Auth overlay onShopper={onAuthedReal} onGuest={closeAuth} onClose={closeAuth}
            theme={theme} onTheme={()=>setTheme(theme==='dark'?'light':'dark')} />
        )}
      </div>
    </YMContext.Provider>
  );
}
