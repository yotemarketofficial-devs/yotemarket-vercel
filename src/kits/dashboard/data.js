/* data.js — Merchant dashboard content (Ksh). Aligned with the YoteMarket app. */

export const SHOP = { name:'Tamasha Electronics', owner:'Mwangi Karanja', first:'Mwangi', role:'Merchant', shopId:'tamasha-electronics', area:'Nairobi CBD', plan:'Growth', photo:'/assets/avatars/avatar-1.png', initials:'MK' };

export const PROD_ROWS = [
  { id:'p1', name:'Samsung Galaxy A05', cat:'Phones', price:12250, was:14360, stock:14, status:'active', sales:42, icon:'fa-mobile-screen-button', tint:'#3b82f6' },
  { id:'p2', name:'Wireless Bluetooth Headphones', cat:'Audio', price:3500, stock:32, status:'active', sales:88, icon:'fa-headphones', tint:'#a020f0' },
  { id:'p3', name:'Vintage Leather Jacket', cat:'Fashion', price:6500, stock:5, status:'active', sales:17, icon:'fa-shirt', tint:'#f59e0b' },
  { id:'p4', name:'Premium Coffee Beans 500g', cat:'Grocery', price:1200, stock:0, status:'inactive', sales:312, icon:'fa-mug-hot', tint:'#b45309' },
  { id:'p5', name:'Smart LED Ring Light', cat:'Photo', price:2200, stock:8, status:'pending', sales:6, icon:'fa-lightbulb', tint:'#ec4899' },
  { id:'p6', name:'USB-C Fast Charger 25W', cat:'Electronics', price:1450, stock:54, status:'active', sales:121, icon:'fa-bolt', tint:'#10b981' },
];

export const ORDER_ROWS = [
  { id:'YM-8421', buyer:'James Mwangi', avatar:'avatar-1.png', items:'Galaxy A05 ×1', total:12250, status:'active', date:'Today, 14:22', hub:'Westlands' },
  { id:'YM-8420', buyer:'Aisha Kamau', avatar:'avatar-3.png', items:'Coffee Beans ×3', total:3600, status:'active', date:'Today, 13:01', hub:'Karen' },
  { id:'YM-8419', buyer:'Peter Onyango', avatar:'avatar-2.png', items:'Ring Light + Headphones', total:5700, status:'pending', date:'Today, 09:45', hub:'CBD' },
  { id:'YM-8418', buyer:'Grace Wanjiru', avatar:'avatar-4.png', items:'Leather Jacket ×1', total:6500, status:'active', date:'Yesterday', hub:'Westlands' },
  { id:'YM-8417', buyer:'Brian Otieno', avatar:'avatar-1.png', items:'Headphones ×2', total:7000, status:'inactive', date:'2 days ago', hub:'CBD' },
];

export const KPIS = [
  { label:'Total orders', value:'248', delta:'+14', up:true, icon:'fa-bag-shopping', tone:'#3b82f6' },
  { label:'Pending', value:'12', delta:'+3', up:true, icon:'fa-clock', tone:'#f59e0b' },
  { label:'Completed', value:'231', delta:'+12', up:true, icon:'fa-circle-check', tone:'#10b981' },
  { label:'Revenue', value:'Ksh 348K', delta:'+18%', up:true, icon:'fa-coins', tone:'#7c3aed' },
];

export const WEEK = [{l:'Mon',v:12},{l:'Tue',v:18},{l:'Wed',v:14},{l:'Thu',v:22},{l:'Fri',v:28},{l:'Sat',v:31},{l:'Sun',v:26}];

export const WALLET = {
  balance:48350, nextPayout:'Friday',
  flow:[
    { label:'Product sales', value:58400, color:'#7c3aed' },
    { label:'Delivery', value:9200, color:'#22d3ee' },
    { label:'Subscription', value:3000, color:'#f59e0b', neg:true },
  ],
  tx:[
    { t:'Sale — Galaxy A05', amt:12250, dir:'in', when:'Today', icon:'fa-bag-shopping' },
    { t:'Sale — Headphones ×2', amt:7000, dir:'in', when:'Today', icon:'fa-bag-shopping' },
    { t:'Subscription — June', amt:3000, dir:'out', when:'Mon, 1 Jun', icon:'fa-credit-card' },
    { t:'Payout to M-Pesa', amt:22000, dir:'out', when:'Fri, 29 May', icon:'fa-mobile-screen' },
    { t:'Sale — Leather Jacket', amt:6500, dir:'in', when:'Yesterday', icon:'fa-bag-shopping' },
  ],
};

export const SUBSCRIPTION = { plan:'Growth', price:3000, band:'A · Urban', deliveriesUsed:18, deliveriesCap:20, next:'14 Jul 2026',
  tiers:[
    { name:'Starter', price:1500, deliveries:10, features:['Branded storefront','10 bundled deliveries/mo','M-Pesa checkout'] },
    { name:'Growth', price:3000, deliveries:20, features:['Everything in Starter','20 bundled deliveries/mo','Demand insights','Priority support'], current:true },
    { name:'Pro', price:4200, deliveries:30, features:['Everything in Growth','30 bundled deliveries/mo','Featured placement','Pickup hub eligibility'] },
  ],
};

export const CHATS = [
  { id:'c1', name:'Faith K.', avatar:'avatar-3.png', last:'Is the Ankara dress available in size 12?', when:'2m', unread:2 },
  { id:'c2', name:'Otieno M.', avatar:'avatar-2.png', last:'Asante! I’ll collect from the hub by 5.', when:'1h', unread:0 },
  { id:'c3', name:'Mercy W.', avatar:'avatar-4.png', last:'Do you deliver to Roysambu hub?', when:'Yesterday', unread:0 },
];

export const INSIGHTS = [
  { icon:'fa-eye', tint:'#7c3aed', label:'Galaxy A05', detail:'142 views today · 9 added to cart' },
  { icon:'fa-magnifying-glass', tint:'#f59e0b', label:'“USB-C cable”', detail:'Searched 12× · not in your store yet' },
  { icon:'fa-tag', tint:'#ef4444', label:'Coffee Beans', detail:'Out of stock · 312 lifetime sales' },
];

export function ksh(n){ return 'Ksh ' + Number(n || 0).toLocaleString('en-KE'); }
