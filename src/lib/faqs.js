/* faqs.js — Help Center knowledge base. Curated, product-accurate answers grounded
   in how YoteMarket actually works (M-Pesa, pickup hubs, escrow, subscriptions,
   YoteFeed). Edit here to update the public Help Center. */

export const FAQ_CATEGORIES = [
  { id: 'orders',   label: 'Orders & delivery',      icon: 'fa-truck-fast' },
  { id: 'payments', label: 'Payments & M-Pesa',      icon: 'fa-mobile-screen-button' },
  { id: 'refunds',  label: 'Returns & refunds',      icon: 'fa-rotate-left' },
  { id: 'account',  label: 'Account & security',     icon: 'fa-user-shield' },
  { id: 'selling',  label: 'Selling on YoteMarket',  icon: 'fa-store' },
  { id: 'feed',     label: 'YoteFeed',               icon: 'fa-clapperboard' },
];

export const FAQS = [
  // ── Orders & delivery ──
  { cat: 'orders', q: 'How do I place an order?',
    a: 'Browse stores, add items to your cart, choose a nearby pickup hub (or store pickup where offered), then pay with M-Pesa or your YoteMarket wallet. You can follow every order under “Orders”.' },
  { cat: 'orders', q: 'How does delivery work?',
    a: 'We use a hub-relay model: the store hands your parcel to a rider, the rider drops it at the pickup hub you chose, and you collect it with a one-time pickup code. It keeps delivery fast and affordable across town.' },
  { cat: 'orders', q: 'Where do I collect my order?',
    a: 'At the pickup hub you selected at checkout. When your parcel arrives you’ll get a pickup code — show it at the hub to collect. Some stores also offer direct store pickup.' },
  { cat: 'orders', q: 'How do I track my order?',
    a: 'Open “Orders” in the app. Each order shows its live stage: confirmed → rider assigned → picked up → at the hub → collected.' },
  { cat: 'orders', q: 'What is a pickup code and why does it matter?',
    a: 'It’s a one-time code that proves the right person is collecting the right parcel. Only share it at the hub when you’re collecting — never before.' },
  { cat: 'orders', q: 'Can I change or cancel an order?',
    a: 'You can cancel an order before it’s been picked up from the store. Once a rider has collected it, message the store through in-app chat or open a support request.' },

  // ── Payments & M-Pesa ──
  { cat: 'payments', q: 'How do I pay?',
    a: 'Pay by M-Pesa (an STK prompt pops up on your phone) or from your YoteMarket wallet balance. Cash-on-collection is available where a store enables it.' },
  { cat: 'payments', q: 'The M-Pesa prompt didn’t arrive — what do I do?',
    a: 'Check that your phone number is correct and try again. If you were charged but the order still shows unpaid, tap “Confirm payment” on the order — we re-check directly with Safaricom and settle it.' },
  { cat: 'payments', q: 'What is the YoteMarket wallet?',
    a: 'A prepaid balance you top up with M-Pesa and use for faster checkout. Top it up any time under “Wallet”.' },
  { cat: 'payments', q: 'Is my payment safe?',
    a: 'Yes. Payments run through Safaricom M-Pesa. For deliveries your money is held in escrow and only released to the store after you collect — so you’re protected until the item is in your hands.' },
  { cat: 'payments', q: 'I paid but my order still says unpaid.',
    a: 'Use “Confirm payment” on the order — we query M-Pesa directly and reconcile it. If it still doesn’t clear, open a support request and include your M-Pesa confirmation code.' },

  // ── Returns & refunds ──
  { cat: 'refunds', q: 'Can I return an item?',
    a: 'Returns depend on the store’s policy and the item’s condition. Message the store first through in-app chat — most issues are sorted quickly. If it isn’t resolved, open a support request.' },
  { cat: 'refunds', q: 'How do refunds work?',
    a: 'Because funds are held in escrow until you collect, many problems are resolved before any money is released. Approved refunds are returned to your M-Pesa or YoteMarket wallet.' },
  { cat: 'refunds', q: 'The item was damaged or not as described.',
    a: 'Report it in in-app chat with the store and open a support request with photos. Our team can step in for eligible cases and hold the release while we review.' },
  { cat: 'refunds', q: 'How long do refunds take?',
    a: 'Once approved, M-Pesa refunds usually arrive within a few business days; wallet refunds are instant.' },

  // ── Account & security ──
  { cat: 'account', q: 'Do I need an account to shop?',
    a: 'Yes — a quick sign-up with Google or email keeps your orders, wallet, chats and pickup codes together and secure.' },
  { cat: 'account', q: 'I forgot my password.',
    a: 'Tap “Forgot password” on the sign-in screen and we’ll email you a reset link.' },
  { cat: 'account', q: 'How do I update my details?',
    a: 'Edit your name, phone number and delivery/pickup preferences any time in your Profile.' },
  { cat: 'account', q: 'How is my data used?',
    a: 'We only use your information to run the service — orders, delivery, payments and support. See our Privacy Policy for the full picture.' },
  { cat: 'account', q: 'How do I close my account?',
    a: 'Profile → Account → Close account. Some records are retained where the law requires it (e.g. tax and transaction records).' },

  // ── Selling on YoteMarket ──
  { cat: 'selling', q: 'How do I open a store?',
    a: 'Tap “Sell”, create your store, choose a plan, and you’re live — usually in minutes. There’s no commission on your sales.' },
  { cat: 'selling', q: 'What does selling cost?',
    a: 'A simple monthly subscription based on your plan. You keep 100% of every sale — we don’t take a cut of order value, only the plan fee.' },
  { cat: 'selling', q: 'How and when do I get paid?',
    a: 'Order value is held in escrow and released to your M-Pesa or bank payout after the buyer collects. Manage your payout details in the merchant dashboard.' },
  { cat: 'selling', q: 'What am I not allowed to sell?',
    a: 'Counterfeit, stolen, illegal or unsafe goods are prohibited. Regulated goods (for example prescription medicine) require valid licences. See our Terms of Service for the full list.' },
  { cat: 'selling', q: 'How do stores get featured?',
    a: 'Keep your store verified, well-stocked and responsive to chats. Staff feature standout stores on the storefront, and Enterprise plans include Top-brand placement.' },

  // ── YoteFeed ──
  { cat: 'feed', q: 'What is YoteFeed?',
    a: 'Short, shoppable videos where stores show off products you can buy in a tap — discover deals and new arrivals as you scroll.' },
  { cat: 'feed', q: 'Can I sell on YoteFeed?',
    a: 'Yes — merchants can post product clips straight from the dashboard to reach shoppers browsing the feed.' },
  { cat: 'feed', q: 'Can I use any music in my clips?',
    a: 'Only music you have the rights to use. Don’t upload copyrighted tracks without permission — infringing clips can be removed.' },
  { cat: 'feed', q: 'How do I report a video?',
    a: 'Use the report option on any clip. Our moderation team reviews reports and removes content that breaks the rules.' },
];

// Categories used by the support ticket form (align with backend SUPPORT_CATEGORIES).
export const TICKET_CATEGORIES = [
  { id: 'order',    label: 'An order or delivery' },
  { id: 'payment',  label: 'Payment or M-Pesa' },
  { id: 'refund',   label: 'Return or refund' },
  { id: 'account',  label: 'My account' },
  { id: 'selling',  label: 'Selling / my store' },
  { id: 'feed',     label: 'YoteFeed' },
  { id: 'other',    label: 'Something else' },
];
