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
import { applyCatalog } from './data.js';
import { useCatalogSync, subscribeUserOrders } from '../../lib/catalog.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useChatPush } from '../../lib/push.js';
const { useState, useEffect, useRef } = React;

const SCREENS = { home:HomeScreen, search:SearchScreen, product:ProductScreen, store:StoreScreen, checkout:CheckoutScreen, orders:OrdersScreen, messages:MessagesScreen, ai:AIScreen, profile:ProfileScreen };

const initialsFrom = (s) => (s || 'A').split(/[ @._-]/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function StorefrontApp(){
  const { user, hasAccount, signOutUser } = useAuth();
  const [theme, setThemeS] = useState(() => localStorage.getItem('ym_store_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  // Deep-link support: /storefront?store=<id> or ?product=<id> (e.g. links from
  // the merchant dashboard's YoteMarket Insight) open straight onto that screen.
  const [stack, setStack] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const sid = q.get('store'); const pid = q.get('product');
      if (sid) return [{ screen:'home', params:{} }, { screen:'store', params:{ sid } }];
      if (pid) return [{ screen:'home', params:{} }, { screen:'product', params:{ pid } }];
    } catch { /* no-op */ }
    return [{ screen:'home', params:{} }];
  });
  const [cart, setCart] = useState([{ pid:'p3', qty:2 }]);
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
    initials: hasAccount ? initialsFrom(user.displayName || user.email || 'A') : 'G',
  };

  const ctx = { nav, back, reset, theme, setTheme, cart, cartCount, addToCart, setCartQty, removeFromCart, clearCart,
    cartOpen, openCart:()=>setCartOpen(true), closeCart:()=>setCartOpen(false), toast,
    account, openAuth, requireAuth, signOut: doSignOut, liveOrders };

  const Screen = SCREENS[top.screen] || HomeScreen;
  return (
    <YMContext.Provider value={ctx}>
      <div data-screen-label={'Storefront — '+top.screen} style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        <Header />
        <main key={stack.length+top.screen} style={{ flex:1 }}><Screen params={top.params} /></main>
        <Footer />
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
