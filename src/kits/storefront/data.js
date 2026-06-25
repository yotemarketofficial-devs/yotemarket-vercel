/* data.js — Storefront content (Ksh pricing, Kenyan stores). Exported as live ESM
   bindings so real Firestore catalog data can replace the demo arrays at runtime
   via applyCatalog(); consumers pick up the new data on their next render. */

import { CATEGORY_CHIPS } from './categories.js';

const UIMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

// Category chips come from the single taxonomy source (categories.js) so the chip
// row always matches the "All categories" mega-menu.
export let YM_CATEGORIES = CATEGORY_CHIPS;

export let YM_STORES = [
  { id:'s1', name:'Wanjiku Electronics', area:'Nairobi CBD', rating:4.8, reviews:642, products:124, followers:3120, responds:'~10 min', since:'2022', isHub:true, verified:true, tint:'#3b82f6', icon:'fa-store', tagline:'Phones, accessories & repairs', img:UIMG('1441986300917-64674bd600d8') },
  { id:'s2', name:'Mama Njeri Fresh', area:'Westlands', rating:4.9, reviews:980, products:86, followers:5400, responds:'~5 min', since:'2021', isHub:true, verified:true, tint:'#10b981', icon:'fa-leaf', tagline:'Farm-fresh produce, delivered same day', img:UIMG('1488459716781-31db52582fe9') },
  { id:'s3', name:'Kipenzi Fashion House', area:'Kilimani', rating:4.6, reviews:415, products:210, followers:8900, responds:'~15 min', since:'2020', isHub:false, verified:true, tint:'#a020f0', icon:'fa-shirt', tagline:'Ankara, official wear & streetwear', img:UIMG('1567401893414-76b7b1e5a7a5') },
  { id:'s4', name:'Simba Home Decor', area:'Karen', rating:4.7, reviews:188, products:58, followers:1740, responds:'~30 min', since:'2023', isHub:false, verified:false, tint:'#f59e0b', icon:'fa-couch', tagline:'Handmade furniture & decor', img:UIMG('1513519245088-0e12902e35ca') },
  { id:'s5', name:'Zuri Beauty Hub', area:'Thika Road', rating:4.5, reviews:523, products:97, followers:4260, responds:'~8 min', since:'2022', isHub:true, verified:true, tint:'#ec4899', icon:'fa-spa', tagline:'Skincare, braids & cosmetics', img:UIMG('1522335789203-aabd1fc54bc9') },
];

export let YM_PRODUCTS = [
  { id:'p1', name:'Samsung Galaxy A15 128GB', price:18500, was:21000, store:'s1', cat:'electronics', rating:4.7, reviews:132, stock:true, icon:'fa-mobile-screen-button', img:UIMG('1610945265064-0e34e5519bbf'), desc:'Brand new, sealed. 128GB storage, 6GB RAM, 50MP camera. 2-year warranty included. Free hub delivery within Nairobi.' },
  { id:'p2', name:'Wireless Earbuds Pro', price:2450, was:3200, store:'s1', cat:'electronics', rating:4.4, reviews:89, stock:true, icon:'fa-headphones', img:UIMG('1606220588913-b3aacb4d2f46'), desc:'Bluetooth 5.3, noise cancellation, 30-hour battery with charging case. Available in black and white.' },
  { id:'p3', name:'Fresh Avocados (6 pack)', price:350, store:'s2', cat:'groceries', rating:4.9, reviews:240, stock:true, icon:'fa-seedling', img:UIMG('1523049673857-eb18f1d7b578'), desc:'Hass avocados straight from Murang’a. Picked this morning, ripe in 2–3 days. Same-day delivery to your hub.' },
  { id:'p4', name:'Managu & Terere Bundle', price:180, store:'s2', cat:'groceries', rating:4.8, reviews:156, stock:true, icon:'fa-leaf', img:UIMG('1540420773420-3366772f4999'), desc:'Fresh indigenous greens, washed and bundled. Perfect for the week’s meals.' },
  { id:'p5', name:'Ankara Shift Dress', price:3200, was:4000, store:'s3', cat:'fashion', rating:4.6, reviews:64, stock:true, icon:'fa-shirt', img:UIMG('1595777457583-95e059d581b8'), desc:'Tailored Ankara shift dress, sizes 8–18. Custom fitting available — chat with us in-app.' },
  { id:'p6', name:'Men’s Official Leather Shoes', price:4500, store:'s3', cat:'fashion', rating:4.3, reviews:41, stock:false, icon:'fa-shoe-prints', img:UIMG('1614252369475-531eba835eb1'), desc:'Genuine leather oxford shoes, sizes 39–45. Restocking next week — pre-order via chat.' },
  { id:'p7', name:'Handwoven Sisal Basket Set', price:2800, store:'s4', cat:'home', rating:4.8, reviews:73, stock:true, icon:'fa-basket-shopping', img:UIMG('1622372738946-62e02505feb3'), desc:'Set of 3 nesting kiondo baskets, handwoven in Machakos. Each piece is unique.' },
  { id:'p8', name:'Mahogany Coffee Table', price:15500, store:'s4', cat:'home', rating:4.9, reviews:28, stock:true, icon:'fa-table', img:UIMG('1538688525198-9b88f6f53126'), desc:'Solid mahogany, hand-finished. 120cm × 60cm. Hub delivery within Nairobi included.' },
  { id:'p9', name:'Shea Butter Hair Cream 500ml', price:850, was:1100, store:'s5', cat:'beauty', rating:4.7, reviews:188, stock:true, icon:'fa-jar', img:UIMG('1620916566398-39f1143ab7be'), desc:'Raw shea butter blend for natural hair. No sulphates, no parabens.' },
  { id:'p10', name:'Knee-High Kids Gumboots', price:650, store:'s2', cat:'kids', rating:4.5, reviews:52, stock:true, icon:'fa-cloud-rain', img:UIMG('1518131672697-613becd4fab5'), desc:'Rainy-season ready. Sizes 24–34, assorted colours.' },
  { id:'p11', name:'Bluetooth Party Speaker', price:5600, was:6900, store:'s1', cat:'electronics', rating:4.6, reviews:77, stock:true, icon:'fa-volume-high', img:UIMG('1589003077984-894e133dabab'), desc:'40W output, RGB lights, 12-hour battery. Bring the vibe anywhere.' },
  { id:'p12', name:'Kitenge Tote Bag', price:1200, store:'s3', cat:'fashion', rating:4.7, reviews:35, stock:true, icon:'fa-bag-shopping', img:UIMG('1597484661643-2f5fef640dd1'), desc:'Handmade kitenge tote with inner lining. Bold prints, sturdy straps.' },
];

export let YM_ORDERS = [
  { id:'YM-58213', items:[{pid:'p3',qty:2},{pid:'p4',qty:1}], total:880, status:'out', placed:'Today, 10:24 AM', store:'s2', eta:'25 min', rider:'Brian O.', hub:'Westlands Hub · Mpaka Road', steps:['Order placed','Confirmed by store','Rider picked up','En route to your hub','Ready for pickup'], step:3 },
  { id:'YM-58220', items:[{pid:'p5',qty:1}], total:3200, status:'awaiting', placed:'Today, 11:48 AM', store:'s3', hub:'Westlands Hub · Mpaka Road', steps:['Order placed','Confirmed by store','Rider picked up','En route to your hub','Ready for pickup'], step:1 },
  { id:'YM-58102', items:[{pid:'p9',qty:1}], total:850, status:'delivered', placed:'Yesterday, 3:12 PM', store:'s5', hub:'Westlands Hub · Mpaka Road', steps:['Order placed','Confirmed by store','Rider picked up','En route to your hub','Collected'], step:4 },
];

export let YM_USER = { name:'Wanjiru Kamau', first:'Wanjiru', email:'wanjiru.k@gmail.com', phone:'0720 730 861', hub:'Westlands Hub · Mpaka Road', initials:'WK' };

/* ---- account dashboard data ---- */
export let YM_POINTS = { balance:640, lifetime:1840, tier:'Silver', next:'Gold', toNext:1160, earnRate:100 };
export let YM_WALLET = {
  balance:1240,
  tx:[
    { t:'Referral bonus — Amina joined', amt:200, dir:'in', when:'Today', icon:'fa-user-plus' },
    { t:'Cashback — order YM-58102', amt:40, dir:'in', when:'Yesterday', icon:'fa-percent' },
    { t:'Paid order YM-58213', amt:880, dir:'out', when:'Today', icon:'fa-cart-shopping' },
    { t:'Referral bonus — Kevin joined', amt:200, dir:'in', when:'Mon, 1 Jun', icon:'fa-user-plus' },
  ],
};
export let YM_ADDRESSES = [
  { id:'a1', label:'Westlands Hub', icon:'fa-warehouse', line:'Mpaka Road', detail:'Near Sarit Centre · pickup hub', default:true },
  { id:'a2', label:'Home', icon:'fa-house', line:'Kileleshwa, Oloitoktok Rd', detail:'Apt 4B', default:false },
  { id:'a3', label:'Office', icon:'fa-building', line:'Upper Hill, Britam Tower', detail:'12th floor reception', default:false },
];

export function ymPrice(n){ return 'Ksh ' + Number(n || 0).toLocaleString('en-KE'); }
export function ymProduct(id){ return YM_PRODUCTS.find((p) => p.id === id); }
export function ymStore(id){ return YM_STORES.find((s) => s.id === id); }
export function ymCat(id){ return YM_CATEGORIES.find((c) => c.id === id); }

/* Swap demo arrays for real Firestore data. ESM live bindings mean any component
   that re-renders after this runs will read the real catalog. */
export function applyCatalog({ stores, products } = {}){
  // The category taxonomy is owned by categories.js (canonical CATEGORY_TREE);
  // only swap live stores + products so the chips/mega-menu stay aligned.
  if (stores?.length) YM_STORES = stores;
  if (products?.length) YM_PRODUCTS = products;
}
export function applyUser(u){ if (u) YM_USER = { ...YM_USER, ...u }; }
export function applyOrders(orders){ if (Array.isArray(orders) && orders.length) YM_ORDERS = orders; }
