export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`tb-tabs ${className}`.trim()} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tb-tab-btn ${isActive ? "tb-tab-btn--active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span style={{ marginRight: "6px" }}>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "var(--font-size-xs)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-pill)",
                  background: isActive ? "var(--accent-subtle)" : "var(--surface-sunken)",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, className = "" }) {
  return (
    <div className={`tb-segmented ${className}`.trim()} role="group">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`tb-segmented-btn ${isActive ? "tb-segmented-btn--active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

