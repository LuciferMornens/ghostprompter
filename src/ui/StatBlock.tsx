export interface StatBlockProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  accent?: boolean;
}

export function StatBlock({ label, value, hint, className, accent }: StatBlockProps) {
  return (
    <div className={`gp-stat ${className ?? ""}`.trim()}>
      <span data-gp-stat-label className="gp-stat__label">
        {label}
      </span>
      <span
        data-gp-stat-value
        className={`gp-stat__value ${accent ? "gp-stat__value--accent" : ""}`.trim()}
      >
        {value}
      </span>
      {hint ? <span className="gp-stat__hint">{hint}</span> : null}
    </div>
  );
}
