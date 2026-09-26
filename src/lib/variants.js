/* Product variants — the one axis a merchant sets on a product (colour, size,
   capacity…), each value `{ id, name, hex?, image?, stock? }`.

   The same contract as the server (`firebase/functions/catalog.js`) and the
   Flutter app: ids are minted by the server and stable across renames, an order
   line names a variant by `variantId`, and a product WITH variants refuses a
   line without one ("choose which colour you want") — so the storefront asks
   before it lets the shopper pay, rather than failing at the last step. */

/** Cart line identity: the same product in two colours is two lines. A plain
 *  product keeps its bare id, so a cart saved before variants existed restores
 *  unchanged. */
export const lineKey = (pid, variantId) => (variantId ? `${pid}~${variantId}` : pid);

export const hasVariants = (p) => Array.isArray(p?.variants) && p.variants.length > 0;

/** The variant a line names, or null — also null when the merchant has since
 *  removed it, which the cart then treats as "not chosen". */
export const findVariant = (p, id) =>
  (id && hasVariants(p) ? p.variants.find((v) => v.id === id) || null : null);

/** Counted and out. A variant without its own count is never "sold out" here —
 *  the product's own availability decides. */
export const variantSoldOut = (v) => typeof v?.stock === 'number' && v.stock <= 0;

/** What the product page opens on: the first value the shopper can buy, else
 *  the first. */
export const defaultVariant = (p) =>
  (hasVariants(p) ? p.variants.find((v) => !variantSoldOut(v)) || p.variants[0] : null);

/** What the axis is called: the merchant's label, else "Colour" when every
 *  value carries a swatch, else "Option". */
export const variantLabel = (p) =>
  (p?.variantLabel || (hasVariants(p) && p.variants.every((v) => v.hex) ? 'Colour' : 'Option'));

/** A cart line for a product with variants that names none (or a removed one). */
export const needsVariant = (p, line) => hasVariants(p) && !findVariant(p, line?.variantId);

/** Readable ink on a swatch: dark on a light colour, white on a dark one. */
export const inkOn = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111827' : '#fff';
};

/** Named colours a merchant can tap instead of knowing a hex — the same list the
 *  app's product editor offers, so a colour set on either looks the same on both. */
export const VARIANT_PALETTE = [
  ['Black', '#111111'], ['White', '#f7f7f5'], ['Grey', '#8a8d91'], ['Silver', '#c7c9cc'],
  ['Gold', '#d4af37'], ['Beige', '#e3d5b8'], ['Brown', '#7a4b2a'], ['Red', '#d32f2f'],
  ['Maroon', '#7b1e2b'], ['Pink', '#f48fb1'], ['Orange', '#f57c00'], ['Yellow', '#fdd835'],
  ['Green', '#388e3c'], ['Olive', '#6b7536'], ['Teal', '#00897b'], ['Sky blue', '#64b5f6'],
  ['Blue', '#1e62d0'], ['Navy', '#1f2a44'], ['Purple', '#6a3fa0'], ['Lilac', '#c8a2c8'],
];

/** The server's limits (catalog.js), checked before the round trip. Returns an
 *  error message, or '' when the list is fine. */
export const validateVariants = (variants, label = '') => {
  if (String(label).trim().length > 24) return 'The variant label is too long (24 characters).';
  if (variants.length > 20) return 'A product can have at most 20 variants.';
  const seen = new Set();
  for (const v of variants) {
    const n = String(v.name || '').trim().replace(/\s+/g, ' ');
    if (!n) return 'Every variant needs a name.';
    if (n.length > 40) return `"${n.slice(0, 40)}…" is too long for a variant name (40 characters).`;
    if (seen.has(n.toLowerCase())) return `Two variants are both called "${n}".`;
    seen.add(n.toLowerCase());
  }
  return '';
};

/** A variant list from a product document, tolerant of junk: keeps values with
 *  an id and a name, normalises hex to `#rrggbb`. */
export const normVariants = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .filter((v) => v && v.id && v.name)
    .map((v) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(typeof v.hex === 'string' ? v.hex.trim() : '');
      return {
        id: String(v.id),
        name: String(v.name),
        hex: m ? `#${m[1].toLowerCase()}` : null,
        image: typeof v.image === 'string' && v.image ? v.image : null,
        stock: typeof v.stock === 'number' && Number.isFinite(v.stock) ? v.stock : null,
      };
    });
