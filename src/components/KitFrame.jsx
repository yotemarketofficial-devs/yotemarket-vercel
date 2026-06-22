import { Suspense } from 'react';

// Full-bleed wrapper for an imported design kit. The `scope` class (e.g. "kit-storefront")
// is the boundary its scoped CSS is keyed to, so the kit's theme can't leak into the
// marketing site. A lightweight branded loader covers the lazy chunk fetch.
function KitLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #fff)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--purple, #7C2BD4)' }}>
        <i className="fas fa-circle-notch" style={{ fontSize: 30, animation: 'ymspin 0.9s linear infinite' }} aria-hidden="true" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t3, #897EA0)' }}>Loading…</span>
      </div>
      <style>{'@keyframes ymspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export default function KitFrame({ scope, children }) {
  return (
    <div className={scope}>
      <Suspense fallback={<KitLoader />}>{children}</Suspense>
    </div>
  );
}
