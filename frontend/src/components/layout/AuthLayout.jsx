import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { IconShield, IconCheck, IconSun, IconMoon } from "../ui/Icons";

export default function AuthLayout({ children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Brand & Value Proposition Column */}
      <aside
        style={{
          flex: "1 1 45%",
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "var(--space-10) var(--space-12)",
          backgroundColor: "var(--surface-raised)",
          borderRight: "1px solid var(--border-subtle)",
          position: "relative",
          overflow: "hidden",
        }}
        data-desktop-nav
      >
        {/* Subtle geometric grid backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "radial-gradient(var(--text) 1px, transparent 1px), radial-gradient(var(--text) 1px, var(--surface-raised) 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        {/* Top: Brand Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-3)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--text)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <IconShield size={16} />
            </span>
            <span>Thibitisha Skills</span>
          </Link>
        </div>

        {/* Center: Editorial Manifesto */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "440px", my: "auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent-subtle)",
              color: "var(--accent)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              marginBottom: "var(--space-4)",
              border: "1px solid var(--accent-subtle-border)",
            }}
          >
            <IconShield size={13} />
            Verified Talent Infrastructure
          </div>

          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              lineHeight: "1.15",
              letterSpacing: "var(--tracking-tighter)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--text)",
              marginBottom: "var(--space-4)",
            }}
          >
            Prove what you can build. Not what you claim.
          </h1>

          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--text-muted)",
              marginBottom: "var(--space-6)",
            }}
          >
            Thibitisha evaluates technical abilities through objective tests and interactive AI
            interviews. Top candidates get matched directly with verified employers.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCheck size={12} />
              </span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                Audited technical skill assessments with code validation
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCheck size={12} />
              </span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                Real-time conversational voice interviews evaluated on reasoning
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCheck size={12} />
              </span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                Live public leaderboard and cryptographically verifiable scores
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: Integrity Seal */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-faint)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "var(--color-success)",
            }}
          />
          Objective skills verification &bull; Zero recruiter bias
        </div>
      </aside>

      {/* Main Form Canvas */}
      <main
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "var(--space-8) var(--gutter)",
          position: "relative",
        }}
      >
        {/* Floating Theme Toggle in Corner */}
        <div style={{ position: "absolute", top: "var(--space-6)", right: "var(--gutter)" }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="tb-btn tb-btn--ghost tb-btn--sm tb-btn--icon-only"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
        </div>

        {/* Form Container */}
        <div style={{ width: "100%", maxWidth: "420px" }}>{children}</div>
      </main>
    </div>
  );
}

