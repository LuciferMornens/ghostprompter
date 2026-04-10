export interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function ToolbarButton({
  children,
  onClick,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`gp-btn gp-btn--ghost${className ? " " + className : ""}`}
    >
      {children}
    </button>
  );
}
