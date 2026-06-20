import type { ReactNode } from "react";
import "./filter-pill.css";

export type FilterPillColor =
  | "neutral"
  | "easy"
  | "medium"
  | "hard"
  | "saved"
  | "started"
  | "done"
  | "open";

interface FilterPillProps {
  active: boolean;
  color?: FilterPillColor;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  count?: number;
  tone?: "default" | "muted";
}

export const FilterPill = ({
  active,
  color = "neutral",
  count,
  icon,
  label,
  onClick,
  tone = "default",
}: FilterPillProps) => (
  <button
    aria-pressed={active}
    className={`pill pill--color-${color} ${tone === "muted" ? "pill--muted" : ""} ${active ? "pill--active" : ""}`}
    type="button"
    onClick={onClick}
  >
    {icon ? <span className="pill__icon">{icon}</span> : null}
    <span>{label}</span>
    {typeof count === "number" ? <strong>{count}</strong> : null}
  </button>
);
