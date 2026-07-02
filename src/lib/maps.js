// Google Maps config for the YoteMarket web platform.
// A browser Maps key is not a secret — it ships in every client bundle (exactly like
// the Firebase web config in firebase.js and the Flutter apps' MAPS key), and is meant
// to be locked down with an HTTP-referrer restriction in Google Cloud Console rather
// than kept hidden. So it's baked in as a default; VITE_GOOGLE_MAPS_API_KEY still
// overrides for other environments.
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCIEIHw8DRwMdFAttZBWscBevICSbsK0pQ';

// The key is HTTP-referrer-restricted to the production custom domains, and the Google
// Maps Embed API renders only when the request comes from one of them. Anywhere else
// (yotemarket.vercel.app, preview deploys, localhost) Google returns a referrer 403 and
// an <iframe> can't fall back on its own — so we only build a Google embed URL on the
// allowed hosts and let the caller use the keyless OpenStreetMap embed everywhere else.
// Keep this in sync with the key's "Website restrictions" in Google Cloud Console.
const MAPS_ALLOWED_HOSTS = ['yotemarket.co.ke', 'yotemarket.com'];

function hostAllowsGoogleMaps() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return MAPS_ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

// Fallback map center + coarse town lookup, used when a store hasn't saved a precise
// pickup pin. Keeps the map from being an empty grey box: we drop an approximate
// town-level marker (matched from the store's area/town text, else Nairobi CBD) and
// the UI labels it "approximate". The "Get directions" link still targets the store's
// real area name — never this point — so navigation stays honest.
export const DEFAULT_MAP_CENTER = { lat: -1.2833, lng: 36.8167 }; // Nairobi CBD

const KENYA_PLACES = [
  ['mombasa', { lat: -4.0435, lng: 39.6682 }],
  ['kisumu', { lat: -0.0917, lng: 34.7680 }],
  ['nakuru', { lat: -0.3031, lng: 36.0800 }],
  ['eldoret', { lat: 0.5143, lng: 35.2698 }],
  ['thika', { lat: -1.0333, lng: 37.0693 }],
  ['nyeri', { lat: -0.4169, lng: 36.9514 }],
  ['machakos', { lat: -1.5177, lng: 37.2634 }],
  ['kitale', { lat: 1.0157, lng: 35.0062 }],
  ['naivasha', { lat: -0.7172, lng: 36.4310 }],
  ['kikuyu', { lat: -1.2470, lng: 36.6636 }],
  ['rongai', { lat: -1.3960, lng: 36.7450 }],
  ['karen', { lat: -1.3190, lng: 36.7060 }],
  ['westlands', { lat: -1.2635, lng: 36.8030 }],
  ['nairobi', { lat: -1.2833, lng: 36.8167 }],
];

// Best-effort town-level center for a free-text area/town string; DEFAULT_MAP_CENTER
// when nothing matches. Only used as a visual fallback — see DEFAULT_MAP_CENTER above.
export function approxCenterFor(area) {
  const s = String(area || '').toLowerCase();
  for (const [name, c] of KENYA_PLACES) if (s.includes(name)) return c;
  return DEFAULT_MAP_CENTER;
}

// Build a Google Maps Embed API "place" URL that drops a marker at either a
// "lat,lng" pair or a free-text place query. Returns null when there's no key, no
// query, or the current host isn't authorized for the key — the caller then falls
// back to the keyless OpenStreetMap embed. NOTE: the "Maps Embed API" must also be
// enabled on the key's Google Cloud project, or Google answers 403 (ApiNotActivated).
export function mapsEmbedUrl(query, { zoom = 15 } = {}) {
  if (!GOOGLE_MAPS_API_KEY || !query || !hostAllowsGoogleMaps()) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}` +
    `&q=${encodeURIComponent(query)}&zoom=${zoom}`;
}
