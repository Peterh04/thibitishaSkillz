import { forwardRef } from "react";

const Select = forwardRef(function Select(
  {
    label,
    error,
    helper,
    id,
    className = "",
    wrapperClassName = "",
    required = false,
    options = [],
    children,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`tb-field ${wrapperClassName}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="tb-label">
          <span>
            {label} {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
          </span>
        </label>
      )}

      <select
        ref={ref}
        id={inputId}
        className={`tb-select ${error ? "tb-select--error" : ""} ${className}`.trim()}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        required={required}
        {...props}
      >
        {children
          ? children
          : options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
      </select>

      {error ? (
        <span id={`${inputId}-error`} className="tb-error-text" role="alert">
          {error}
        </span>
      ) : helper ? (
        <span id={`${inputId}-helper`} className="tb-helper">
          {helper}
        </span>
      ) : null}
    </div>
  );
});

export default Select;

