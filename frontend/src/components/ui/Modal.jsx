import { useEffect } from "react";
import { IconX } from "./Icons";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "520px",
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="tb-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tb-modal-title"
    >
      <div className="tb-modal" style={{ maxWidth }}>
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 id="tb-modal-title" style={{ fontSize: "var(--font-size-md)", margin: 0 }}>
            {title}
          </h3>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-faint)",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "var(--radius-sm)",
              }}
              aria-label="Close modal"
            >
              <IconX size={18} />
            </button>
          )}
        </div>
        <div style={{ padding: "var(--space-6)" }}>{children}</div>
      </div>
    </div>
  );
}

