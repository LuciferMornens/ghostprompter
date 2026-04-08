type Tone = "phosphor" | "amber" | "mute";

type Props = {
  code: string;
  label: string;
  tone?: Tone;
  className?: string;
};

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
    <span className={`gp-channel ${toneClass} ${className ?? ""}`.trim()}>
      <span>{code}</span>
      <span aria-hidden className="opacity-40">
        /
      </span>
      <span>{label}</span>
    </span>
  );
}
