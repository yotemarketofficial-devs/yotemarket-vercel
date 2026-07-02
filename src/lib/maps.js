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
