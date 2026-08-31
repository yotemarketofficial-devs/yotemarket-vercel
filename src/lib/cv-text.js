/* cv-text.js — pulling the text out of a CV file, in the browser.
 *
 * WHY IN THE BROWSER RATHER THAN ON THE SERVER: the callable that turns text into a resume
 * draft already exists and is deployed. Doing the extraction here means no new backend
 * dependency, no redeploy of a functions project that is already up against its Cloud Run
 * CPU quota, and the CV itself never has to be uploaded anywhere for the common case where
 * nobody wants it kept. The file is read, the text is taken, the file is dropped.
 *
 * Everything is loaded ON DEMAND. pdfjs is over a megabyte and mammoth is not small; both
 * are dynamically imported the moment somebody actually picks a file, so neither touches
 * the first-load budget of a page most people never use this on.
 *
 * WHAT COMES OUT IS RAW TEXT, NOT A RESUME. A PDF has no idea what a job title is — it
 * knows glyphs and positions. The structure is worked out afterwards by the model, and
 * then reviewed by a person, which is why a slightly ragged extraction here is survivable
 * and a silently empty one is not.
 */

/** What a person may hand us. Kept narrow deliberately: an image of a CV extracts to
 *  nothing, and accepting one would produce an empty draft rather than an honest refusal. */
export const CV_ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,text/plain';

/** Roughly the point past which a CV is not a CV. Guards the model call, and catches
 *  somebody picking a 200-page report by mistake. */
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_CHARS = 60000;

const ext = (name) => String(name || '').toLowerCase().split('.').pop();

/** A friendlier failure than "undefined is not a function". */
class CvTextError extends Error {}

/* ── Is this a LinkedIn profile export? ───────────────────────────────────────
 *
 * LinkedIn puts a "Save to PDF" button on every profile (More → Save to PDF). That export
 * is the best of both worlds and the reason it beats fetching the page: it is the FULL
 * profile rather than the trimmed public view, it costs the person one click, it arrives
 * with their knowledge, and no auth wall or bot-block stands in the way. It is also
 * unmistakably a LinkedIn document once you look at the text.
 *
 * Detecting it matters because of what it feeds. Filing a LinkedIn export as "CV" would
 * compare the profile against itself and report perfect agreement — the one outcome that
 * makes the whole two-source check worthless. Getting the source right without relying on
 * anybody remembering a toggle is worth the twenty lines.
 */
const LINKEDIN_MARKERS = [
  /linkedin\.com\/in\//i,      // the profile URL, printed in the Contact block
  /\(LinkedIn\)/i,             // literal, beside the URL
  /\bTop Skills\b/,            // a LinkedIn section heading, not a CV convention
];

/**
 * What the text looks like it came from, and the profile URL if it is in there.
 *
 * Conservative: it takes TWO markers to call something a LinkedIn export, or one if that
 * one is the profile URL itself. A CV that merely mentions a LinkedIn address in its
 * header is still a CV, and misfiling it as the profile would collapse the comparison.
 */
export function detectCvSource(text) {
  const t = String(text || '');
  const urlMatch = t.match(/(?:https?:\/\/)?(?:[a-z]{2}\.)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i);
  const hits = LINKEDIN_MARKERS.filter((re) => re.test(t)).length;

  // The URL alone is not enough — CVs print it in the contact line all the time. What
  // separates an export is the URL *plus* LinkedIn's own furniture around it.
  const isExport = hits >= 2 || (/\(LinkedIn\)/i.test(t) && !!urlMatch);

  return {
    source: isExport ? 'linkedin' : 'cv',
    linkedinUrl: urlMatch ? `https://www.linkedin.com/in/${urlMatch[1].replace(/\/+$/, '')}` : null,
    confident: isExport,
  };
}

async function fromPdf(file) {
  // The worker has to be told where it lives or pdfjs tries to fetch one from a CDN that
  // is not there. Vite resolves this specifier to a real bundled asset URL.
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Items carry their own position; joining on a space is enough for a model to read,
    // and trying to reconstruct columns here would be guesswork that makes it worse.
    pages.push(content.items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' '));
    if (pages.join(' ').length > MAX_CHARS) break;
  }
  return pages.join('\n\n');
}

async function fromDocx(file) {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value || '';
}

/**
 * A CV file → its text.
 *
 * Throws with something a person can act on. The failure that matters is a PDF that is a
 * SCAN: it opens fine, has pages, and contains no text layer at all, so a naive reader
 * returns an empty string and the draft silently comes back blank. That case is detected
 * and named, because "nothing came out" and "this is a photo of a CV" call for completely
 * different responses from whoever is holding it.
 */
export async function extractCvText(file) {
  if (!file) throw new CvTextError('No file chosen.');
  if (file.size > MAX_BYTES) {
    throw new CvTextError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large for a CV. Send the document rather than a scan.`);
  }

  const e = ext(file.name);
  let text = '';

  if (e === 'pdf' || file.type === 'application/pdf') {
    text = await fromPdf(file);
    if (!text.trim()) {
      throw new CvTextError(
        'That PDF has no text in it — it is almost certainly a scan or a photo. ' +
        'Ask for the original document, or paste the text in by hand.');
    }
  } else if (e === 'docx') {
    text = await fromDocx(file);
  } else if (['txt', 'md', 'rtf'].includes(e) || (file.type || '').startsWith('text/')) {
    text = await file.text();
  } else if (e === 'doc') {
    // Old binary .doc is a different format entirely and mammoth does not read it.
    throw new CvTextError('Old .doc files cannot be read. Save it as .docx or PDF and try again.');
  } else {
    throw new CvTextError(`Cannot read a .${e || '?'} file. Use a PDF, a .docx, or paste the text.`);
  }

  const clean = String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length < 60) {
    throw new CvTextError('Barely any text came out of that file. Check it is the right document, or paste the text in by hand.');
  }
  return clean.slice(0, MAX_CHARS);
}
