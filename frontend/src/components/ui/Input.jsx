import { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    label,
    error,
    helper,
    startIcon,
    endIcon,
    shortcutHint,
    id,
    className = "",
    wrapperClassName = "",
    required = false,
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
          {shortcutHint && (
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                padding: "1px 5px",
                color: "var(--text-faint)",
              }}
            >
              {shortcutHint}
            </kbd>
          )}
        </label>
      )}

      <div className="tb-input-wrapper">
        {startIcon && <span className="tb-input-icon">{startIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`tb-input ${startIcon ? "tb-input--has-icon" : ""} ${error ? "tb-input--error" : ""} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          required={required}
          {...props}
        />
        {endIcon && (
          <span style={{ position: "absolute", right: "var(--space-3)", color: "var(--text-faint)", display: "flex", alignItems: "center" }}>
            {endIcon}
          </span>
        )}
      </div>

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

export default Input;

