import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset scroll to the top on every route change — standard SPA navigation behaviour.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}
