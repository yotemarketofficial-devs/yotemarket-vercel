import { useEffect, useState } from 'react';

// The site's light/dark theme: the saved choice (ym_platform_theme), else the system's,
// mirrored onto <html class="dark"> and saved back on every change. Layout and the
// Marketer Program landing both use it, so the toggle behaves the same everywhere.
// Read up front rather than after mount: the homepage picks its hero art from this on
// the first render, and starting light would fetch both images.
export function readSavedTheme() {
  try {
    const saved = localStorage.getItem('ym_platform_theme');
    if (saved) return saved === 'dark';
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

export function useSiteTheme() {
  const [dark, setDark] = useState(readSavedTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('ym_platform_theme', dark ? 'dark' : 'light'); } catch { /* private mode */ }
  }, [dark]);
  return [dark, setDark];
}
