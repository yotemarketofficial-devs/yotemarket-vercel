/* YoteAiMark — the YoteAI brand mark (smiling shopping bag) as an inline,
   tintable SVG. Vector so it stays crisp at any size; `color` defaults to
   currentColor so it inherits text colour unless overridden. */
import React from 'react';

export default function YoteAiMark({ size = 22, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size * 56 / 48} viewBox="0 0 48 56" fill="none" aria-hidden="true" style={style}>
      <path d="M17 17 L31 17 Q36 17 36.77 21.93 L40.23 44.07 Q41 49 36 49 L12 49 Q7 49 7.77 44.07 L11.23 21.93 Q12 17 17 17 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 25 C18 5 30 5 30 25" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="25" r="2.8" fill={color} />
      <circle cx="30" cy="25" r="2.8" fill={color} />
      <path d="M17.5 37 Q24 45 30.5 37" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
