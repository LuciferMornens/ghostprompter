export interface PanelHeaderProps {
  /** Leading numeral, e.g. "01". Decorative (aria-hidden). */
  numeral: string;
  /** Primary label for the panel. */
  label: string;
  /** Secondary meta text, e.g. "draft u00b7 markdown". */
  meta: string;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Section header for workspace panels.
 *
 * Renders a numeral + decorative rule + label + meta text.
 * The numeral and rule are purely decorative (`aria-hidden`).
 */
export function PanelHeader({ numeral, label, meta, className }: PanelHeaderProps) {
  return (
    <div className={`gp-panelhead ${className ?? ""}`.trim()}>
      <div className="gp-panelhead__lead">
        <span className="gp-panelhead__numeral" aria-hidden="true">
          {numeral}
        </span>
        <span className="gp-panelhead__rule" aria-hidden="true" />
        <span className="gp-panelhead__label">{label}</span>
      </div>
      <span className="gp-panelhead__meta">{meta}</span>
    </div>
  );
}
