import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Button from "../ui/Button";
import {
  IconSun,
  IconMoon,
  IconBriefcase,
  IconAward,
  IconUser,
  IconLogOut,
  IconMenu,
  IconX,
  IconPlus,
  IconLayers,
  IconShield,
} from "../ui/Icons";

export default function AppShell({ children, breadcrumbs = null }) {
  const { user, isAuthenticated, isEmployer, isJobSeeker, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await logout();
    navigate("/signin");
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="tb-shell">
      {/* Sticky Main Header */}
      <header className="tb-header">
        <div className="tb-container tb-header__inner">
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
            <Link to={isEmployer ? "/recruiter" : "/"} className="tb-brand">
              <span className="tb-brand__mark">
                <IconShield size={15} />
              </span>
              <span className="tb-brand__text">
                Thibitisha Skills
                <span className="tb-brand__badge">Verified</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="tb-nav" style={{ display: "none" }} data-desktop-nav>
              {!isAuthenticated && (
                <>
                  <Link
                    to="/"
                    className={`tb-nav-link ${isActive("/") && location.pathname === "/" ? "tb-nav-link--active" : ""}`}
                  >
                    <IconBriefcase size={16} />
                    Open Jobs
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`tb-nav-link ${isActive("/leaderboard") ? "tb-nav-link--active" : ""}`}
                  >
                    <IconAward size={16} />
                    Leaderboard
                  </Link>
                </>
              )}

              {isAuthenticated && isJobSeeker && (
                <>
                  <Link
                    to="/"
                    className={`tb-nav-link ${location.pathname === "/" ? "tb-nav-link--active" : ""}`}
                  >
                    <IconBriefcase size={16} />
                    Open Jobs
                  </Link>
                  <Link
                    to="/dashboard"
                    className={`tb-nav-link ${isActive("/dashboard") ? "tb-nav-link--active" : ""}`}
                  >
                    <IconLayers size={16} />
                    Dashboard
                  </Link>
                  <Link
                    to="/assessments"
                    className={`tb-nav-link ${isActive("/assessments") ? "tb-nav-link--active" : ""}`}
                  >
                    <IconAward size={16} />
                    Assessments
                  </Link>
                  <Link
                    to="/interview"
                    className={`tb-nav-link ${isActive("/interview") ? "tb-nav-link--active" : ""}`}
                  >
                    Voice Interview
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`tb-nav-link ${isActive("/leaderboard") ? "tb-nav-link--active" : ""}`}
                  >
                    Leaderboard
                  </Link>
                </>
              )}

              {isAuthenticated && isEmployer && (
                <>
                  <Link
                    to="/recruiter"
                    className={`tb-nav-link ${location.pathname === "/recruiter" ? "tb-nav-link--active" : ""}`}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/recruiter/jobs"
                    className={`tb-nav-link ${isActive("/recruiter/jobs") && location.pathname !== "/recruiter/jobs/new" ? "tb-nav-link--active" : ""}`}
                  >
                    <IconBriefcase size={16} />
                    Manage Jobs
                  </Link>
                  <Link
                    to="/recruiter/shortlisted"
                    className={`tb-nav-link ${isActive("/recruiter/shortlisted") || isActive("/shortlisted") ? "tb-nav-link--active" : ""}`}
                  >
                    <IconUser size={16} />
                    Candidates
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Controls (Theme, Auth, Actions) */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="tb-btn tb-btn--ghost tb-btn--sm tb-btn--icon-only"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>

            {/* Guest Actions */}
            {!isAuthenticated && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Link to="/signin">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Get started
                  </Button>
                </Link>
              </div>
            )}

            {/* Authenticated User Menu */}
            {isAuthenticated && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {isEmployer && (
                  <Link to="/recruiter/jobs/new" style={{ display: "none" }} data-desktop-nav>
                    <Button variant="primary" size="sm" icon={<IconPlus size={14} />}>
                      Post Job
                    </Button>
                  </Link>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "3px var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-sunken)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <Link
                    to={isEmployer ? "/recruiter" : "/profile"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--text)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    <span
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent-subtle)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "var(--font-weight-semibold)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
                    </span>
                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user?.full_name || user?.email || "Account"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Sign out"
                    aria-label="Sign out"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-faint)",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <IconLogOut size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              className="tb-btn tb-btn--ghost tb-btn--sm tb-btn--icon-only"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              data-mobile-trigger
            >
              {mobileMenuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: "fixed",
              top: "56px",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "var(--surface)",
              zIndex: 35,
              padding: "var(--space-4) var(--gutter)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {!isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconBriefcase size={16} /> Open Jobs
                </Link>
                <Link
                  to="/leaderboard"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconAward size={16} /> Leaderboard
                </Link>
                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "var(--space-2) 0" }} />
                <Link
                  to="/signin"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="tb-nav-link tb-nav-link--active"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create account
                </Link>
              </>
            ) : isJobSeeker ? (
              <>
                <Link
                  to="/"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconBriefcase size={16} /> Open Jobs
                </Link>
                <Link
                  to="/dashboard"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconLayers size={16} /> Dashboard
                </Link>
                <Link
                  to="/assessments"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconAward size={16} /> Technical Assessments
                </Link>
                <Link
                  to="/interview"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Voice Interview
                </Link>
                <Link
                  to="/profile"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconUser size={16} /> Profile Settings
                </Link>
                <Link
                  to="/leaderboard"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconAward size={16} /> Leaderboard
                </Link>
                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "var(--space-2) 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="tb-nav-link"
                  style={{ color: "var(--color-danger)" }}
                >
                  <IconLogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/recruiter"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Employer Overview
                </Link>
                <Link
                  to="/recruiter/jobs"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconBriefcase size={16} /> Manage Job Postings
                </Link>
                <Link
                  to="/recruiter/jobs/new"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconPlus size={16} /> Post New Job
                </Link>
                <Link
                  to="/recruiter/shortlisted"
                  className="tb-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconUser size={16} /> Candidate Evaluation
                </Link>
                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "var(--space-2) 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="tb-nav-link"
                  style={{ color: "var(--color-danger)" }}
                >
                  <IconLogOut size={16} /> Sign out
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="tb-shell__main tb-container">
        {breadcrumbs}
        {children}
      </main>

      {/* Trust & Craft Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          backgroundColor: "var(--surface)",
          padding: "var(--space-6) 0",
          marginTop: "auto",
        }}
      >
        <div
          className="tb-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-faint)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success)",
                display: "inline-block",
              }}
            />
            <span>Thibitisha Skills &bull; Objective AI-evaluated Technical Skills Platform</span>
          </div>
          <div>
            <span>Verified assessments &bull; Anti-cheat proctoring &bull; Audited talent matching</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

