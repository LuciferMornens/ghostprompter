type Tone = "phosphor" | "amber" | "mute";

type Props = {
  code: string;
  label: string;
  tone?: Tone;
  className?: string;
};

/**
 * Legacy compatibility primitive. Kept to satisfy existing tests; no longer
 * used as the primary visual element in the Liquid Glass redesign.
 */
export function ChannelLabel({
  code,
  label,
  tone = "phosphor",
  className,
}: Props) {
  const toneClass =
    tone === "amber"
      ? "gp-channel--amber"
      : tone === "mute"
        ? "gp-channel--mute"
        : "";
  return (
    <span
      className={`gp-channel ${toneClass} ${className ?? ""}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--color-gp-paper-dim-2)",
      }}
    >
      <span>{code}</span>
      <span aria-hidden className="opacity-40">
        /
      </span>
      <span>{label}</span>
    </span>
  );
}
