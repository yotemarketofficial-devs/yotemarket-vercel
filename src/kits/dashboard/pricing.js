/* pricing.js — MERCHANT-FACING subscription pricing only.
   Delivery tiers (priced by the merchant's delivery distance range) + software-
   only tiers. Mirrors the SUBSCRIPTION section of the Internal Pricing doc; the
   server (subscribeMerchant) is authoritative. Rider pay, margins, badge fees and
   unit-economics are STAFF-ONLY and intentionally NOT included here (so they never
   ship in the consumer bundle). */

export const DELIVERY_TIERS = [
  { id: 'a05',   band: 'A', range: '0–5 km',   plans: { Starter: { deliveries: 10, price: 1500 },  Growth: { deliveries: 20, price: 3000 },  Pro: { deliveries: 30, price: 4200 } } },
  { id: 'a515',  band: 'A', range: '5–15 km',  plans: { Starter: { deliveries: 10, price: 2000 },  Growth: { deliveries: 20, price: 3500 },  Pro: { deliveries: 30, price: 5000 } } },
  { id: 'a1530', band: 'A', range: '15–30 km', plans: { Starter: { deliveries: 10, price: 3500 },  Growth: { deliveries: 20, price: 6000 },  Pro: { deliveries: 30, price: 9000 } } },
  { id: 'b3040', band: 'B', range: '30–40 km', plans: { Starter: { deliveries: 10, price: 6500 },  Growth: { deliveries: 20, price: 11000 }, Pro: { deliveries: 30, price: 16000 } } },
  { id: 'b4050', band: 'B', range: '40–50 km', plans: { Starter: { deliveries: 10, price: 9000 },  Growth: { deliveries: 20, price: 16000 }, Pro: { deliveries: 30, price: 23500 } } },
  { id: 'b5060', band: 'B', range: '50–60 km', plans: { Starter: { deliveries: 10, price: 12000 }, Growth: { deliveries: 20, price: 22000 }, Pro: { deliveries: 30, price: 32000 } } },
  { id: 'c6070', band: 'C', range: '60–70 km', plans: { Starter: { deliveries: 10, price: 20000 }, Growth: { deliveries: 20, price: 36000 }, Pro: { deliveries: 30, price: 52000 } } },
  { id: 'c7080', band: 'C', range: '70–80 km', plans: { Starter: { deliveries: 10, price: 24000 }, Growth: { deliveries: 20, price: 47000 }, Pro: { deliveries: 30, price: 70000 } } },
  { id: 'c8090', band: 'C', range: '80–90 km', plans: { Starter: { deliveries: 10, price: 28000 }, Growth: { deliveries: 20, price: 55000 }, Pro: { deliveries: 30, price: 82000 } } },
];

export const SOFTWARE_TIERS = [
  { name: 'Entry',  price: 500,  desc: 'Basic platform access, no delivery features' },
  { name: 'Growth', price: 700,  desc: 'Enhanced software tools, no delivery features' },
  { name: 'Pro',    price: 1000, desc: 'Full software suite, no delivery features' },
];

export const PLAN_ORDER = ['Starter', 'Growth', 'Pro'];

// Generic per-plan feature bullets for delivery plans (deliveries shown separately).
export const DELIVERY_FEATURES = {
  Starter: ['Branded storefront', 'M-Pesa checkout', 'Bundled hub deliveries'],
  Growth: ['Everything in Starter', 'Demand insights', 'Priority support'],
  Pro: ['Everything in Growth', 'Featured placement', 'Pickup hub eligibility'],
};

export const findDeliveryTier = (id) => DELIVERY_TIERS.find((t) => t.id === id) || DELIVERY_TIERS[0];
