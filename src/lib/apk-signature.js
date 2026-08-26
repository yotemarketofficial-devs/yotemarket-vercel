/* Reading the signing certificate out of an APK, in the browser.
 *
 * WHY: /apk is the URL Uptodown and other mirrors fetch, and the staff uploader only ever
 * checked the file EXTENSION. Publishing a debug-signed build there is not a cosmetic
 * mistake — Android keys update eligibility on the signing certificate, so a build signed
 * with a different key CANNOT install over an existing one. The user gets a bare "App not
 * installed" and has to uninstall first, losing their data. Do that once to a mirror's
 * listing and every person who took the first build is stranded.
 *
 * There is no fixed "debug certificate" to blacklist, either — the Android debug key is
 * generated per machine, so its fingerprint differs on every dev's laptop. The only check
 * that actually works is pinning: this build must be signed by the SAME certificate as the
 * last one. Hence a fingerprint rather than a yes/no.
 *
 * HOW: an APK is a ZIP with an extra "APK Signing Block" wedged between the file entries
 * and the central directory. v1 (jar) signatures live in META-INF and are long dead; v2/v3
 * live in that block, which is why `keytool -printcert -jarfile` reads nothing from a
 * modern APK and apksigner is needed instead. We walk:
 *
 *   EOCD  ->  central-directory offset
 *   the 24 bytes before it  ->  block size + "APK Sig Block 42" magic
 *   the block  ->  id/value pairs; 0x7109871a is v2, 0xf05368c0 is v3
 *   the v2/v3 value  ->  signers -> signed data -> certificates -> first cert (DER)
 *   SHA-256 of that DER  ->  the same hex apksigner prints as "certificate SHA-256 digest"
 *
 * Everything is little-endian and length-prefixed. Reads are bounds-checked because this
 * parses a file a human chose off their desktop: a truncated or mislabelled file must
 * produce a clear "couldn't read this" and never a wrong fingerprint.
 */

const EOCD_SIG = 0x06054b50;
const APK_SIG_BLOCK_MAGIC = 'APK Sig Block 42';
const ID_SCHEME_V2 = 0x7109871a;
const ID_SCHEME_V3 = 0xf05368c0;

/** A parse failure the UI should show verbatim — these are all "this file isn't what you think". */
export class ApkSignatureError extends Error {}

const hex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Find the End Of Central Directory record, scanning backwards.
 * The EOCD is last in the file but carries a variable-length comment, so its position
 * isn't fixed — hence the scan rather than a constant offset.
 */
function findEocd(view) {
  const maxComment = 0xffff;
  const start = Math.max(0, view.byteLength - maxComment - 22);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  throw new ApkSignatureError('That file is not a ZIP archive, so it cannot be an APK.');
}

/** Read `len` bytes at `off` as a UTF-8/latin string. */
function str(view, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(off + i));
  return s;
}

/** 64-bit little-endian length as a Number. APK blocks are far below 2^53, so this is safe. */
function u64(view, off) {
  const lo = view.getUint32(off, true);
  const hi = view.getUint32(off + 4, true);
  return hi * 0x100000000 + lo;
}

/**
 * The first certificate in a v2/v3 signer block, as DER bytes.
 *
 * Layout inside the scheme value:
 *   uint32 len(signers) | { uint32 len(signer) | uint32 len(signedData) | signedData ... }
 * and inside signedData:
 *   uint32 len(digests) | digests | uint32 len(certificates) | { uint32 len(cert) | DER }
 *
 * v3 adds minSdk/maxSdk AFTER the certificates, so reading only as far as the first
 * certificate works identically for both.
 */
function firstCertificate(view, valueOff, valueLen) {
  const end = valueOff + valueLen;
  const need = (off, n) => {
    if (off + n > end) throw new ApkSignatureError('The signing block is truncated — the file may be incomplete.');
  };

  need(valueOff, 4);
  // Step into the signers sequence, then the first signer, then its signed data.
  let p = valueOff + 4;            // skip len(signers)
  need(p, 4); p += 4;              // skip len(first signer)
  need(p, 4); p += 4;              // skip len(signedData)

  need(p, 4);
  const digestsLen = view.getUint32(p, true);
  p += 4 + digestsLen;             // skip the digests wholesale

  need(p, 4);
  const certsLen = view.getUint32(p, true);
  p += 4;
  need(p, 4);
  const certLen = view.getUint32(p, true);
  p += 4;
  if (certLen <= 0 || certLen > certsLen) {
    throw new ApkSignatureError('The signing block declares a certificate of an impossible size.');
  }
  need(p, certLen);
  return view.buffer.slice(view.byteOffset + p, view.byteOffset + p + certLen);
}

/**
 * The signing certificate of an APK File/Blob.
 * Resolves { sha256, scheme } — sha256 is lower-case hex, matching apksigner's
 * "certificate SHA-256 digest". Throws ApkSignatureError with a readable reason.
 */
export async function readApkCertificate(file) {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);
  if (buf.byteLength < 64) throw new ApkSignatureError('That file is too small to be an APK.');

  const eocd = findEocd(view);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (cdOffset < 24 || cdOffset > buf.byteLength) {
    throw new ApkSignatureError('The archive directory is out of bounds — the file looks corrupt.');
  }

  // The signing block sits immediately before the central directory, and ends with its
  // own size followed by a 16-byte magic. No magic = unsigned, or v1-only (also dead).
  if (str(view, cdOffset - 16, 16) !== APK_SIG_BLOCK_MAGIC) {
    throw new ApkSignatureError(
      'This APK has no v2/v3 signature block. An unsigned build, or one signed only with the '
      + 'old JAR scheme, cannot be published — Android will not install it.',
    );
  }

  const blockSize = u64(view, cdOffset - 24);
  const blockStart = cdOffset - blockSize - 8;
  if (blockStart < 0) throw new ApkSignatureError('The signing block size is impossible — the file looks corrupt.');

  // Walk the id/value pairs looking for v3 first: when an APK carries both, v3 is the
  // one Android actually verifies on a modern device.
  let p = blockStart + 8;
  const pairsEnd = cdOffset - 24;
  const found = {};
  while (p < pairsEnd) {
    const pairLen = u64(view, p);
    if (pairLen < 4 || p + 8 + pairLen > cdOffset) break;
    const id = view.getUint32(p + 8, true);
    if (id === ID_SCHEME_V2 || id === ID_SCHEME_V3) {
      found[id] = { off: p + 12, len: pairLen - 4 };
    }
    p += 8 + pairLen;
  }

  const pick = found[ID_SCHEME_V3]
    ? { ...found[ID_SCHEME_V3], scheme: 'v3' }
    : found[ID_SCHEME_V2]
      ? { ...found[ID_SCHEME_V2], scheme: 'v2' }
      : null;
  if (!pick) throw new ApkSignatureError('No APK Signature Scheme v2 or v3 block was found in this file.');

  const der = firstCertificate(view, pick.off, pick.len);
  const digest = await crypto.subtle.digest('SHA-256', der);
  return { sha256: hex(digest), scheme: pick.scheme };
}

/** Group a fingerprint into byte pairs so a human can actually compare it to apksigner. */
export const formatFingerprint = (h) => (h || '').replace(/(.{2})(?=.)/g, '$1:').toUpperCase();
