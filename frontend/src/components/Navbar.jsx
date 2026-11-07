import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Button from "./ui/Button";
import {
  IconShield,
  IconSun,
  IconMoon,
  IconBriefcase,
  IconAward,
  IconUser,
  IconLayers,
  IconLogOut,
  IconPlus,
} from "./ui/Icons";

export default function Navbar() {
  const { user, isAuthenticated, isEmployer, isJobSeeker, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

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
    <header className="tb-header" style={{ width: "100%", marginBottom: "var(--space-6)" }}>
      <div className="tb-container tb-header__inner">
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

          <nav className="tb-nav" style={{ display: "none" }} data-desktop-nav>
            {!isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className={`tb-nav-link ${location.pathname === "/" ? "tb-nav-link--active" : ""}`}
                >
                  <IconBriefcase size={16} /> Open Jobs
                </Link>
                <Link
                  to="/leaderboard"
                  className={`tb-nav-link ${isActive("/leaderboard") ? "tb-nav-link--active" : ""}`}
                >
                  <IconAward size={16} /> Leaderboard
                </Link>
              </>
            ) : isJobSeeker ? (
              <>
                <Link
                  to="/"
                  className={`tb-nav-link ${location.pathname === "/" ? "tb-nav-link--active" : ""}`}
                >
                  <IconBriefcase size={16} /> Open Jobs
                </Link>
                <Link
                  to="/dashboard"
                  className={`tb-nav-link ${isActive("/dashboard") ? "tb-nav-link--active" : ""}`}
                >
                  <IconLayers size={16} /> Dashboard
                </Link>
                <Link
                  to="/assessments"
                  className={`tb-nav-link ${isActive("/assessments") ? "tb-nav-link--active" : ""}`}
                >
                  <IconAward size={16} /> Assessments
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
            ) : (
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
                  <IconBriefcase size={16} /> Manage Jobs
                </Link>
                <Link
                  to="/recruiter/shortlisted"
                  className={`tb-nav-link ${isActive("/recruiter/shortlisted") || isActive("/shortlisted") ? "tb-nav-link--active" : ""}`}
                >
                  <IconUser size={16} /> Candidates
                </Link>
              </>
            )}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="tb-btn tb-btn--ghost tb-btn--sm tb-btn--icon-only"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>

          {!isAuthenticated ? (
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
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {isEmployer && (
                <Link to="/recruiter/jobs/new">
                  <Button variant="primary" size="sm" icon={<IconPlus size={14} />}>
                    Post Job
                  </Button>
                </Link>
              )}
              <Link
                to={isEmployer ? "/recruiter" : "/profile"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface-sunken)",
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
                    fontFamily: "var(--font-mono)",
                    fontWeight: "600",
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
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <IconLogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
