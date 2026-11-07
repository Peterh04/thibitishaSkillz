export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon = null,
  className = "",
  type = "button",
  ...props
}) {
  const variantClass = `tb-btn--${variant}`;
  const sizeClass = `tb-btn--${size}`;
  const iconOnlyClass = !children && icon ? "tb-btn--icon-only" : "";

  return (
    <button
      type={type}
      className={`tb-btn ${variantClass} ${sizeClass} ${iconOnlyClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="tb-btn__spinner"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animation: "tb-spin 0.8s linear infinite" }}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : (
        icon && <span className="tb-btn__icon">{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
}

