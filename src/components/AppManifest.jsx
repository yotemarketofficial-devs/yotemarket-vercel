/* AppManifest.jsx — makes each surface an installable browser app (PWA).
 *
 * One origin can host several installable apps, but only if each has its OWN
 * manifest with a distinct `scope`/`id` — otherwise the browser sees one app and
 * "install" from /pos would install the marketing site. This is an SPA, so the
 * <link rel="manifest"> has to follow the route (same idea as RouteSeo.jsx).
 *
 * Marketing pages get NO manifest on purpose: offering "Install YoteMarket" on the
 * landing would install a brochure, not an app. Only the four real apps qualify.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyAppManifest, registerServiceWorker } from '../lib/pwa.js';

export default function AppManifest() {
  const { pathname } = useLocation();
  useEffect(() => { registerServiceWorker(); }, []);
  useEffect(() => { applyAppManifest(pathname); }, [pathname]);
  return null;
}
