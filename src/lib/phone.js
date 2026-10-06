/* phone.js — turning a number as people type it into one a link can dial.

   Marketers, riders and most merchants run their working day on WhatsApp, but the
   staff console only ever showed their number as text (or a tel: link), so reaching
   them on the channel they actually read meant retyping the number into a phone.
   wa.me wants the full international number as bare digits — 2547XXXXXXXX, no plus,
   no leading zero — and a number in any other shape opens a "not on WhatsApp" page.

   Kenyan mobile numbers are recognised in every way people write them. A number in
   another country's format is only accepted when it was written with its + prefix,
   because without one there is no telling which country it belongs to. */

/** Bare international digits for a phone number, or null when it can't be told. */
export function msisdn(raw) {
  const s = String(raw == null ? '' : raw).trim();
  const d = s.replace(/\D/g, '');
  if (/^254[17]\d{8}$/.test(d)) return d;              // 2547… / +254 7…
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`; // 07… / 01…
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;           // 7… with the 0 dropped
  if (s.startsWith('+') && d.length >= 8 && d.length <= 15) return d;
  return null;
}

/** A wa.me chat link for a number, or null when the number can't be resolved. */
export const whatsappLink = (raw) => {
  const m = msisdn(raw);
  return m ? `https://wa.me/${m}` : null;
};

/** A tel: link that dials the number as written, spaces removed. */
export const telLink = (raw) => {
  const v = String(raw == null ? '' : raw).replace(/[^\d+]/g, '');
  return v ? `tel:${v}` : null;
};
