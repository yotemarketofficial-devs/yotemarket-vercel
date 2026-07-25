/* categories.js — Multilevel category taxonomy for the YoteMarket mall: a broad
   classifieds-style structure (top-level → subcategories), curated for a goods
   marketplace. This is the SINGLE SOURCE OF TRUTH for the storefront taxonomy: the
   "All categories" mega-menu, the category chip row, and search all derive from it.
   Top-level `id`s align with the live Firestore catalog (`catId`) so browsing filters
   real products; subcategories are navigational refinements that filter by their parent
   until products carry sub-tags. `short` is the chip label; `match` lists the catalog
   catIds a node resolves to when filtering. */

export const CATEGORY_TREE = [
  {
    id: 'electronics', label: 'Electronics', short: 'Electronics', icon: 'fa-tv', tint: '#3b82f6', match: ['electronics'],
    subs: ['TVs', 'Audio & Music Equipment', 'Headphones', 'Laptops & Computers', 'Computer Accessories', 'Computer Monitors',
      'Networking Products', 'Printers & Scanners', 'Video Games & Consoles', 'Cameras & Photography', 'Computer Hardware',
      'Security & Surveillance', 'Converters & Stabilizers', 'Software'],
  },
  {
    // Phones is its own top level and merchants list against it directly, so its catId
    // IS 'phones' — `match:['phones']`, not ['electronics']. Pointing it at 'electronics'
    // meant a product saved as catId 'phones' matched NO node (electronics filters
    // 'electronics') and fell into "Other". Same self-consistent pattern as Furniture.
    id: 'phones', label: 'Phones & Tablets', short: 'Phones', icon: 'fa-mobile-screen-button', tint: '#06b6d4', match: ['phones'],
    subs: ['Mobile Phones', 'Tablets', 'Phone & Tablet Accessories', 'Smart Watches', 'Power Banks', 'Phone Cases & Covers'],
  },
  {
    id: 'home', label: 'Home & Appliances', short: 'Home', icon: 'fa-house', tint: '#f59e0b', match: ['home'],
    subs: ['Home Appliances', 'Kitchen Appliances', 'Kitchenware & Cookware', 'Home Decor & Accessories',
      'Bedding & Linen', 'Curtains & Blinds', 'Carpets & Rugs', 'Garden & Outdoor', 'Cleaning & Laundry',
      'Household Chemicals', 'Lighting'],
  },
  {
    // Furniture is its own top level — far too diverse to sit as one sub under Home.
    // `match:['furniture']` only (NOT 'home'): mapping it to 'home' would drag every
    // appliance in here. Products listed before this split carry catId 'home' and
    // stay under Home until re-categorised; new listings pick Furniture directly.
    id: 'furniture', label: 'Furniture', short: 'Furniture', icon: 'fa-couch', tint: '#b45309', match: ['furniture'],
    subs: ['Sofas & Couches', 'Beds & Mattresses', 'Wardrobes & Closets', 'Dining Tables & Sets',
      'Chairs & Stools', 'Coffee & Side Tables', 'TV Stands & Units', 'Office Furniture',
      'Storage & Shelving', 'Outdoor & Garden Furniture', "Children's Furniture", 'Kitchen Cabinets',
      'Custom & Handmade Furniture'],
  },
  {
    id: 'fashion', label: 'Fashion', short: 'Fashion', icon: 'fa-shirt', tint: '#a020f0', match: ['fashion'],
    subs: ['Clothing', "Men's Fashion", "Women's Fashion", 'Shoes', 'Bags', 'Watches', 'Jewellery', 'Clothing Accessories', 'Wedding Wear'],
  },
  {
    id: 'beauty', label: 'Health & Beauty', short: 'Beauty', icon: 'fa-spa', tint: '#ec4899', match: ['beauty'],
    subs: ['Skin Care', 'Hair Beauty', 'Make-Up', 'Fragrances', 'Bath & Body', 'Vitamins & Supplements', 'Medical Supplies & Equipment', 'Tools & Accessories'],
  },
  {
    id: 'groceries', label: 'Groceries & Food', short: 'Groceries', icon: 'fa-basket-shopping', tint: '#10b981', match: ['groceries'],
    subs: ['Fresh Produce', 'Foodstuff & Pantry', 'Beverages', 'Meat & Seafood', 'Bakery & Confectionery', 'Spices & Condiments'],
  },
  {
    id: 'agriculture', label: 'Food, Agriculture & Farming', short: 'Agriculture', icon: 'fa-tractor', tint: '#65a30d', match: ['agriculture'],
    subs: ['Seeds & Seedlings', 'Fertilizers & Agrochemicals', 'Pesticides & Herbicides', 'Farm Tools & Equipment',
      'Farm Machinery & Tractors', 'Irrigation & Greenhouses', 'Animal Feed & Supplements', 'Livestock & Poultry',
      'Veterinary & Animal Health', 'Fresh Farm Produce'],
  },
  {
    id: 'kids', label: 'Babies & Kids', short: 'Kids', icon: 'fa-shapes', tint: '#22d3ee', match: ['kids'],
    subs: ['Baby & Child Care', "Children's Clothing", "Children's Shoes", "Children's Furniture", "Children's Gear & Safety",
      'Toys', 'Prams & Strollers', 'Maternity & Pregnancy', 'School Supplies'],
  },
  {
    id: 'pets', label: 'Animals & Pets', short: 'Pets', icon: 'fa-paw', tint: '#d97706', match: [],
    subs: ['Pet Food', 'Pet Accessories', 'Dogs & Puppies', 'Cats & Kittens', 'Birds', 'Fish', 'Pet Health & Grooming'],
  },
  {
    id: 'leisure', label: 'Sports, Arts & Leisure', short: 'Leisure', icon: 'fa-futbol', tint: '#16a34a', match: [],
    subs: ['Sports Equipment', 'Fitness & Gym', 'Bicycles', 'Camping & Outdoors', 'Musical Instruments', 'Books', 'Arts & Crafts', 'Games & Hobbies'],
  },
  {
    id: 'commercial', label: 'Commercial & Industrial Equipment', short: 'Business', icon: 'fa-screwdriver-wrench', tint: '#64748b', match: [],
    subs: ['Office Equipment & Supplies', 'Restaurant & Catering', 'Salon & Spa Equipment', 'Medical & Lab Equipment',
      'Industrial Machinery', 'Generators & Power Equipment', 'Printing Equipment', 'Safety & Security Equipment'],
  },
  {
    id: 'construction', label: 'Repair & Construction', short: 'Construction', icon: 'fa-helmet-safety', tint: '#b45309', match: ['construction'],
    subs: ['Building Materials', 'Hand Tools', 'Power Tools', 'Plumbing & Water Supply', 'Electrical Equipment',
      'Doors & Gates', 'Windows & Glass', 'Solar & Renewable Energy', 'Paint & Finishes', 'Hardware & Fasteners', 'Measuring & Levelling Tools'],
  },
  {
    id: 'vehicles', label: 'Vehicles', short: 'Vehicles', icon: 'fa-car', tint: '#0ea5e9', match: [],
    subs: ['Cars', 'Motorcycles & Scooters', 'Vehicle Parts & Accessories', 'Buses & Microbuses', 'Trucks & Trailers',
      'Heavy Equipment', 'Watercraft & Boats'],
  },
  {
    id: 'general', label: 'General Stores', short: 'General', icon: 'fa-shop', tint: '#0d9488', match: ['general'],
    subs: ['Convenience & Duka', 'Wholesale & Bulk', 'Stationery & Books', 'Gifts & Novelty', 'Household Essentials', 'Party & Events'],
  },
];

// ── Subcategory matching ─────────────────────────────────────────────────────
// Products/stores carry a top-level `catId`; a subcategory is a finer refinement.
// When an item has an explicit `sub` tag we match it exactly; otherwise we fall back
// to accurate keyword matching against its text (name/description/tagline) so the
// existing catalog still filters precisely. Connector/filler words are dropped and
// terms are lightly stemmed so "Laptops & Computers" matches "HP Laptop", etc.
const SUB_STOP = new Set([
  'and', 'the', 'for', 'with', 'other', 'general', 'equipment', 'accessories',
  'accessory', 'products', 'product', 'wear', 'care', 'supplies', 'essentials',
  'items', 'goods', 'more',
]);
const subStem = (t) => t.replace(/ies$/, 'y').replace(/(es|s)$/, '');
// Significant, stemmed terms for a subcategory label (e.g. "Skin Care" → ["skin"]).
export function subTerms(subLabel) {
  return String(subLabel || '')
    .toLowerCase().replace(/&/g, ' ').split(/[^a-z0-9]+/)
    .map(subStem)
    .filter((t) => t.length > 2 && !SUB_STOP.has(t));
}
// True when `subLabel` matches an item, given its explicit `itemSub` (exact match)
// and any free-text fields to keyword-match against. No sub selected ⇒ always true.
export function matchesSub(subLabel, itemSub, ...texts) {
  if (!subLabel) return true;
  if (itemSub && String(itemSub).toLowerCase() === String(subLabel).toLowerCase()) return true;
  const terms = subTerms(subLabel);
  if (!terms.length) return true;
  const hay = [itemSub, ...texts].join(' ').toLowerCase();
  return terms.some((t) => hay.includes(t));
}

// The category chip row (and any flat category list) — derived from the tree so it
// always matches the "All categories" mega-menu. "All" first, then every top node.
export const CATEGORY_CHIPS = [
  { id: 'all', label: 'All', icon: 'fa-border-all', tint: '#7c3aed' },
  ...CATEGORY_TREE.map((c) => ({ id: c.id, label: c.short || c.label, icon: c.icon, tint: c.tint })),
];

// Resolve a top-level node id to the catalog catIds it should filter products by.
export function catalogIdsFor(catId) {
  const node = CATEGORY_TREE.find((c) => c.id === catId);
  return node && node.match.length ? node.match : [catId];
}
