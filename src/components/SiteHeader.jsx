import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useEscape } from '../lib/useEscape.js';
import ThemeToggle from './ThemeToggle.jsx';

// The site's header: logo (home), the main nav, the theme toggle, two calls to action and
// the mobile menu. Layout renders it for the marketing pages; the Marketer Program
// landing renders it too, with its own calls to action, so every public page shares one
// header. Styles are the global .nav rules in styles.css.
export const NAV_ITEMS = [
  { label: 'Home', path: '/', end: true },
  { label: 'Shops', path: '/storefront' },
  { label: 'For Merchants', path: '/dashboard' },
  { label: 'Delivery', path: '/rider' },
  { label: 'Marketers', path: '/marketers' },
  { label: 'About', path: '/about' },
];

const DEFAULT_CTA = [
  // The storefront opens to guests and offers sign-in itself.
  { label: 'Login', to: '/storefront', kind: 'login' },
  { label: 'Get App', to: '/mobile', kind: 'start' },
];

function Cta({ item, onClick }) {
  const cls = item.kind === 'start' ? 'nav-start' : 'nav-login';
  return item.href
    ? <a className={cls} href={item.href} onClick={onClick}>{item.label}</a>
    : <Link className={cls} to={item.to} onClick={onClick}>{item.label}</Link>;
}

/** dark / onToggle — the theme; cta — [{ label, to | href, kind: 'login' | 'start' }]; badge — a small tag after the logo. */
export default function SiteHeader({ dark, onToggle, cta = DEFAULT_CTA, badge }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEscape(() => setMenuOpen(false), menuOpen);

  const logoSrc = dark ? '/assets/logo-white.png' : '/assets/logo.png';
  const activeClass = ({ isActive }) => (isActive ? 'active-link' : '');
  const links = NAV_ITEMS.map((item) => <NavLink key={item.path} to={item.path} end={item.end} className={activeClass}>{item.label}</NavLink>);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <NavLink to="/" className="logo-link" aria-label="YoteMarket home">
          <img className="logo" src={logoSrc} alt="YoteMarket" />
          {badge && <span className="nav-badge">{badge}</span>}
        </NavLink>

        <nav className="links" aria-label="Main">{links}</nav>

        <div className="nav-cta">
          <ThemeToggle dark={dark} onToggle={onToggle} className="nav-theme" />
          {cta.map((item) => <Cta key={item.label} item={item} />)}
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
          {links}
          <div className="nav-mobile-cta">
            {cta.map((item) => <Cta key={item.label} item={item} onClick={() => setMenuOpen(false)} />)}
          </div>
        </nav>
      </div>
    </header>
  );
}
