// Google Maps config for the YoteMarket web platform.
// A browser Maps key is not a secret — it ships in every client bundle (exactly like
// the Firebase web config in firebase.js and the Flutter apps' MAPS key), and is meant
// to be locked down with an HTTP-referrer restriction in Google Cloud Console rather
// than kept hidden. So it's baked in as a default; VITE_GOOGLE_MAPS_API_KEY still
// overrides for other environments. Empty → maps fall back to the keyless
// OpenStreetMap embed so demo/preview builds still render.
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCIEIHw8DRwMdFAttZBWscBevICSbsK0pQ';

export const mapsEnabled = Boolean(GOOGLE_MAPS_API_KEY);

// Build a Google Maps Embed API "place" URL that drops a marker at either a
// "lat,lng" pair or a free-text place query. Requires the Maps Embed API enabled
// on the key. Returns null when no key is configured (caller falls back to OSM).
export function mapsEmbedUrl(query, { zoom = 15 } = {}) {
  if (!GOOGLE_MAPS_API_KEY || !query) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}` +
    `&q=${encodeURIComponent(query)}&zoom=${zoom}`;
}
