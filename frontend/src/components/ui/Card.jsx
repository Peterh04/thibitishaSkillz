export function Card({
  children,
  interactive = false,
  className = "",
  style,
  ...props
}) {
  return (
    <div
      className={`tb-card ${interactive ? "tb-card--interactive" : ""} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", style, ...props }) {
  return (
    <div className={`tb-card__header ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", style, ...props }) {
  return (
    <h3 className={`tb-card__title ${className}`.trim()} style={style} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", style, ...props }) {
  return (
    <p className={`tb-card__desc ${className}`.trim()} style={style} {...props}>
      {children}
    </p>
  );
}

export function CardBody({ children, className = "", style, ...props }) {
  return (
    <div className={`tb-card__body ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", style, ...props }) {
  return (
    <div className={`tb-card__footer ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
}

export default Card;

