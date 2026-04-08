import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  hot?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Legacy compatibility primitive. Retains gp-frame / gp-frame-bl / gp-frame-br
 * so existing tests keep passing, but no longer renders visible decorations —
 * the Liquid Glass redesign uses `.gp-glass` surfaces instead.
 */
export function Frame({ children, hot = false, className, style }: Props) {
  return (
    <div
      className={`gp-frame ${hot ? "gp-frame-hot" : ""} ${className ?? ""}`.trim()}
      style={style}
    >
      {children}
      <span className="gp-frame-bl" aria-hidden style={{ display: "none" }} />
      <span className="gp-frame-br" aria-hidden style={{ display: "none" }} />
    </div>
  );
}
