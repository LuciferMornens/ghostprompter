export interface RecDotProps {
  active: boolean;
}

export function RecDot({ active }: RecDotProps) {
  return (
    <span
      className={`gp-rec-dot ${active ? "" : "gp-rec-dot--idle"}`.trim()}
      aria-label={active ? "recording indicator, active" : "recording indicator, idle"}
    />
  );
}
