/* index.jsx — Storefront shell: context, theme, in-app router with auth gate.
   Native React port of the design prototype, wired to Firebase auth + catalog. */
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
import { useCatalogSync } from '../../lib/catalog.js';
import { useAuth } from '../../lib/useAuth.jsx';
const { useState, useEffect, useRef } = React;

const SCREENS = { home:HomeScreen, search:SearchScreen, product:ProductScreen, store:StoreScreen, checkout:CheckoutScreen, orders:OrdersScreen, messages:MessagesScreen, ai:AIScreen, profile:ProfileScreen };

export default function StorefrontApp(){
  const { user, signOutUser } = useAuth();
  const [theme, setThemeS] = useState(() => localStorage.getItem('ym_store_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  const [authed, setAuthed] = useState(Boolean(user));
  const [stack, setStack] = useState([{ screen:'home', params:{} }]);
  const [cart, setCart] = useState([{ pid:'p3', qty:2 }]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastState, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Pull real Firestore catalog (no-op in demo mode); re-renders this tree when it lands.
  useCatalogSync(applyCatalog);

  // Honour an existing Firebase session: skip the auth gate when already signed in.
  useEffect(()=>{ if(user) setAuthed(true); }, [user]);
  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ym_store_theme', theme); }, [theme]);
  useEffect(()=>()=>clearTimeout(toastTimer.current), []);
  const setTheme = (t)=> setThemeS(t);

  const top = stack[stack.length-1];
  const nav = (screen, params={}) => { setStack(s=>[...s,{screen,params}]); window.scrollTo(0,0); };
  const back = () => setStack(s=> s.length>1 ? s.slice(0,-1) : s);
  const reset = (screen, params={}) => {
    if(screen==='auth'){ signOutUser(); setAuthed(false); setStack([{screen:'home',params:{}}]); return; }
    setStack([{screen,params}]); window.scrollTo(0,0);
  };

  const toast = (msg, icon) => { clearTimeout(toastTimer.current); setToast({ msg, icon, key:Date.now() }); toastTimer.current = setTimeout(()=>setToast(null), 2200); };
  const addToCart = (pid, qty=1) => { setCart(c=>{ const ex=c.find(x=>x.pid===pid); return ex? c.map(x=>x.pid===pid?{...x,qty:x.qty+qty}:x):[...c,{pid,qty}]; }); toast('Added to cart','fa-cart-plus'); };
  const setCartQty = (pid,qty)=> setCart(c=>c.map(x=>x.pid===pid?{...x,qty}:x));
  const removeFromCart = (pid)=> setCart(c=>c.filter(x=>x.pid!==pid));
  const clearCart = ()=> setCart([]);
  const cartCount = cart.reduce((n,c)=>n+c.qty,0);

  const ctx = { nav, back, reset, theme, setTheme, cart, cartCount, addToCart, setCartQty, removeFromCart, clearCart,
    cartOpen, openCart:()=>setCartOpen(true), closeCart:()=>setCartOpen(false), toast };

  if(!authed) return (
    <YMContext.Provider value={ctx}>
      <Auth onShopper={()=>setAuthed(true)} theme={theme} onTheme={()=>setTheme(theme==='dark'?'light':'dark')} />
    </YMContext.Provider>
  );

  const Screen = SCREENS[top.screen] || HomeScreen;
  return (
    <YMContext.Provider value={ctx}>
      <div data-screen-label={'Storefront — '+top.screen} style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        <Header />
        <main key={stack.length+top.screen} style={{ flex:1 }}><Screen params={top.params} /></main>
        <Footer />
        <CartDrawer />
        <Toast toast={toastState} />
      </div>
    </YMContext.Provider>
  );
}
