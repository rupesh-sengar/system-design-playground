interface FilterPillProps {
  active: boolean;
  label: string;
  onClick: () => void;
  count?: number;
  tone?: "default" | "muted";
}

export const FilterPill = ({
  active,
  count,
  label,
  onClick,
  tone = "default",
}: FilterPillProps) => (
  <button
    className={`pill ${tone === "muted" ? "pill--muted" : ""} ${active ? "pill--active" : ""}`}
    type="button"
    onClick={onClick}
  >
    <span>{label}</span>
    {typeof count === "number" ? <strong>{count}</strong> : null}
  </button>
);
