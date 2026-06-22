import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'Shop', path: '/storefront' },
  { label: 'Sell', path: '/dashboard' },
  { label: 'Earn', path: '/marketers' },
  { label: 'Get the app', path: '/mobile' },
];

function Layout() {
  const [dark, setDark] = useState(false);
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

  const logoSrc = dark ? '/assets/logo-white.png' : '/assets/logo.png';
  const activeClass = ({ isActive }) => (isActive ? 'active-link' : '');

  return (
    <div className="app-shell">
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
            <button className="toggle" onClick={() => setDark((prev) => !prev)} title="Toggle theme">
              <i className={dark ? 'fas fa-sun' : 'fas fa-moon'}></i>
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/storefront')}>
              Sign in
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export default Layout;
