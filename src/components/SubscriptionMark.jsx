/* SubscriptionMark — the subscription / recurring-payment brand icon: two
   overlapping coins with a $ and recurring-cycle arrows. Vector so it stays crisp
   at any size; `color` defaults to currentColor so it inherits/tints with the
   surrounding text (pass the brand violet, or #fff on the gradient card). */
import React from 'react';

export default function SubscriptionMark({ size = 24, color = 'currentColor', strokeWidth = 5, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" style={style}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* back coin */}
      <circle cx="41" cy="23" r="14" />
      {/* front coin */}
      <circle cx="25" cy="40" r="15" />
      {/* dollar sign — vertical bar + S */}
      <path d="M25 29v22" />
      <path d="M31 35c0-3-3-4-6-4s-6 1-6 4 3 4 6 4 6 1 6 4-3 4-6 4-6-1-6-4" />
      {/* top-left recurring arrow (curves up) */}
      <path d="M13 27c-3-5-3-10 0-14" />
      <path d="M8 17l5-5 5 5" />
      {/* bottom-right recurring arrow (curves down) */}
      <path d="M51 37c3 5 3 10 0 14" />
      <path d="M56 47l-5 5-5-5" />
    </svg>
  );
}
