/* data.js — Staff console mock operations data. CONFIDENTIAL — internal staff only. */

const AV = (n) => `/assets/avatars/avatar-${n}.png`;
export const STAFF = { name: 'Aisha Kamau', role: 'Operations Admin', photo: AV(1) };

/* ---- platform KPIs (this month) ----
   YoteMarket earns from MERCHANT SUBSCRIPTIONS, not from trade: merchants keep
   every shilling of order value, so gross merchandise value is not our revenue
   and is deliberately absent here and everywhere else in the console. The top
   line is MRR; the cost line is rider payouts for serving the plans' delivery
   allotment. Sample figures — the live console reads staffOverview. */
export const KPIS = [
  { label:'MRR', value:'KSh 1.4M', sub:'428 active plans · KSh 3,271 each', icon:'repeat', tone:'pri' },
  { label:'ARR', value:'KSh 16.8M', sub:"Run-rate at today's MRR", icon:'chart-line', tone:'green' },
  { label:'Collected this month', value:'KSh 1.2M', sub:'428 of 1,284 stores paying', icon:'money-bill-wave', tone:'blue' },
  { label:'Margin this month', value:'KSh 812K', sub:'after KSh 388K rider payouts', icon:'scale-balanced', tone:'amber' },
];
/* monthly subscription revenue collected (KSh) — the trend that is actually ours */
export const REVENUE_TREND = [820,860,910,945,1010,1075,1120,1180,1215,1260,1305,1360]
  .map((v,i)=>({ m:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'][i], v: v*1000 }));
/* subscription mix */
export const SUB_MIX = [
  { plan:'Starter', count:712, pct:55, color:'var(--blue)' },
  { plan:'Growth',  count:436, pct:34, color:'var(--pri)' },
  { plan:'Pro',     count:136, pct:11, color:'var(--green)' },
];
/* funnel */
export const FUNNEL = [
  { stage:'Signed up', v:2140 }, { stage:'Listed ≥2 items', v:1610 },
  { stage:'First sale', v:1284 }, { stage:'Repeat seller', v:880 },
];

/* ---- merchant approval / verification queue ---- */
export const MERCHANTS = [
  { id:'m1', shop:'Mama Njeri Groceries', owner:'Grace Njeri', county:'Kisumu', band:'A', plan:'Starter', docs:true, items:7, socials:4, scout:'Brian Otieno', status:'pending' },
  { id:'m2', shop:'Otieno Electronics', owner:'Peter Otieno', county:'Kisumu', band:'A', plan:'Growth', docs:true, items:12, socials:5, scout:'Brian Otieno', status:'pending' },
  { id:'m3', shop:'Coast Spices Co.', owner:'Ali Hassan', county:'Mombasa', band:'B', plan:'Pro', docs:false, items:9, socials:4, scout:'Amina Yusuf', status:'review' },
  { id:'m4', shop:'TechHub Kisumu', owner:'Sharon Atieno', county:'Kisumu', band:'A', plan:'Starter', docs:true, items:6, socials:2, scout:'Brian Otieno', status:'pending' },
  { id:'m5', shop:'Nakuru Farm Fresh', owner:'James Kariuki', county:'Nakuru', band:'B', plan:'Growth', docs:true, items:15, socials:5, scout:'Daniel Kiptoo', status:'pending' },
  { id:'m6', shop:'Bidii Hardware', owner:'Dennis Owino', county:'Siaya', band:'A', plan:'Starter', docs:false, items:1, socials:5, scout:'Brian Otieno', status:'review' },
  { id:'m7', shop:'Pwani Cosmetics', owner:'Zainab Ahmed', county:'Mombasa', band:'B', plan:'Pro', docs:true, items:22, socials:3, scout:'Amina Yusuf', status:'pending' },
];

/* ---- marketer applications (the hiring funnel) ---- */
export const APPLICANTS = [
  { id:'a1', name:'Amina Yusuf',   county:'Mombasa', verified:118, applied:'14 Jun', stage:'Interview', photo:AV(4) },
  { id:'a2', name:'Kevin Mwangi',  county:'Nairobi', verified:96,  applied:'13 Jun', stage:'Interview', photo:AV(1) },
  { id:'a3', name:'Brian Otieno',  county:'Kisumu',  verified:47,  applied:'12 Jun', stage:'Shortlist', photo:AV(2) },
  { id:'a4', name:'Esther Cherop', county:'Eldoret', verified:41,  applied:'11 Jun', stage:'Shortlist', photo:AV(3) },
  { id:'a5', name:'Daniel Kiptoo', county:'Nakuru',  verified:38,  applied:'10 Jun', stage:'Review', photo:AV(1) },
  { id:'a6', name:'Joan Wambui',   county:'Thika',   verified:33,  applied:'09 Jun', stage:'Review', photo:AV(4) },
  { id:'a7', name:'Samuel Barasa', county:'Kakamega',verified:29,  applied:'08 Jun', stage:'New', photo:AV(1) },
];

/* ---- scout management + payouts approval ---- */
export const SCOUTS = [
  { id:'s1', name:'Amina Yusuf',  county:'Mombasa', verified:118, balance:2510, pending:1200, photo:AV(4) },
  { id:'s2', name:'Kevin Mwangi', county:'Nairobi', verified:96,  balance:2010, pending:0, photo:AV(1) },
  { id:'s3', name:'Brian Otieno', county:'Kisumu',  verified:47,  balance:1040, pending:900, photo:AV(2) },
  { id:'s4', name:'Esther Cherop',county:'Eldoret', verified:41,  balance:920,  pending:500, photo:AV(3) },
  { id:'s5', name:'Daniel Kiptoo',county:'Nakuru',  verified:38,  balance:860,  pending:0, photo:AV(1) },
];
export const PAYOUT_REQUESTS = [
  { id:'pr1', scout:'Amina Yusuf', amount:1200, phone:'0711 ••• 204', method:'M-Pesa', date:'20 Jun', status:'pending', photo:AV(4) },
  { id:'pr2', scout:'Brian Otieno', amount:900, phone:'0720 ••• 861', method:'M-Pesa', date:'20 Jun', status:'pending', photo:AV(2) },
  { id:'pr3', scout:'Esther Cherop', amount:500, phone:'0733 ••• 119', method:'M-Pesa', date:'19 Jun', status:'pending', photo:AV(3) },
];

/* Logistics demo data lives in ./logistics.jsx (LOGI_DEMO) — it has to match the
   engine's own run shape (forming/open/accepted stages, fill, weight, routing
   source, payout), so it's kept next to the screen that renders it. */

/* ---- subscriptions & wallet oversight ---- */
export const WALLET = { float:'KSh 1.92M', pendingPayouts:'KSh 38,400', badgeFund:'KSh 214,000', mpesaToday:'KSh 312,500' };
export const SUBSCRIPTIONS = [
  { id:'sub1', shop:'Otieno Electronics', plan:'Growth', band:'A', amount:3000, next:'14 Jul', status:'active' },
  { id:'sub2', shop:'Coast Spices Co.', plan:'Pro', band:'B', amount:16000, next:'03 Jul', status:'active' },
  { id:'sub3', shop:'Mama Njeri Groceries', plan:'Starter', band:'A', amount:1500, next:'18 Jul', status:'active' },
  { id:'sub4', shop:'Maua Flowers', plan:'Starter', band:'A', amount:1500, next:'overdue', status:'overdue' },
  { id:'sub5', shop:'Nakuru Farm Fresh', plan:'Growth', band:'B', amount:11000, next:'09 Jul', status:'active' },
  { id:'sub6', shop:'Digital Prints Hub', plan:'Entry (SW)', band:'—', amount:500, next:'07 Jul', status:'active' },
];
