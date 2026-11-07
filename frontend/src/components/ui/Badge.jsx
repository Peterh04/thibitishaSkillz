export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  style,
  ...props
}) {
  const variantClass = `tb-badge--${variant}`;

  return (
    <span
      className={`tb-badge ${variantClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "currentColor",
            display: "inline-block",
            marginRight: "4px",
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

