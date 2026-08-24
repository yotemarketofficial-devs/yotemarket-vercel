/* The public page map — one source of truth for per-route title, description and
 * the canonical origin.
 *
 * Shared deliberately: components/RouteSeo.jsx sets these in the browser after
 * hydration, and scripts/prerender.mjs bakes the SAME values into the HTML that
 * crawlers fetch. When these drifted apart, the served HTML said one thing and the
 * rendered page said another — which is exactly how a real page gets filed as a
 * soft 404.
 *
 * Add an entry here for every new public route.
 */

// Canonical origin. The apex and yotemarket.com both 308 to www, so canonicals
// MUST say www — a canonical pointing at a URL that redirects is a wasted signal.
export const SITE = 'https://www.yotemarket.co.ke';

export const DEFAULT = {
  title: 'YoteMarket — Shop Local. Delivered Fast.',
  description:
    "YoteMarket is Kenya's virtual mall — shop local stores, watch and buy from YoteFeed videos, chat and negotiate with sellers, pay with M-Pesa, and collect at your nearest hub.",
};

// Written for a person searching, not for a crawler: what the page is, and why
// they'd click. Keep titles ~60 chars and descriptions ~155 or Google truncates.
export const PAGES = {
  '/': DEFAULT,
  '/storefront': {
    title: 'Shop Kenyan stores online — YoteMarket',
    description:
      'Browse local Kenyan stores in one place — and shop YoteFeed videos. Chat and negotiate with sellers, pay with M-Pesa, and collect at your nearest pickup hub.',
  },
  '/feed': {
    title: 'YoteFeed — shoppable video from Kenyan shops',
    description:
      'Watch short videos from local Kenyan stores and buy what you see — tap the clip, chat to the seller, pay with M-Pesa and collect at your nearest hub.',
  },
  '/about': {
    title: 'About YoteMarket — Kenya’s virtual mall',
    description:
      "What YoteMarket is: Kenya's virtual mall where local shops sell via branded storefronts and YoteFeed videos, shoppers chat and pay with M-Pesa, and riders deliver to pickup hubs.",
  },
  '/pricing': {
    title: 'Pricing & plans for sellers — YoteMarket',
    description:
      'Simple monthly plans for Kenyan businesses: your own storefront, POS, delivery and AI tools. No commission on your sales.',
  },
  '/mobile': {
    title: 'The YoteMarket shopping app',
    description:
      'Shop local Kenyan stores from your phone: chat to sellers, pay with M-Pesa, track delivery and collect at a hub.',
  },
  '/apk': {
    title: 'Download the YoteMarket Android apps (APK)',
    description:
      'Official signed APKs for the YoteMarket shopper and rider apps — version, size and SHA-256 to verify each build, straight from the developer.',
  },
  '/rider': {
    title: 'Earn as a YoteMarket rider',
    description:
      'Deliver for YoteMarket and get paid per run. Pick up batched orders and drop at neighbourhood hubs.',
  },
  '/marketers': {
    title: 'Earn as a YoteMarket scout',
    description:
      'Sign up local businesses and earn for every verified merchant you bring to YoteMarket. Paid by M-Pesa.',
  },
  '/careers': {
    title: 'Careers at YoteMarket',
    description: 'Open roles at YoteMarket — help build the platform Kenyan shops sell on.',
  },
  '/help': {
    title: 'Help Centre — YoteMarket',
    description:
      'Answers on orders, delivery, pickup hubs, M-Pesa payments, refunds and selling on YoteMarket — or send us a message.',
  },
  '/contact': {
    title: 'Contact YoteMarket',
    description: 'Get in touch with the YoteMarket team.',
  },
  '/terms': {
    title: 'Terms of Service — YoteMarket',
    description: 'The terms that govern using YoteMarket as a shopper, seller, rider or scout.',
  },
  '/privacy': {
    title: 'Privacy Policy — YoteMarket',
    description: 'What data YoteMarket collects, why, and the choices you have.',
  },
  '/delete-account': {
    title: 'Delete your account or data — YoteMarket',
    description: 'How to permanently close your YoteMarket account, or ask us to erase your data.',
  },
};

// Signed-in app areas. Already Disallowed in robots.txt, but a crawler that reaches
// one anyway must not index a shell of somebody's dashboard.
export const GATED = ['/dashboard', '/staff', '/admin', '/hub', '/pos', '/marketers/app'];

// Public routes whose paths carry an id, so they can't be listed in PAGES.
// Keep in step with the storefront route array in App.jsx.
const WITH_ID = /^\/(store|product|feed)\/[^/]+$/;

/** Normalise a pathname the way canonicals do: no trailing slash, except for "/". */
export const normalisePath = (pathname) =>
  (pathname && pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/');

/** Does this path correspond to a real, public page? */
export function isKnownRoute(pathname) {
  const path = normalisePath(pathname);
  return WITH_ID.test(path) || Object.prototype.hasOwnProperty.call(PAGES, path);
}

/** The robots directive for a path.
 *
 *  Two things earn a noindex. The gated app areas, obviously. And any path matching
 *  NO route — those render <NotFound/>, which says "404 Page not found" while the
 *  server still answers 200, because a static SPA serves index.html for everything.
 *  A "not found" page returning 200 is exactly what Google calls a SOFT 404, and it
 *  is reported as a defect for as long as the URL is crawled. noindex makes it drop
 *  out cleanly instead. */
export function robotsFor(pathname) {
  const path = normalisePath(pathname);
  if (GATED.some((g) => path.startsWith(g))) return 'noindex, nofollow';
  return isKnownRoute(path) ? 'index, follow' : 'noindex, nofollow';
}
