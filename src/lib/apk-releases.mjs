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
    icon: '/assets/app_icon.png',
    minAndroid: '6.0',
    abi: 'universal (arm64-v8a, armeabi-v7a, x86_64)',
    playUrl: '',
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
    icon: '/assets/rider_app_icon.png',
    minAndroid: '6.0',
    abi: 'universal (arm64-v8a, armeabi-v7a, x86_64)',
    playUrl: '',
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
