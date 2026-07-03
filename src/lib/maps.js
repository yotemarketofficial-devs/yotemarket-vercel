// Maps config for the YoteMarket web platform — Mapbox.
// The Mapbox *public* token (pk.*) is a browser token designed to ship in the client
// bundle and works cross-domain, so no per-host gating or API-enablement dance is
// needed. It comes from VITE_MAPBOX_TOKEN — set in web_app/.env.local for local dev and
// in the Vercel project env for production (kept out of source so GitHub secret-scanning
// doesn't block pushes). Empty → maps fall back to the keyless OpenStreetMap embed.
// Lock the token down with URL restrictions in the Mapbox account dashboard.
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MAPBOX_STYLE = 'streets-v12'; // Mapbox-owned style; no custom style needed
const MAPBOX_MARKER = '4f46e5';     // brand --m-primary (hex, no '#')

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

// Build a Mapbox Static Images API URL: a rendered PNG with a brand pin at lat/lng,
// usable directly as an <img src>. Requested @2x for retina; width/height are the
// pixel size Mapbox renders (the <img> is scaled to its container with object-fit).
// Returns null when there's no token or bad coords (caller falls back to OSM).
export function mapboxStaticUrl(lat, lng, { zoom = 14, width = 720, height = 400 } = {}) {
  if (!MAPBOX_TOKEN || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const marker = `pin-s+${MAPBOX_MARKER}(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static/${marker}/` +
    `${lng},${lat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}
