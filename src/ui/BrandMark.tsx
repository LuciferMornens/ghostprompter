export interface BrandMarkProps {
  /** Additional CSS class names to append. */
  className?: string;
}

/**
 * Ghost icon SVG + wordmark + tagline.
 *
 * Purely decorative — the entire container is `aria-hidden` so screen
 * readers skip it.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div
      className={`gp-brand-mark ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      <div className="gp-brand-mark__crest">
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
        <path
          d="M3 8a6 6 0 1 1 12 0v8l-2-1.5L11 16l-2-1.5L7 16l-2-1.5L3 16V8Z"
          stroke="var(--color-gp-paper)"
          strokeOpacity="0.94"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="8.5" r="0.95" fill="var(--color-gp-bronze)" />
        <circle cx="11" cy="8.5" r="0.95" fill="var(--color-gp-bronze)" />
        </svg>
      </div>
      <div className="gp-wordmark">
        <span className="gp-wordmark-title">
          Ghost<em>prompter</em>
        </span>
        <span className="gp-wordmark-kicker">a quiet teleprompter</span>
      </div>
    </div>
  );
}
