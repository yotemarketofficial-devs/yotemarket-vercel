/* YoteFeedMark — the YoteFeed brand mark (video camera with a rising "feed" curve)
   as an inline SVG, recreated as vectors so it stays crisp at any size. Purple
   gradient body + lighter lens + white feed curve, matching the brand logo.
   `size` is the rendered height; width follows the 4:3 mark aspect. */
import React from 'react';

export default function YoteFeedMark({ size = 28, style }) {
  const uid = React.useId();
  const body = `yf-body-${uid}`;
  const lens = `yf-lens-${uid}`;
  return (
    <svg width={size * 4 / 3} height={size} viewBox="0 0 64 48" fill="none" aria-hidden="true" style={style}>
      <defs>
        {/* brand-aligned: matches --m-grad (#5b2c9c → #8b3fea violet) */}
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b3fea" />
          <stop offset="1" stopColor="#5b2c9c" />
        </linearGradient>
        <linearGradient id={lens} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c1a4f6" />
          <stop offset="1" stopColor="#a179ee" />
        </linearGradient>
      </defs>
      {/* lens (drawn first so the body overlaps it at the seam) */}
      <path d="M46 18 L54 13.5 Q58 11.5 58 16.5 L58 31.5 Q58 36.5 54 34.5 L46 30 Z" fill={`url(#${lens})`} />
      {/* camera body */}
      <path d="M12 7 L38 7 Q46 7 46 15 L46 33 Q46 41 38 41 L12 41 Q4 41 4 33 L4 15 Q4 7 12 7 Z" fill={`url(#${body})`} />
      {/* rising "feed" curve */}
      <path d="M13 17 L13 34 L35 34 A22 17 0 0 0 13 17 Z" fill="#fff" />
    </svg>
  );
}
