export interface IconBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
  hot?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export function IconBtn({
  children,
  onClick,
  title,
  ariaLabel,
  hot = false,
  compact = false,
  disabled = false,
  className,
}: IconBtnProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={disabled}
      className={`gp-icn${hot ? " gp-icn-hot" : ""}${
        compact ? " gp-icn--compact" : ""
      }${className ? " " + className : ""}`}
    >
      {children}
    </button>
  );
}
