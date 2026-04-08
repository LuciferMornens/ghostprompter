import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  hot?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Frame({ children, hot = false, className, style }: Props) {
  return (
    <div
      className={`gp-frame ${hot ? "gp-frame-hot" : ""} ${className ?? ""}`.trim()}
      style={style}
    >
      {children}
      <span className="gp-frame-bl" aria-hidden />
      <span className="gp-frame-br" aria-hidden />
    </div>
  );
}
