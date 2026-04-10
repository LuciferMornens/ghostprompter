export interface KbdHintProps {
  keys: string[];
  label: string;
}

export function KbdHint({ keys, label }: KbdHintProps) {
  return (
    <span className="gp-hothint">
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
