/**
 * cv-text.test.js — telling a LinkedIn profile export from an ordinary CV.
 *
 * This one distinction carries the whole two-source check. Filing a LinkedIn export as a
 * CV compares the profile against itself and reports perfect agreement — which is the
 * single outcome that makes the comparison worthless, and it fails silently.
 *
 * The opposite mistake matters just as much: nearly every CV prints a LinkedIn address in
 * its contact line, and treating those as exports would misfile the majority of real CVs.
 * So the tests below push from both sides.
 */
import { describe, it, expect } from 'vitest';
import { detectCvSource, CV_ACCEPT, extractCvText } from './cv-text.js';

/* Shaped like LinkedIn's actual "Save to PDF" output: a Contact block carrying the profile
   URL and a literal "(LinkedIn)", then its own section furniture. */
const LINKEDIN_EXPORT = `
   Contact
   www.linkedin.com/in/jane-wanjiku-123
   (LinkedIn)

   Top Skills
   Logistics
   Operations

   Jane Wanjiku
   Head of Operations at Acme
   Nairobi County, Kenya

   Experience
   Acme — Head of Operations
   January 2021 - Present

   Education
   University of Nairobi
   Page 1 of 3
`;

/* An ordinary CV that happens to list a LinkedIn address, which most of them do. */
const PLAIN_CV = `
   JANE WANJIKU
   Nairobi, Kenya | jane@example.com | +254 712 345 678
   linkedin.com/in/jane-wanjiku-123

   PROFESSIONAL SUMMARY
   Operations leader with eight years in logistics.

   WORK EXPERIENCE
   Acme, Head of Operations, 2021 - Present

   EDUCATION
   BSc Computer Science, University of Nairobi
`;

describe('detectCvSource', () => {
  it('recognises a LinkedIn profile export', () => {
    const d = detectCvSource(LINKEDIN_EXPORT);
    expect(d.source).toBe('linkedin');
    expect(d.confident).toBe(true);
  });

  it('does NOT call an ordinary CV a LinkedIn export just for citing a profile URL', () => {
    // The common-case regression. Most CVs print the address in their contact line, and
    // misfiling them would collapse the comparison for the majority of real uploads.
    const d = detectCvSource(PLAIN_CV);
    expect(d.source).toBe('cv');
    expect(d.confident).toBe(false);
  });

  it('still recovers the profile URL from a plain CV', () => {
    // Worth having even when the document is a CV — it fills in a link nobody typed.
    expect(detectCvSource(PLAIN_CV).linkedinUrl).toBe('https://www.linkedin.com/in/jane-wanjiku-123');
  });

  it('normalises the URL it recovers', () => {
    expect(detectCvSource(LINKEDIN_EXPORT).linkedinUrl).toBe('https://www.linkedin.com/in/jane-wanjiku-123');
  });

  it('handles a country subdomain in the printed URL', () => {
    const d = detectCvSource('Contact\nke.linkedin.com/in/jane-doe\n(LinkedIn)\nTop Skills');
    expect(d.source).toBe('linkedin');
    expect(d.linkedinUrl).toBe('https://www.linkedin.com/in/jane-doe');
  });

  it('reports no URL when there is none', () => {
    expect(detectCvSource(PLAIN_CV.replace(/linkedin\.com\/in\/[a-z0-9-]+/i, '')).linkedinUrl).toBeNull();
  });

  it('treats an empty or absent document as a CV rather than throwing', () => {
    ['', null, undefined].forEach((v) => {
      const d = detectCvSource(v);
      expect(d.source).toBe('cv');
      expect(d.linkedinUrl).toBeNull();
    });
  });

  it('needs more than one weak marker on its own', () => {
    // "Top Skills" alone, with no URL and no LinkedIn furniture, is not enough.
    expect(detectCvSource('Top Skills\nLogistics\nOperations').source).toBe('cv');
  });
});

describe('CV_ACCEPT', () => {
  it('offers the formats the extractor can actually read', () => {
    expect(CV_ACCEPT).toContain('.pdf');
    expect(CV_ACCEPT).toContain('.docx');
  });

  it('offers the media types too, not just the extensions', () => {
    // A .docx from Drive or a Windows share is offered to the picker by media type with no
    // extension; listing only '.docx' greyed out files the person could legitimately pick.
    expect(CV_ACCEPT).toContain('application/pdf');
    expect(CV_ACCEPT).toContain('officedocument.wordprocessingml.document');
  });

  it('does not invite a format that would extract to nothing', () => {
    // An image of a CV has no text layer; accepting one produces a blank draft.
    expect(CV_ACCEPT).not.toContain('image/');
    expect(CV_ACCEPT).not.toContain('.jpg');
    expect(CV_ACCEPT).not.toContain('.doc,');
  });
});

/* A stand-in for a picked file. extractCvText only ever asks for these four things, so a
   plain object exercises the real routing without needing a DOM File. */
const pick = (name, body = '', type = '') => ({
  name, type, size: body.length || 1,
  text: async () => body,
  arrayBuffer: async () => new TextEncoder().encode(body).buffer,
});

describe('extractCvText — formats it must refuse rather than mangle', () => {
  it('refuses RTF instead of returning its control words as a career history', async () => {
    // Long enough to clear the too-short guard, which is exactly why this slipped through:
    // the draft came back full of \\fonttbl junk rather than empty.
    const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\pard Jane Wanjiku \\b Operations \\b0 par }'.repeat(4);
    await expect(extractCvText(pick('cv.rtf', rtf))).rejects.toThrow(/RTF/i);
  });

  it('refuses RTF offered by media type with a misleading extension', async () => {
    await expect(extractCvText(pick('cv.txt', 'x'.repeat(200), 'application/rtf'))).rejects.toThrow(/RTF/i);
  });

  it('still refuses old binary .doc, naming the fix', async () => {
    await expect(extractCvText(pick('cv.doc', 'x'.repeat(200)))).rejects.toThrow(/\.docx or PDF/i);
  });

  it('refuses a format it cannot read at all rather than guessing', async () => {
    await expect(extractCvText(pick('cv.pages', 'x'.repeat(200)))).rejects.toThrow(/Cannot read/i);
  });

  it('refuses a file with barely any text in it', async () => {
    await expect(extractCvText(pick('cv.txt', 'Jane'))).rejects.toThrow(/Barely any text/i);
  });

  it('reads a plain-text CV', async () => {
    const body = 'Jane Wanjiku\nHead of Operations\n'.repeat(6);
    await expect(extractCvText(pick('cv.txt', body))).resolves.toContain('Head of Operations');
  });
});
