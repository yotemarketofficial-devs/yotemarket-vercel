/* The 47 Kenyan counties, for every county picker in the app.
 *
 * This lives in lib rather than inside one kit because three different audiences pick a
 * county — a scout claiming a territory (staff console), a merchant saying where their
 * shop is (dashboard), and staff correcting either. One list, or they drift.
 *
 * SERVER IS THE AUTHORITY. `firebase/functions/geography.js` holds the same 47 with their
 * official codes and does the canonicalising; a callable refuses a county it cannot
 * resolve, so this list is the convenience that stops the refusal happening — a picker
 * rather than a text box is what stops one place becoming four spellings.
 *
 * Order is constitutional (code 001 Mombasa → 047 Nairobi), not alphabetical, because it
 * matches the official list anything filed against government has to use.
 */
export const KE_COUNTY_NAMES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 'Garissa', 'Wajir',
  'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos',
  'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana',
  'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega',
  'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii',
  'Nyamira', 'Nairobi',
];

/** Alphabetical, for a long picker where someone is hunting for their own county. */
export const KE_COUNTIES_AZ = [...KE_COUNTY_NAMES].sort((a, b) => a.localeCompare(b));

export default KE_COUNTY_NAMES;
