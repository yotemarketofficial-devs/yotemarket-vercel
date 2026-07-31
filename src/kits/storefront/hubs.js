/* hubs.js — YoteMarket collection points. There is no invented hub network: every
   collection point IS a real merchant store that has a physical location and has opted
   into pickup, so a hubId is a storeId and its address/coordinates are the store's own.
   Shoppers pick a point at checkout; the chosen id + name are stamped on the order.
   ("Fixed roads, fluid hubs" — the roads are fixed, the points are whoever enrolled.) */
import { YM_STORES } from './data.js';

/* A merchant store becomes a collection point once it has a location and opts in. */
export const storeToHub = (s) => ({
  id: s.id, name: s.name || 'Pickup point',
  area: s.area || s.address || '', town: s.town || s.area || '',
  location: s.location, store: true,
});
export const merchantHubs = (stores) => (stores || [])
    .filter((s) => s && s.pickupEnabled && s.location && Number.isFinite(s.location.lat))
    .map(storeToHub);

/* The LIVE collection-point set — real enrolled stores only. Empty is a legitimate
   state (nobody near this shopper has enrolled yet); callers must handle it by falling
   back to store pickup rather than inventing a point. */
export const resolveHubs = (stores) => merchantHubs(stores || YM_STORES);

/* Look a point up by id. Reads the store itself, so an order stamped with a point that
   later opted out still renders its real name and location. */
export const findHub = (id, stores) => {
  if (!id) return null;
  const s = (stores || YM_STORES || []).find((x) => x && x.id === id);
  return s && s.location ? storeToHub(s) : null;
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
export function nearestHub(loc, hubs) {
  const list = hubs || resolveHubs();
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
  let best = null, bestD = Infinity;
  for (const h of list) {
    const d = distanceKm(loc, h.location);
    if (d < bestD) { bestD = d; best = h; }
  }
  return best ? { hub: best, km: bestD } : null;
}
