import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import SiteHeader from './components/SiteHeader.jsx';
import { useSiteTheme } from './lib/useSiteTheme.js';

function Layout() {
  const [dark, setDark] = useSiteTheme();

  return (
    <div className="app-shell">
      {/* Keyboard/screen-reader users can jump the nav straight to the page (WCAG 2.4.1). */}
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader dark={dark} onToggle={() => setDark((prev) => !prev)} />
      {/* Skip-link target. A plain wrapper — each page renders its own <main>. */}
      <div id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        {/* Lazy marketing pages (rider, careers, help) suspend here rather than at the
            app root, so the header and footer stay painted while one loads. */}
        <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
          <Outlet context={{ dark }} />
        </Suspense>
      </div>

      <style>{`
      .skip-link{ position:absolute; left:-9999px; top:0; z-index:200; padding:12px 18px; border-radius:0 0 12px 0;
        background:var(--purple,#7C2BD4); color:#fff; font-weight:700; font-size:14px; text-decoration:none; }
      .skip-link:focus{ left:0; outline:3px solid #fff; outline-offset:-6px; }
      `}</style>
    </div>
  );
}

export default Layout;
