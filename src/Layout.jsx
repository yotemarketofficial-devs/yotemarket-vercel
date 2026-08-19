import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';
import { useEscape } from './lib/useEscape.js';

const navItems = [
  { label: 'Shop', path: '/storefront' },
  { label: 'Sell', path: '/dashboard' },
  { label: 'Earn', path: '/marketers' },
  { label: 'Get the app', path: '/mobile' },
];

function Layout() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('ym_platform_theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setDark(saved ? saved === 'dark' : prefersDark);
  }, []);

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

          <nav className="links">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={activeClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-cta">
            <button className="toggle" onClick={() => setDark((prev) => !prev)} title="Toggle theme" aria-label="Toggle theme">
              <i className={dark ? 'fas fa-sun' : 'fas fa-moon'}></i>
            </button>
            <button className="btn btn-primary nav-signin" onClick={() => navigate('/storefront')}>
              Sign in
            </button>
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
          <nav className="nav-mobile-links">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={activeClass}>
                {item.label}
              </NavLink>
            ))}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              onClick={() => { setMenuOpen(false); navigate('/storefront'); }}
            >
              Sign in
            </button>
          </nav>
        </div>
      </header>
      {/* Skip-link target. A plain wrapper — each page renders its own <main>. */}
      <div id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        {/* Lazy marketing pages (rider, careers, help) suspend here rather than at the
            app root, so the header and footer stay painted while one loads. */}
        <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
          <Outlet />
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
