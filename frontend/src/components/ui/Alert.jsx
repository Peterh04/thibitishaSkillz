import {
  IconAlertCircle,
  IconCheckCircle,
  IconShield,
  IconX,
} from "./Icons";

export default function Alert({
  children,
  variant = "info", // "info" | "success" | "warning" | "danger"
  title,
  icon = null,
  onDismiss = null,
  className = "",
  style,
  ...props
}) {
  const defaultIcon =
    variant === "success" ? (
      <IconCheckCircle size={18} />
    ) : variant === "warning" || variant === "danger" ? (
      <IconAlertCircle size={18} />
    ) : (
      <IconShield size={18} />
    );

  return (
    <div
      role="alert"
      className={`tb-alert tb-alert--${variant} ${className}`.trim()}
      style={style}
      {...props}
    >
      <span style={{ display: "flex", flexShrink: 0, marginTop: "2px" }}>
        {icon || defaultIcon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <strong
            style={{
              display: "block",
              fontWeight: "var(--font-weight-semibold)",
              marginBottom: "2px",
              color: "inherit",
            }}
          >
            {title}
          </strong>
        )}
        <div style={{ color: "inherit", fontSize: "var(--font-size-sm)" }}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "currentColor",
            opacity: 0.7,
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Dismiss alert"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

