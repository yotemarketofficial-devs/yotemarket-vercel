import { Link } from 'react-router-dom';
import { APPS } from '../lib/apk-releases.mjs';

/* The third store badge, sitting beside Google Play and the App Store.
 *
 * Two states, decided by whether the app has an Uptodown listing yet:
 *  - listed   → "GET IT ON Uptodown", straight to the listing.
 *  - not yet  → "DOWNLOAD THE Android APK", straight to /apk.
 * Either way it is a real button in the badge row rather than a line of small
 * print, which is the only way anyone finds the APK.
 *
 * Set `uptodownUrl` in src/lib/apk-releases.mjs to flip it.
 */

// The shopper app is what the marketing pages advertise.
const SHOPPER = APPS.find((a) => a.slug === 'shopper');

function UptodownBadge({ app = SHOPPER }) {
  if (app?.uptodownUrl) {
    return (
      <a className="store" href={app.uptodownUrl} target="_blank" rel="noreferrer" aria-label={`Get ${app.name} on Uptodown`}>
        <i className="fas fa-circle-down"></i>
        <span className="st"><small>GET IT ON</small><b>Uptodown</b></span>
      </a>
    );
  }
  return (
    <Link className="store" to="/apk" aria-label="Download the Android APK">
      <i className="fab fa-android"></i>
      <span className="st"><small>DOWNLOAD THE</small><b>Android APK</b></span>
    </Link>
  );
}

export default UptodownBadge;
