export default function StatTile({
  label,
  value,
  icon = null,
  trend = null,
  trendType = "neutral", // "positive" | "negative" | "neutral"
  subtext = null,
  className = "",
  style,
}) {
  const trendColor =
    trendType === "positive"
      ? "var(--color-success)"
      : trendType === "negative"
      ? "var(--color-danger)"
      : "var(--text-muted)";

  return (
    <div className={`tb-stat-tile ${className}`.trim()} style={style}>
      <div className="tb-stat-tile__header">
        <span className="tb-stat-tile__label">{label}</span>
        {icon && (
          <span style={{ color: "var(--text-faint)", display: "flex", alignItems: "center" }}>
            {icon}
          </span>
        )}
      </div>

      <div className="tb-stat-tile__value tabular-nums">{value}</div>

      {(trend || subtext) && (
        <div className="tb-stat-tile__footer">
          {trend && (
            <span style={{ color: trendColor, fontWeight: "var(--font-weight-medium)" }}>
              {trend}
            </span>
          )}
          {subtext && <span style={{ color: "var(--text-muted)" }}>{subtext}</span>}
        </div>
      )}
    </div>
  );
}

