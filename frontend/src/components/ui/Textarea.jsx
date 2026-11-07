import { forwardRef } from "react";

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helper,
    id,
    className = "",
    wrapperClassName = "",
    required = false,
    rows = 4,
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

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`tb-textarea ${error ? "tb-textarea--error" : ""} ${className}`.trim()}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        required={required}
        {...props}
      />

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

export default Textarea;

