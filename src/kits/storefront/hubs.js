/* hubs.js — YoteMarket pickup-hub network. Hubs are FLUID: every merchant store with a
   physical location that opts into pickup IS a hub (resolveHubs derives them live from the
   catalog). The fixed list below is only a BOOTSTRAP so coverage is never empty in an area
   with no enrolled merchant-hubs yet. Shoppers pick a hub at checkout; the chosen id + name
   are stamped on the order. ("Fixed roads, fluid hubs" model.) */

export const HUBS = [
  { id: 'westlands', name: 'Westlands Hub', area: 'Mpaka Road · near Sarit Centre', town: 'Nairobi', location: { lat: -1.2635, lng: 36.8030 } },
  { id: 'cbd', name: 'CBD Hub', area: 'Moi Avenue · Nairobi CBD', town: 'Nairobi', location: { lat: -1.2841, lng: 36.8266 } },
  { id: 'kilimani', name: 'Kilimani Hub', area: 'Yaya Centre', town: 'Nairobi', location: { lat: -1.2925, lng: 36.7840 } },
  { id: 'karen', name: 'Karen Hub', area: 'Karen Crossroads', town: 'Nairobi', location: { lat: -1.3190, lng: 36.7060 } },
  { id: 'thika-road', name: 'Thika Road Hub', area: 'TRM Drive · Roysambu', town: 'Nairobi', location: { lat: -1.2190, lng: 36.8880 } },
  { id: 'eastlands', name: 'Eastlands Hub', area: 'Buruburu · Mumias Road', town: 'Nairobi', location: { lat: -1.2870, lng: 36.8770 } },
  { id: 'rongai', name: 'Ongata Rongai Hub', area: 'Maasai Mall', town: 'Kajiado', location: { lat: -1.3960, lng: 36.7450 } },
  { id: 'mombasa', name: 'Mombasa Hub', area: 'Nyali · City Mall', town: 'Mombasa', location: { lat: -4.0300, lng: 39.7000 } },
  { id: 'kisumu', name: 'Kisumu Hub', area: 'Mega Plaza', town: 'Kisumu', location: { lat: -0.0917, lng: 34.7680 } },
  { id: 'nakuru', name: 'Nakuru Hub', area: 'Westside Mall', town: 'Nakuru', location: { lat: -0.2870, lng: 36.0660 } },
];

export const DEFAULT_HUB_ID = 'westlands';
export const findHub = (id) => HUBS.find((h) => h.id === id) || null;

/* A merchant store becomes a pickup HUB once it has a physical location and opts in. */
export const storeToHub = (s) => ({
  id: s.id, name: s.name || 'Pickup point',
  area: s.area || s.address || '', town: s.town || s.area || '',
  location: s.location, store: true,
});
export const merchantHubs = (stores) => (stores || [])
    .filter((s) => s && s.pickupEnabled && s.location && Number.isFinite(s.location.lat))
    .map(storeToHub);
/* The LIVE hub set = real merchant hubs, with the bootstrap list filling in where none
   exist yet (deduped by id). This is the fluid-hub model the whole engine assumes. */
export const resolveHubs = (stores) => {
  const real = merchantHubs(stores);
  const seen = new Set(real.map((h) => h.id));
  return [...real, ...HUBS.filter((h) => !seen.has(h.id))];
};

/* Great-circle distance in km between two {lat,lng} points (haversine). Used to route
   a shopper to the collection point nearest them, so checkout can auto-match instead
   of asking them to pick a hub off a list. */
export function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return Infinity;
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* The collection hub nearest a shopper location → { hub, km }, or null if the location
   is unknown. This is the "matched with the nearest point" step the checkout runs the
   moment it has the shopper's coordinates. */
export function nearestHub(loc, hubs = HUBS) {
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
  let best = null, bestD = Infinity;
  for (const h of hubs) {
    const d = distanceKm(loc, h.location);
    if (d < bestD) { bestD = d; best = h; }
  }
  return best ? { hub: best, km: bestD } : null;
}
