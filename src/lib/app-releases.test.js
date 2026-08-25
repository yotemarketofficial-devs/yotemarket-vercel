import { describe, it, expect, vi, afterEach } from 'vitest';
import { INDEX_URL, publicUrl, metadataUrl, apkPath, objectExists, fetchReleases, mergeReleases, toMb } from './app-releases.js';

/* What these guard, all of it learned the hard way:
 *
 * Firebase Storage's two endpoints disagree about CORS. The download endpoint
 * (`?alt=media`) sends no Access-Control-Allow-Origin, so any browser fetch of it is
 * rejected before the page sees the 200; the metadata endpoint (no `?alt=media`) sends
 * `Access-Control-Allow-Origin: *`. Every caller in app-releases.js swallows a failure
 * and falls back, so getting this wrong is silent: /apk read the index cross-origin and
 * showed "not published yet" over a live build, and objectExists answered "nothing
 * there" for every path — including the published builds it exists to protect.
 *
 * So: the index is read same-origin (a vercel.json rewrite does the cross-origin part
 * server-side), and existence checks go to metadata. */

afterEach(() => { vi.unstubAllGlobals(); });

const respond = (impl) => vi.stubGlobal('fetch', vi.fn(impl));

describe('endpoints', () => {
  it('reads the index from a same-origin path, never the download URL', () => {
    expect(INDEX_URL.startsWith('/')).toBe(true);
    expect(INDEX_URL).not.toMatch(/^https?:/);
  });

  it('keeps ?alt=media for downloads and drops it for metadata', () => {
    expect(publicUrl('app_releases/index.json')).toMatch(/\?alt=media$/);
    expect(metadataUrl('app_releases/index.json')).not.toContain('alt=media');
    expect(metadataUrl('app_releases/index.json')).toContain('app_releases%2Findex.json');
  });

  it('gives every build its own path, keyed on version AND version code', () => {
    expect(apkPath('rider', '1.0.0', 4)).not.toBe(apkPath('rider', '1.0.0', 5));
    expect(apkPath('rider', '1.0.0', 4)).toBe('app_releases/rider/yotemarket-rider-1.0.0-4.apk');
  });
});

describe('fetchReleases', () => {
  it('asks for the same-origin path', async () => {
    respond(async () => ({ ok: true, json: async () => ({ rider: { release: { version: '1.0.0' } } }) }));
    await fetchReleases();
    expect(globalThis.fetch).toHaveBeenCalledWith(INDEX_URL, expect.anything());
  });

  it('falls back to {} rather than throwing when the read fails', async () => {
    respond(async () => { throw new Error('CORS'); });
    expect(await fetchReleases()).toEqual({});
    respond(async () => ({ ok: false }));
    expect(await fetchReleases()).toEqual({});
  });
});

describe('objectExists', () => {
  it('checks the metadata endpoint, which is the one CORS allows', async () => {
    respond(async () => ({ ok: true, status: 200 }));
    expect(await objectExists('app_releases/rider/x.apk')).toBe(true);
    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).not.toContain('alt=media');
  });

  it('reports a free path for 404, and stays quiet on a network failure', async () => {
    respond(async () => ({ ok: false, status: 404 }));
    expect(await objectExists('app_releases/rider/x.apk')).toBe(false);
    respond(async () => { throw new Error('offline'); });
    expect(await objectExists('app_releases/rider/x.apk')).toBe(false);
  });
});

describe('mergeReleases', () => {
  it('overlays a published build on the bundled entry', () => {
    const merged = mergeReleases({ rider: { release: { version: '1.0.0', sizeMb: 90.1, url: 'https://x/y.apk' } } });
    const rider = merged.find((a) => a.slug === 'rider');
    expect(rider.release.version).toBe('1.0.0');
    expect(rider.release.url).toBe('https://x/y.apk');
  });

  it('leaves apps with nothing published untouched, and ignores junk', () => {
    const merged = mergeReleases({ shopper: null, rider: { release: { version: '', nonsense: 1 } } });
    expect(merged.find((a) => a.slug === 'shopper').release.version).toBe('');
    const rider = merged.find((a) => a.slug === 'rider');
    expect(rider.release.version).toBe('');       // an empty value never overrides
    expect('nonsense' in rider.release).toBe(false); // unknown keys are not copied in
  });

  it('takes an uptodown listing from the index', () => {
    const merged = mergeReleases({ shopper: { uptodownUrl: 'https://yotemarket.en.uptodown.com/android' } });
    expect(merged.find((a) => a.slug === 'shopper').uptodownUrl).toContain('uptodown.com');
  });
});

describe('toMb', () => {
  it('reports whole megabytes to one decimal', () => {
    expect(toMb(94520378)).toBe(90.1);
    expect(toMb(0)).toBe(0);
  });
});
