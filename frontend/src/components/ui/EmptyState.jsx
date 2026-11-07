export default function EmptyState({
  icon = null,
  title,
  description,
  action = null,
  className = "",
  style,
}) {
  return (
    <div className={`tb-empty-state ${className}`.trim()} style={style}>
      {icon && <div className="tb-empty-state__icon">{icon}</div>}
      {title && <h4 className="tb-empty-state__title">{title}</h4>}
      {description && <p className="tb-empty-state__desc">{description}</p>}
      {action && <div style={{ marginTop: "var(--space-2)" }}>{action}</div>}
    </div>
  );
}

