type Props = {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
};

export function StatBlock({ label, value, hint, className }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`.trim()}>
      <span
        data-gp-stat-label
        className="text-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.18em",
          color: "var(--color-gp-paper-dim-2)",
        }}
      >
        {label}
      </span>
      <span
        data-gp-stat-value
        className="tabular-nums"
        style={{
          fontFamily: "var(--font-prompter)",
          fontVariationSettings: '"opsz" 144',
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: "-0.022em",
          color: "var(--color-gp-paper)",
          lineHeight: 1.05,
          fontFeatureSettings: '"tnum", "lnum"',
        }}
      >
        {value}
      </span>
      {hint ? (
        <span
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-gp-mute)",
            letterSpacing: "0.06em",
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
