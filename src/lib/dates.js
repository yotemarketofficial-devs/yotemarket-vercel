/* dates.js — whatever the backend sent as a date, as epoch milliseconds.

   The staff tables sort numbers numerically and EVERYTHING ELSE as text (DataTable in
   kits/staff/ui.jsx). That is right for epoch ms and for ISO strings, and badly wrong for
   the other shapes dates arrive in here:

   • Firebase Auth's user metadata (creationTime, lastSignInTime) is an RFC-1123 string —
     "Tue, 06 Oct 2026 13:00:00 GMT". Sorted as text, Accounts → Joined ordered people by
     weekday name (Fri, Mon, Sat, Sun, Thu, Tue, Wed) and then by day of the month.
   • A Firestore Timestamp a callable forgot to convert arrives as {_seconds,_nanoseconds},
     which stringifies to "[object Object]", so every row compares equal.
   • `value || 0` puts the NUMBER 0 among strings, so the rows with no date are compared
     as the text "0" instead of going last.

   So a sort key for a date goes through toMillis(), and a missing or unreadable date is
   null — which the table always puts last, in either direction. */

/** Epoch ms for any date shape we receive, or null when there is no usable date.
 *  0 and negatives count as missing: `|| 0` is how this codebase spells "no date", and
 *  no YoteMarket record is from 1970. */
export function toMillis(v) {
  if (v == null || v === '') return null;
  let ms = null;
  if (typeof v === 'number') ms = v;
  else if (v instanceof Date) ms = v.getTime();
  else if (typeof v === 'string') {
    const s = v.trim();
    // A bare run of digits is already epoch ms (or seconds, if it is that short).
    if (/^\d{12,}$/.test(s)) ms = Number(s);
    else if (/^\d{9,11}$/.test(s)) ms = Number(s) * 1000;
    else ms = Date.parse(s);
  } else if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') ms = v.toMillis();
    else {
      const sec = typeof v.seconds === 'number' ? v.seconds : v._seconds;
      const ns = typeof v.nanoseconds === 'number' ? v.nanoseconds : v._nanoseconds;
      if (typeof sec === 'number') ms = sec * 1000 + Math.floor((typeof ns === 'number' ? ns : 0) / 1e6);
    }
  }
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** A short day for a table cell — "6 Oct 2026" — or an em-dash when there is no date.
 *  Goes through toMillis so an unreadable value shows "—", never "Invalid Date". */
export function fmtDay(v) {
  const ms = toMillis(v);
  return ms ? new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
