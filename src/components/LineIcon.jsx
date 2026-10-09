// Shared line icons for the marketing pages (the homepage bands and the page heroes).
/* Line icons, 24-unit grid, stroked in currentColor (no icon font: these render even
   when the Font Awesome CDN is slow or blocked). */
export const ICONS = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  scale: <><path d="M12 3.5v17M7 20.5h10M5 7.5h14M12 5.5V3.5" /><path d="m5 7.5-3 6.5a3 3 0 0 0 6 0zM19 7.5l-3 6.5a3 3 0 0 0 6 0z" /></>,
  gift: <><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5v8h14v-8M12 8.5v12" /><path d="M12 8.5c-1.5-3.8-6.2-4.4-6.2-1.5 0 1.3 1.6 1.5 6.2 1.5zM12 8.5c1.5-3.8 6.2-4.4 6.2-1.5 0 1.3-1.6 1.5-6.2 1.5z" /></>,
  tag: <><path d="M3.5 12.3V4.8a1.3 1.3 0 0 1 1.3-1.3h7.5l8.2 8.2a1.3 1.3 0 0 1 0 1.8l-7.5 7.5a1.3 1.3 0 0 1-1.8 0z" /><circle cx="8.2" cy="8.2" r="1.4" /></>,
  store: <><path d="M3 9.5V7.6L5.2 3h13.6L21 7.6v1.9a2.6 2.6 0 0 1-4.5 1.7 2.6 2.6 0 0 1-4.5 0 2.6 2.6 0 0 1-4.5 0A2.6 2.6 0 0 1 3 9.5z" /><path d="M4.5 12v8.5h15V12M9.5 20.5v-5h5v5" /></>,
  play: <><circle cx="12" cy="12" r="8.5" /><path d="M10 8.6v6.8l5.4-3.4z" /></>,
  tap: <><path d="M9 11.5V5.2a1.7 1.7 0 0 1 3.4 0v5.3" /><path d="M12.4 10.2a1.7 1.7 0 0 1 3.4 0v1.3a1.7 1.7 0 0 1 3.4 0v3.8a5.7 5.7 0 0 1-5.7 5.7h-1.2a5.8 5.8 0 0 1-4.6-2.3l-2.9-3.9a1.6 1.6 0 0 1 2.5-2l1.7 1.9" /></>,
  bag: <><path d="M5.5 8h13l-1 12.5h-11z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  chat: <><path d="M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.6" /></>,
  shield: <><path d="M12 3 4.5 6v5.6c0 4.5 3.1 8 7.5 9.4 4.4-1.4 7.5-4.9 7.5-9.4V6z" /><path d="m8.8 12.2 2.3 2.3 4.3-4.6" /></>,
  pin: <><path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.4" /></>,
  arrow: <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.5c.6-3.9 3.4-6 7-6s6.4 2.1 7 6" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5" /><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M16 13.5h.01" strokeWidth="2.8" /></>,
  key: <><circle cx="8" cy="15.5" r="4" /><path d="m10.9 12.6 8.6-8.6M16.5 7l2.5 2.5M14.2 9.3l2 2" /></>,
  bulb: <><path d="M9.3 17.5h5.4M10.3 20.5h3.4" /><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v1.2h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z" /></>,
  receipt: <><path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  gauge: <><path d="M4.5 16.5a7.5 7.5 0 1 1 15 0" /><path d="m12 16.5 3.6-4.6" /><circle cx="12" cy="16.5" r="1.1" /></>,
  box: <><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" /><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" /></>,
  crown: <path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10z" />,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5c.5-3.4 2.7-5.3 5.5-5.3s5 1.9 5.5 5.3" /><circle cx="16.8" cy="9.3" r="2.5" /><path d="M16.2 14.3c2.4.1 4 1.7 4.4 4.6" /></>,
  cart: <><path d="M3 4h2.2l2.2 10.6a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6.1" /><circle cx="9.5" cy="19.6" r="1.3" /><circle cx="17" cy="19.6" r="1.3" /></>,
  megaphone: <><path d="M4 10v4a1 1 0 0 0 1 1h2.5l7.5 4.5V4.5L7.5 9H5a1 1 0 0 0-1 1z" /><path d="M8 15l1.2 4.5h2.3L10.6 15M18 9.5a3.5 3.5 0 0 1 0 5" /></>,
  scooter: <><circle cx="6" cy="17" r="2.6" /><circle cx="18" cy="17" r="2.6" /><path d="M8.6 17h6.8l2-6.5H20M17.4 10.5 16 5.5h-2.5M8.6 17 7 11.5h5.5l2 5.5" /></>,
  coins: <><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 16.3c.9 1.3 3.2 2.2 5.5 2.2 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4" /></>,
  climb: <><path d="M4 20.5h16" /><path d="M6.5 16.5v-3M11 16.5v-6M15.5 16.5v-9" /><path d="m14 5.5 3.5-2 1.8 3.6" /></>,
  briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V5.8A1.3 1.3 0 0 1 10.3 4.5h3.4A1.3 1.3 0 0 1 15 5.8v1.7M3.5 12.5h17M12 11.5v2" /></>,
  truck: <><path d="M14 17.5V6.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 2 6.5v9.5a1.5 1.5 0 0 0 1.5 1.5H5" /><path d="M14 8.5h3.6a1.5 1.5 0 0 1 1.2.6l2.9 3.8a1.5 1.5 0 0 1 .3.9v2.2a1.5 1.5 0 0 1-1.5 1.5H19M9.5 17.5H14" /><circle cx="7.2" cy="17.6" r="2.2" /><circle cx="16.8" cy="17.6" r="2.2" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  form: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5V5h6V3.5M8.5 10h7M8.5 13.5h7M8.5 17h4" /></>,
  code: <path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 5l-3 14" />,
  rocket: <><path d="M14.5 4.2c2.4-.9 4.6-.9 5.3-.2.7.7.7 2.9-.2 5.3-.9 2.4-3 4.9-6.1 6.7l-3.5-3.5c1.8-3.1 4.3-5.2 6.5-6.3z" /><path d="M10 12.5 6.5 12l2.4-3.1 3.3-.2M11.5 14l.5 3.5 3.1-2.4.2-3.3M7.5 16.5c-1.6.5-2.8 1.8-3 3.5 1.7-.2 3-1.4 3.5-3" /><circle cx="15.5" cy="8.5" r="1.4" /></>,
  bolt: <path d="M13 3.5 5 13.5h6l-1 7 8-10h-6z" />,
  chart: <><path d="M4 20.5h16" /><path d="M7 16.5v-4M11.5 16.5v-7M16 16.5v-10" /></>,
  headset: <><path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" /><rect x="3.5" y="13" width="4" height="6" rx="1.6" /><rect x="16.5" y="13" width="4" height="6" rx="1.6" /><path d="M18.5 19c0 1.2-1.5 2-4 2h-1.5" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M4.5 16.5v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>,
  question: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7M12 16.8h.01" /></>,
  phone: <><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4" /><path d="M10.5 18h3" /></>,
  id: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 15.5c.5-1.3 1.6-2 3-2s2.5.7 3 2M14 10h4M14 13.5h3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18h7.3a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6h7.3" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.2" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.8 6.5 8.2 6.5 8.2-6.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  clip: <path d="m20 11.5-7.9 7.9a4.9 4.9 0 0 1-6.9-6.9l8.5-8.5a3.3 3.3 0 0 1 4.6 4.6l-8.5 8.5a1.6 1.6 0 0 1-2.3-2.3l7.9-7.9" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: <><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17h.01" /></>,
  send: <><path d="M20.5 3.5 10 14" /><path d="m20.5 3.5-6.5 17-4-6.5-6.5-4z" /></>,
  file: <><path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" /><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6" /></>,
  layers: <><path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z" /><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" /></>,
  car: <><path d="M5 16.5h14M3.5 16.5v-4l2.2-5a1.6 1.6 0 0 1 1.5-1h9.6a1.6 1.6 0 0 1 1.5 1l2.2 5v4" /><path d="M3.5 12.5h17" /><circle cx="7.5" cy="17" r="1.8" /><circle cx="16.5" cy="17" r="1.8" /></>,
  tuktuk: <><path d="M4 16.5V9a3 3 0 0 1 3-3h7l3 5h2.5a1 1 0 0 1 1 1v4.5" /><path d="M4 11h9.5V6M8.2 16.5h7.6" /><circle cx="6" cy="17" r="1.9" /><circle cx="18" cy="17" r="1.9" /></>,
  sparks: <><path d="M5 9.5 2.5 7M6.5 5 6 2M10 6.5 12 4.5" /></>,
};

export function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

// The two stores' own marks for their badges, drawn inline so they show even when the icon
// font is slow or blocked: Google Play's four-colour triangle and Apple's logo.
export function GooglePlayIcon({ className = 'hs-store-ic' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#00D7FE" d="M3.6 2.2c-.3.3-.4.8-.4 1.4v16.8c0 .6.2 1.1.4 1.4l.1.1 9.4-9.4v-.2L3.7 2.1z" />
      <path fill="#FFCE00" d="m16.2 15.6-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.7 2.1z" />
      <path fill="#FF3A44" d="m16.3 15.5-3.2-3.2-9.5 9.5c.4.4.9.4 1.6.1z" />
      <path fill="#00F076" d="M16.3 9.1 5.2 2.8c-.7-.4-1.2-.3-1.6.1l9.5 9.4z" />
    </svg>
  );
}

export function AppleIcon({ className = 'hs-store-ic' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.62 1.09zm3.38-3.07c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.71-.69 3.55-1.7z" />
    </svg>
  );
}

