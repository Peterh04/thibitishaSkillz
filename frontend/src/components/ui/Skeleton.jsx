export default function Skeleton({
  width = "100%",
  height = "20px",
  radius = "var(--radius-sm)",
  className = "",
  style,
  ...props
}) {
  return (
    <div
      className={`tb-skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

