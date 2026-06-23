/* categories.js — Multilevel category taxonomy for the YoteMarket mall, modelled on
   jiji.co.ke's category structure (top-level → subcategories), curated for a goods
   marketplace. Top-level `id`s align with the live Firestore catalog (`catId`) so
   browsing filters real products; subcategories are navigational refinements that
   filter by their parent until products carry sub-tags. `match` lists the catalog
   catIds a node resolves to when filtering. */

export const CATEGORY_TREE = [
  {
    id: 'electronics', label: 'Electronics', icon: 'fa-tv', tint: '#3b82f6', match: ['electronics'],
    subs: ['TVs', 'Audio & Music Equipment', 'Laptops & Computers', 'Computer Accessories', 'Computer Monitors',
      'Networking Products', 'Printers & Scanners', 'Video Games & Consoles', 'Cameras & Photography', 'Computer Hardware', 'Software'],
  },
  {
    id: 'phones', label: 'Phones & Tablets', icon: 'fa-mobile-screen-button', tint: '#06b6d4', match: ['electronics'],
    subs: ['Mobile Phones', 'Tablets', 'Phone & Tablet Accessories', 'Smart Watches', 'Power Banks', 'Phone Cases & Covers'],
  },
  {
    id: 'home', label: 'Home, Furniture & Appliances', icon: 'fa-couch', tint: '#f59e0b', match: ['home'],
    subs: ['Furniture', 'Home Appliances', 'Kitchen Appliances', 'Kitchenware & Cookware', 'Home Decor & Accessories',
      'Bedding & Linen', 'Garden & Outdoor', 'Cleaning & Laundry', 'Lighting'],
  },
  {
    id: 'fashion', label: 'Fashion', icon: 'fa-shirt', tint: '#a020f0', match: ['fashion'],
    subs: ['Clothing', "Men's Fashion", "Women's Fashion", 'Shoes', 'Bags', 'Watches', 'Jewellery', 'Clothing Accessories', 'Wedding Wear'],
  },
  {
    id: 'beauty', label: 'Health & Beauty', icon: 'fa-spa', tint: '#ec4899', match: ['beauty'],
    subs: ['Skin Care', 'Hair Beauty', 'Make-Up', 'Fragrances', 'Bath & Body', 'Vitamins & Supplements', 'Tools & Accessories'],
  },
  {
    id: 'groceries', label: 'Groceries & Food', icon: 'fa-basket-shopping', tint: '#10b981', match: ['groceries'],
    subs: ['Fresh Produce', 'Foodstuff & Pantry', 'Beverages', 'Meat & Seafood', 'Bakery & Confectionery', 'Spices & Condiments'],
  },
  {
    id: 'kids', label: 'Babies & Kids', icon: 'fa-shapes', tint: '#22d3ee', match: ['kids'],
    subs: ['Baby & Child Care', "Children's Clothing", "Children's Shoes", 'Toys', 'Prams & Strollers', 'School Supplies'],
  },
  {
    id: 'leisure', label: 'Leisure & Sports', icon: 'fa-futbol', tint: '#16a34a', match: [],
    subs: ['Sports Equipment', 'Fitness & Gym', 'Musical Instruments', 'Books', 'Games & Hobbies', 'Camping & Outdoors'],
  },
  {
    id: 'commercial', label: 'Commercial Equipment & Tools', icon: 'fa-screwdriver-wrench', tint: '#64748b', match: [],
    subs: ['Power Tools', 'Hand Tools', 'Restaurant & Catering', 'Salon & Spa Equipment', 'Industrial Machinery', 'Printing Equipment'],
  },
  {
    id: 'pets', label: 'Animals & Pets', icon: 'fa-paw', tint: '#d97706', match: [],
    subs: ['Pet Food', 'Pet Accessories', 'Dogs & Puppies', 'Cats & Kittens', 'Birds', 'Fish'],
  },
  {
    id: 'vehicles', label: 'Vehicles', icon: 'fa-car', tint: '#0ea5e9', match: [],
    subs: ['Cars', 'Motorcycles & Scooters', 'Vehicle Parts & Accessories', 'Buses & Microbuses', 'Trucks & Trailers'],
  },
];

// Resolve a top-level node id to the catalog catIds it should filter products by.
export function catalogIdsFor(catId) {
  const node = CATEGORY_TREE.find((c) => c.id === catId);
  return node && node.match.length ? node.match : [catId];
}
