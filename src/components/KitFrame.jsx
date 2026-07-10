import { Suspense } from 'react';
import BrandedLoader from './BrandedLoader.jsx';

// Full-bleed wrapper for an imported design kit. The `scope` class (e.g. "kit-storefront")
// is the boundary its scoped CSS is keyed to, so the kit's theme can't leak into the
// marketing site. The shared branded loader covers the lazy chunk fetch so every
// route transition looks the same.
export default function KitFrame({ scope, children }) {
  return (
    <div className={scope}>
      <Suspense fallback={<BrandedLoader variant="full" />}>{children}</Suspense>
    </div>
  );
}
