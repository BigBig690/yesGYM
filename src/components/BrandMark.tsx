import { useId } from 'react';

type BrandMarkProps = { className?: string };

/** Original, palette-aware Training Arc glyph: a rising path meeting a small blossom. */
export function BrandMark({ className = '' }: BrandMarkProps) {
  const titleId = useId();
  return <svg aria-labelledby={titleId} className={`brand-mark${className ? ` ${className}` : ''}`} role="img" viewBox="0 0 52 52" fill="none">
    <title id={titleId}>Training Arc</title>
    <path className="brand-mark-frame" d="M12 5.5h26.5A8 8 0 0 1 46.5 13v26A7.5 7.5 0 0 1 39 46.5H13A7.5 7.5 0 0 1 5.5 39V13A7.5 7.5 0 0 1 12 5.5Z" />
    <path className="brand-mark-track" d="M12 37c7-1 10-6 15-10s8-6 12-12" />
    <path className="brand-mark-arrow" d="M33.5 14.5H40v6.5" />
    <path className="brand-mark-base" d="M12 41h27" />
    <g className="brand-mark-blossom" aria-hidden="true">
      <path d="M40 11c-4-5-7-1-3 3-5-2-7 2-1 4-2 5 2 7 4 1 3 5 7 2 3-2 5-2 2-6-2-4 2-5-2-7-3-2Z" />
      <circle cx="40" cy="14.5" r="1.35" />
    </g>
  </svg>;
}
