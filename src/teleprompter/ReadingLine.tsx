type Props = {
  offset: number; // 0..1
};

export function ReadingLine({ offset }: Props) {
  return (
    <div
      className="gp-reading-line"
      style={{ top: `${offset * 100}%` }}
      aria-hidden
    />
  );
}
