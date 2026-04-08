type Props = {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
};

export function StatBlock({ label, value, hint, className }: Props) {
  return (
    <div
      className={`flex flex-col gap-1 ${className ?? ""}`.trim()}
    >
      <span
        data-gp-stat-label
        className="text-[10px] tracking-[0.22em] uppercase text-gp-mute"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </span>
      <span
        data-gp-stat-value
        className="text-xl text-gp-paper tabular-nums"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      {hint ? (
        <span
          className="text-[10px] text-gp-mute-2"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
