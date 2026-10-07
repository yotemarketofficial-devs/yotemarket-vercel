import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';
import { useEscape } from './lib/useEscape.js';

const navItems = [
  { label: 'Home', path: '/', end: true },
  { label: 'Shops', path: '/storefront' },
  { label: 'For Merchants', path: '/dashboard' },
  { label: 'Delivery', path: '/rider' },
  { label: 'Marketers', path: '/marketers' },
  { label: 'About', path: '/about' },
];

function NavItem({ item, activeClass }) {
  return <NavLink to={item.path} end={item.end} className={activeClass}>{item.label}</NavLink>;
}

function ThemeIcon({ dark }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {dark ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </>
      ) : (
        <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6z" />
      )}
    </svg>
  );
}

function Layout() {
  // Read the saved theme up front rather than after mount: the homepage picks its hero
  // art from this on the first render, and starting light would fetch both images.
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('ym_platform_theme');
      if (saved) return saved === 'dark';
      return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ym_platform_theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEscape(() => setMenuOpen(false), menuOpen);

  const logoSrc = dark ? '/assets/logo-white.png' : '/assets/logo.png';
  const activeClass = ({ isActive }) => (isActive ? 'active-link' : '');

  return (
    <div className="app-shell">
      {/* Keyboard/screen-reader users can jump the nav straight to the page (WCAG 2.4.1). */}
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="nav">
        <div className="wrap nav-in">
          <NavLink to="/" className="logo-link">
            <img className="logo" src={logoSrc} alt="YoteMarket" />
          </NavLink>

          <nav className="links" aria-label="Main">
            {navItems.map((item) => <NavItem key={item.path} item={item} activeClass={activeClass} />)}
          </nav>

          <div className="nav-cta">
            <button
              type="button"
              className="nav-theme"
              onClick={() => setDark((prev) => !prev)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <ThemeIcon dark={dark} />
            </button>
            {/* The storefront opens to guests and offers sign-in itself. */}
            <Link to="/storefront" className="nav-login">Login</Link>
            <Link to="/storefront" className="nav-start">Get Started</Link>
            <button
              className="nav-burger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <i className={menuOpen ? 'fas fa-xmark' : 'fas fa-bars'}></i>
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <div className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
          <nav className="nav-mobile-links" aria-label="Main">
            {navItems.map((item) => <NavItem key={item.path} item={item} activeClass={activeClass} />)}
            <div className="nav-mobile-cta">
              <Link className="nav-login" to="/storefront" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link className="nav-start" to="/storefront" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </div>
          </nav>
        </div>
      </header>
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
