// socials.js — YoteMarket's official social accounts, one source of truth so the
// footer links can't drift apart again. The handle is "yotemarket" everywhere except
// Instagram ("yotemarket_"). WhatsApp is a contact number (wa.me), not a handle.
export const SOCIAL_LINKS = [
  { label: 'Facebook',  icon: 'fa-facebook-f',  url: 'https://www.facebook.com/yotemarket' },
  { label: 'Instagram', icon: 'fa-instagram',   url: 'https://www.instagram.com/yotemarket_' },
  { label: 'X',         icon: 'fa-x-twitter',   url: 'https://x.com/yotemarket' },
  { label: 'TikTok',    icon: 'fa-tiktok',      url: 'https://www.tiktok.com/@yotemarket' },
  { label: 'LinkedIn',  icon: 'fa-linkedin-in', url: 'https://www.linkedin.com/company/yotemarket' },
  { label: 'YouTube',   icon: 'fa-youtube',     url: 'https://www.youtube.com/@yotemarket' },
  { label: 'WhatsApp',  icon: 'fa-whatsapp',    url: 'https://wa.me/254720730861' },
];

// The organisation's PROFILE urls, for schema.org `sameAs`. WhatsApp is deliberately
// absent: sameAs means "another page about this same entity", and a wa.me link is a way
// to contact us, not a profile of us. It is published as a contactPoint instead.
export const ORG_SAME_AS = SOCIAL_LINKS
  .filter((s) => s.label !== 'WhatsApp')
  .map((s) => s.url);

// The WhatsApp business line, as a contact rather than an identity.
export const WHATSAPP_NUMBER = '+254720730861';
export const WHATSAPP_URL = 'https://wa.me/254720730861';

/* The founders, as ONE source of truth.
 *
 * These urls were duplicated in three places — pages/About.jsx, the JSON-LD in
 * index.html, and here — which is how an entity's identity quietly drifts apart. Search
 * engines and AI answer engines resolve "who runs YoteMarket" by matching the profiles a
 * page claims (`sameAs`, rel="me") against the profiles that link back. A stale or
 * mismatched url doesn't just go unused: it splits the entity.
 *
 * `id` matches the fragment used by the Person nodes in index.html's @graph.
 * Only add a url here that genuinely belongs to that person and is publicly reachable.
 */
export const FOUNDERS = [
  {
    id: 'moses-kiambi',
    name: 'Moses Kiambi',
    role: 'Chief Executive Officer (CEO)',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/moses-kiambi-84043625b' },
    ],
  },
  {
    id: 'arnold-kamau',
    name: 'Arnold Kamau',
    role: 'Chief Operating Officer (COO)',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/arnold-w-554439198' },
    ],
  },
];

/** Every profile url we claim for one founder — what their Person `sameAs` must say. */
export const founderSameAs = (id) =>
  (FOUNDERS.find((f) => f.id === id)?.links || []).map((l) => l.url);
