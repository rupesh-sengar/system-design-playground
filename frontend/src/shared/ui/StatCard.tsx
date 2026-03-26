interface StatCardProps {
  label: string;
  value: number | string;
  hint: string;
  stacked?: boolean;
}

export const StatCard = ({ label, value, hint, stacked = false }: StatCardProps) => (
  <article className={`stat-card ${stacked ? "stat-card--stacked" : ""}`}>
    <span className="stat-label">{label}</span>
    <strong>{value}</strong>
    <span className="stat-hint">{hint}</span>
  </article>
);
