/* The official Android APK downloads — one source of truth for /apk.
 *
 * WHY THIS EXISTS: mirrors like Uptodown, APKPure and Aptoide list an Android app by
 * fetching the developer's own APK from a public URL and re-checking that URL on every
 * release. Without one they scrape a Play listing and republish a file nobody here
 * signed, with no way for a shopper to tell the two apart. This page is the file they
 * should take, plus the version, size and SHA-256 to verify it against.
 *
 * TO PUBLISH A RELEASE: put the signed APK somewhere public and permanent — dropping it
 * in public/apk/ ships it with the site and serves it at /apk/<file>.apk, or use Firebase
 * Storage or a GitHub release — then fill in `url`, `version`, `versionCode`, `sizeMb`,
 * `sha256` (`sha256sum the.apk`) and `releasedOn`. Keep older entries out: a mirror only
 * ever wants the current build, and a stale link is worse than no link.
 *
 * An entry whose `url` is empty renders as "not published yet" rather than a dead
 * download button, so this file can ship ahead of the first upload.
 */

// Everything a mirror asks for about the publisher, in one place.
export const PUBLISHER = {
  name: 'YoteMarket',
  legalName: 'YoteMarket Ltd',
  country: 'Kenya',
  email: 'general@yotemarket.com',
  phone: '+254 720 730 861',
  website: 'https://www.yotemarket.co.ke',
};

export const APPS = [
  {
    slug: 'shopper',
    name: 'YoteMarket',
    subtitle: 'Shopper & merchant app',
    description:
      'Shop hundreds of Kenyan stores, watch and buy from YoteFeed videos, chat and negotiate with sellers, pay with M-Pesa and collect at your nearest pickup hub. Merchants run their store, catalogue and orders from the same app.',
    packageId: 'com.yotemarket.app',
    // SHA-256 of the upload certificate (alias `yotemarket-shopper` in
    // yotemarket-upload.jks). The staff uploader refuses any build not signed by it.
    // See the note on the rider entry for why this is pinned rather than merely checked.
    signingSha256: '22047af9046681dbbedf9a20d696b1b0cf1b088d8cad8b8149673379ba20add9',
    icon: '/assets/app_icon.png',
    minAndroid: '6.0',
    abi: 'universal (arm64-v8a, armeabi-v7a, x86_64)',
    playUrl: '',
    // The Uptodown listing, once they publish it. Set it and the badge on the
    // marketing pages flips from "Download the Android APK" to "Get it on Uptodown".
    uptodownUrl: '',
    release: {
      version: '',
      versionCode: null,
      sizeMb: null,
      sha256: '',
      releasedOn: '',
      url: '',
    },
  },
  {
    slug: 'rider',
    name: 'YoteMarket Rider',
    subtitle: 'Delivery rider app',
    description:
      'Take batched delivery runs, navigate to pickup hubs, confirm handovers and track what you have earned. For riders approved on the YoteMarket delivery network.',
    packageId: 'com.yotemarket.rider',
    /* SHA-256 of the upload certificate (alias `yotemarket-rider`). Verified two ways:
     * `keytool -list -v` on the keystore, and `apksigner verify --print-certs` on the
     * shipped 1.0.0+4 APK — they match.
     *
     * PINNED, not just "is it signed": Android ties update eligibility to the signing
     * certificate, so a build signed with any other key cannot install over an existing
     * one — the user gets "App not installed" and must uninstall first, losing their data.
     * And there is no fixed debug certificate to blacklist instead, because the Android
     * debug key is generated per machine. Comparing against the known-good certificate is
     * the only check that actually catches the mistake.
     *
     * If the upload key is ever rotated (a Play upload-key reset), this must change with
     * it or every publish will be refused.
     */
    signingSha256: '8ffc3b1a116e281cdf7331a1b206c41c6b0bdada8b6882718d889bcfb20ea832',
    icon: '/assets/rider_app_icon.png',
    minAndroid: '6.0',
    abi: 'universal (arm64-v8a, armeabi-v7a, x86_64)',
    playUrl: '',
    uptodownUrl: '',
    release: {
      version: '',
      versionCode: null,
      sizeMb: null,
      sha256: '',
      releasedOn: '',
      url: '',
    },
  },
];

/** Is this app's APK actually downloadable right now? */
export const isPublished = (app) => Boolean(app.release.url);
