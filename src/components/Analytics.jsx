/* Vercel Web Analytics — cookieless page-view + visitor counts.
 *
 * Mounted inside the Router so client-side navigations are counted, not just the
 * first hard load (this is an SPA: every route change is a page view that never
 * hits the server).
 *
 * The `route` prop matters here. Left to itself the tracker reports the raw URL,
 * so /product/abc123 and /product/xyz789 arrive as two unrelated pages — the
 * catalogue would shred the report into thousands of one-visit rows. Passing the
 * PATTERN groups them under /product/:pid while `path` keeps the real URL, which
 * is exactly how the framework integrations behave.
 */
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';

// Only the dynamic routes need mapping; everything else is already a fixed path.
// Keep in sync with the dynamic routes in App.jsx.
const DYNAMIC = [
  [/^\/store\/[^/]+$/, '/store/:sid'],
  [/^\/product\/[^/]+$/, '/product/:pid'],
];

export default function Analytics() {
  const { pathname } = useLocation();
  const route = DYNAMIC.find(([re]) => re.test(pathname))?.[1] ?? pathname;

  return <VercelAnalytics route={route} path={pathname} />;
}
