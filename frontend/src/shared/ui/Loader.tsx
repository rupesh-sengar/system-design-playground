interface LoaderProps {
  caption?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export const Loader = ({
  caption,
  className,
  label = "Loading",
  size = "md",
}: LoaderProps) => (
  <div
    className={`brand-loader brand-loader--${size} ${className ?? ""}`.trim()}
    role="status"
  >
    <div className="brand-loader__glyph" aria-hidden="true">
      <span className="brand-loader__ring brand-loader__ring--outer" />
      <span className="brand-loader__ring brand-loader__ring--inner" />
      <span className="brand-loader__orb brand-loader__orb--teal" />
      <span className="brand-loader__orb brand-loader__orb--warm" />
      <span className="brand-loader__core" />
    </div>

    {/*<div className="brand-loader__copy">
      <p className="brand-loader__label">{label}</p>
      {caption ? <p className="brand-loader__caption">{caption}</p> : null}
    </div>*/}
  </div>
);
