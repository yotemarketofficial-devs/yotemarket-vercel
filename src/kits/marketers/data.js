/* data.js — mock scout data for the Marketers app. The scout only ever sees THEIR OWN
   referrals + earnings + the public leaderboard. No platform margins or rider pay here. */

const AV = (n) => `/assets/avatars/avatar-${n}.png`;

// ---- the signed-in scout ----
export const ME = {
  name: 'Brian Otieno', first: 'Brian', handle: '@brian_yote',
  county: 'Kisumu', photo: AV(2), joined: 'Mar 2026',
  code: 'YOTE-BRIAN', tier: 'Founding cohort', phone: '0720 730 861',
  email: 'brian.otieno@gmail.com',
};

// ---- referrals (merchants this scout signed up) ----
export const REFERRALS = [
  { id:'r01', shop:'Mama Njeri Groceries',  owner:'Grace Njeri',   county:'Kisumu',  date:'18 Jun', socials:4, items:7,  status:'verified' },
  { id:'r02', shop:'Otieno Electronics',    owner:'Peter Otieno',  county:'Kisumu',  date:'17 Jun', socials:5, items:12, status:'verified' },
  { id:'r03', shop:'Lakeside Fashion',      owner:'Mercy Akinyi',  county:'Kisumu',  date:'16 Jun', socials:3, items:5,  status:'verified' },
  { id:'r04', shop:'Coast Spices Co.',      owner:'Ali Hassan',    county:'Kisumu',  date:'15 Jun', socials:4, items:9,  status:'verified' },
  { id:'r05', shop:'Green Valley Produce',  owner:'John Kamau',    county:'Vihiga',  date:'14 Jun', socials:3, items:3,  status:'verified' },
  { id:'r06', shop:'TechHub Kisumu',        owner:'Sharon Atieno', county:'Kisumu',  date:'13 Jun', socials:2, items:6,  status:'pending', missing:'1 more social follow' },
  { id:'r07', shop:'Bidii Hardware',        owner:'Dennis Owino',  county:'Siaya',   date:'12 Jun', socials:5, items:1,  status:'pending', missing:'list 1 more item' },
  { id:'r08', shop:'Sunrise Bakery',        owner:'Faith Wanjiru', county:'Kisumu',  date:'11 Jun', socials:4, items:8,  status:'verified' },
  { id:'r09', shop:'Pwani Cosmetics',       owner:'Zainab Ahmed',  county:'Kisumu',  date:'10 Jun', socials:3, items:4,  status:'verified' },
  { id:'r10', shop:'Maua Flowers',          owner:'Lilian Awino',  county:'Vihiga',  date:'09 Jun', socials:1, items:0,  status:'rejected', missing:'no activity 30 days' },
  { id:'r11', shop:'Kibuye Auto Spares',    owner:'Victor Omondi', county:'Kisumu',  date:'08 Jun', socials:4, items:5,  status:'verified' },
  { id:'r12', shop:'Digital Prints Hub',    owner:'Caroline Adhiambo', county:'Kisumu', date:'07 Jun', socials:3, items:6, status:'verified' },
];
// pad the verified count up to a realistic founding-cohort number (older referrals collapsed)
export const EXTRA_VERIFIED = 39; // older verified merchants not shown in the recent list
export const VERIFIED_COUNT = REFERRALS.filter(r => r.status === 'verified').length + EXTRA_VERIFIED;
export const PENDING_COUNT  = REFERRALS.filter(r => r.status === 'pending').length;
export const TOTAL_REFERRED = VERIFIED_COUNT + PENDING_COUNT + REFERRALS.filter(r=>r.status==='rejected').length + 4;

// ---- public leaderboard (this month) ----
export const LEADERBOARD = [
  { rank:1, name:'Amina Yusuf',    county:'Mombasa', verified:118, photo:AV(4) },
  { rank:2, name:'Kevin Mwangi',   county:'Nairobi', verified:96,  photo:AV(1) },
  { rank:3, name:'Brian Otieno',   county:'Kisumu',  verified:VERIFIED_COUNT, photo:AV(2), you:true },
  { rank:4, name:'Esther Cherop',  county:'Eldoret', verified:41,  photo:AV(3) },
  { rank:5, name:'Daniel Kiptoo',  county:'Nakuru',  verified:38,  photo:AV(1) },
  { rank:6, name:'Joan Wambui',    county:'Thika',   verified:33,  photo:AV(4) },
  { rank:7, name:'Samuel Barasa',  county:'Kakamega',verified:29,  photo:AV(1) },
  { rank:8, name:'Lucy Njoki',     county:'Nyeri',   verified:24,  photo:AV(3) },
].sort((a,b)=>b.verified-a.verified).map((s,i)=>({ ...s, rank:i+1 }));

// ---- withdrawal history (M-Pesa) ----
export const PAYOUTS = [
  { id:'p01', date:'01 Jun 2026', amount:900,  method:'M-Pesa', ref:'SF42KL9QX', phone:'0720 ••• 861', status:'paid' },
  { id:'p02', date:'02 May 2026', amount:500,  method:'M-Pesa', ref:'SE18MN3RT', phone:'0720 ••• 861', status:'paid' },
  { id:'p03', date:'05 Apr 2026', amount:500,  method:'M-Pesa', ref:'SD77PQ2WL', phone:'0720 ••• 861', status:'paid' },
];

export const COUNTIES = ['Kisumu','Nairobi','Mombasa','Nakuru','Eldoret','Kiambu','Machakos','Kakamega','Vihiga','Siaya','Nyeri','Thika'];
