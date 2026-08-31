/* password.js — what counts as an acceptable staff password.
 *
 * WHY THIS IS STRICTER THAN FIREBASE. Firebase Auth enforces six characters and nothing
 * else, which is a reasonable floor for a shopper account and far too low for this one.
 * A staff console password reaches customer personal data, merchant commercial terms,
 * employment records and the button that disburses salaries. The blast radius is not the
 * same, so the rule should not be either.
 *
 * IT REFUSES BY NAMING THE PROBLEM, NOT BY SCORING. A meter that says "weak" tells
 * somebody they have failed without telling them what to change, so they add a "1" and
 * try again. Every rule here returns a sentence describing the specific thing to fix.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: force a character-class mix (an upper, a digit, a
 * symbol). Composition rules of that kind reliably produce `Password1!` — they push people
 * toward predictable substitutions rather than length, which is the property that actually
 * resists guessing. NIST dropped them for the same reason. Length and "not obviously
 * guessable for THIS person" are what is checked.
 *
 * Pure — no firebase, no network — so the rules can be tested directly.
 */

/** Long enough that guessing is impractical, short enough that people will still use a
 *  passphrase rather than writing it on a card. Three words comfortably clears it. */
export const MIN_LENGTH = 12;

/** Firebase rejects above this. Caught here so the failure names the limit instead of
 *  surfacing an SDK error code. */
export const MAX_LENGTH = 4096;

/* Passwords that appear at the top of every breach corpus, plus the ones this company
 * specifically invites. A short list checked properly beats a long list checked lazily:
 * these are compared against the password with digits and punctuation stripped, so
 * `Yotemarket@2026` is caught by the entry `yotemarket`. */
const COMMON = [
  'password', 'passw0rd', 'letmein', 'welcome', 'admin', 'administrator',
  'qwerty', 'qwertyuiop', 'asdfgh', 'zxcvbn', 'iloveyou', 'monkey', 'dragon',
  'football', 'baseball', 'sunshine', 'princess', 'superman', 'trustno',
  'abc', 'abcd', 'test', 'changeme', 'secret', 'default', 'temp', 'temporary',
  // The ones people reach for here, which a generic list would miss entirely.
  'yotemarket', 'yote', 'nairobi', 'kenya', 'safaricom', 'mpesa', 'jambo', 'karibu',
];

const strip = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/** Runs of the same character, and simple ascending/descending sequences. */
function isLowVariety(pw) {
  const chars = new Set(pw.toLowerCase());
  // "aaaaaaaaaaaa" clears the length rule and is worthless.
  if (chars.size <= 4) return true;
  const seqs = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiopasdfghjklzxcvbnm'];
  const low = pw.toLowerCase();
  for (const seq of seqs) {
    const rev = [...seq].reverse().join('');
    for (let i = 0; i + 6 <= seq.length; i++) {
      if (low.includes(seq.slice(i, i + 6)) || low.includes(rev.slice(i, i + 6))) return true;
    }
  }
  return false;
}

/** Words from the person's own identity — the first thing anyone targeting them tries. */
function personalTokens({ email, name } = {}) {
  const out = [];
  const local = String(email || '').split('@')[0];
  if (local) out.push(local);
  const domain = String(email || '').split('@')[1];
  if (domain) out.push(domain.split('.')[0]);
  String(name || '').split(/\s+/).forEach((w) => w && out.push(w));
  return out.map(strip).filter((t) => t.length >= 4);
}

/**
 * Check a proposed password.
 *
 * `{ ok, problems[] }` — every failing rule, not just the first, so somebody fixing one
 * thing does not discover the next only after resubmitting.
 */
export function checkPassword(password, { email, name, current } = {}) {
  const pw = String(password == null ? '' : password);
  const problems = [];

  if (!pw) return { ok: false, problems: ['Enter a new password.'] };
  if (pw.length < MIN_LENGTH) {
    problems.push(`Use at least ${MIN_LENGTH} characters — this one has ${pw.length}. Three unrelated words work well.`);
  }
  if (pw.length > MAX_LENGTH) problems.push(`That is longer than the ${MAX_LENGTH}-character limit.`);
  if (pw.trim() !== pw) problems.push('Remove the space at the start or end — it is easy to lose and hard to notice.');

  const bare = strip(pw);
  const hit = COMMON.find((c) => bare.includes(c));
  if (hit) problems.push(`Contains "${hit}", which is among the first things anyone guessing would try.`);

  if (isLowVariety(pw)) {
    problems.push('Too repetitive or too close to a keyboard run — mix in some unrelated words.');
  }

  const mine = personalTokens({ email, name }).find((t) => bare.includes(t));
  if (mine) problems.push(`Contains "${mine}" from your own name or address, which is public knowledge.`);

  if (current && pw === String(current)) problems.push('That is the password you are already using.');

  return { ok: problems.length === 0, problems };
}

/**
 * A coarse indicator for the UI, derived only from things that genuinely help: length and
 * how many distinct characters are in play.
 *
 * Presented as guidance, never as a gate — `checkPassword` decides what is allowed. A
 * meter that blocks on its own score teaches people to game the meter.
 */
export function passwordStrength(password) {
  const pw = String(password == null ? '' : password);
  if (!pw) return { score: 0, label: '', tone: 'red' };
  const variety = new Set(pw).size;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 16) score++;
  if (variety >= 8) score++;
  if (variety >= 12) score++;
  const capped = Math.min(score, 4);
  return {
    score: capped,
    label: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][capped],
    tone: ['red', 'red', 'amber', 'ok', 'ok'][capped],
  };
}
