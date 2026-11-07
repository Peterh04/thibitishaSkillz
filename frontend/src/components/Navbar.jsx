import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, isEmployer, isJobSeeker, logout } = useAuth();
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
    <header className="ph-dash__bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", padding: "0 32px", background: "#fff", borderBottom: "1px solid #e8e8e6" }}>
      <Link
        to={isEmployer ? "/recruiter" : "/"}
        style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "600", color: "#1a1a1a", textDecoration: "none" }}
      >
        <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#1a5fa6" }} />
        <span>Thibitisha Skills</span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Guest links */}
        {!isAuthenticated && (
          <>
            <Link
              to="/"
              style={{
                fontSize: "14px",
                color: isActive("/") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Open Jobs
            </Link>
            <Link
              to="/leaderboard"
              style={{
                fontSize: "14px",
                color: isActive("/leaderboard") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/leaderboard") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Leaderboard
            </Link>
            <Link
              to="/signin"
              style={{
                fontSize: "14px",
                color: isActive("/signin") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/signin") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              style={{
                fontSize: "14px",
                padding: "6px 14px",
                background: "#1a5fa6",
                color: "#fff",
                borderRadius: "6px",
                fontWeight: "500",
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </>
        )}

        {/* Candidate links */}
        {isAuthenticated && isJobSeeker && (
          <>
            <Link
              to="/"
              style={{
                fontSize: "14px",
                color: isActive("/") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Open Jobs
            </Link>
            <Link
              to="/dashboard"
              style={{
                fontSize: "14px",
                color: isActive("/dashboard") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/dashboard") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              My Dashboard
            </Link>
            <Link
              to="/assessments"
              style={{
                fontSize: "14px",
                color: isActive("/assessments") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/assessments") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Skills & Tests
            </Link>
            <Link
              to="/leaderboard"
              style={{
                fontSize: "14px",
                color: isActive("/leaderboard") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/leaderboard") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Leaderboard
            </Link>
          </>
        )}

        {/* Employer links */}
        {isAuthenticated && isEmployer && (
          <>
            <Link
              to="/recruiter"
              style={{
                fontSize: "14px",
                color: isActive("/recruiter") && location.pathname === "/recruiter" ? "#1a5fa6" : "#555",
                fontWeight: isActive("/recruiter") && location.pathname === "/recruiter" ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Overview
            </Link>
            <Link
              to="/recruiter/jobs"
              style={{
                fontSize: "14px",
                color: isActive("/recruiter/jobs") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/recruiter/jobs") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Posted Jobs
            </Link>
            <Link
              to="/recruiter/jobs/new"
              style={{
                fontSize: "14px",
                padding: "6px 12px",
                background: "#1a5fa6",
                color: "#fff",
                borderRadius: "6px",
                fontWeight: "500",
                textDecoration: "none",
              }}
            >
              + Post Job
            </Link>
            <Link
              to="/leaderboard"
              style={{
                fontSize: "14px",
                color: isActive("/leaderboard") ? "#1a5fa6" : "#555",
                fontWeight: isActive("/leaderboard") ? "600" : "400",
                textDecoration: "none",
              }}
            >
              Leaderboard
            </Link>
          </>
        )}

        {/* Authenticated user pill + signout */}
        {isAuthenticated && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "12px", borderLeft: "1px solid #e8e8e6", paddingLeft: "16px" }}>
            <span style={{ fontSize: "13px", color: "#666" }}>
              <strong>{user.full_name}</strong>{" "}
              <span style={{ fontSize: "11px", padding: "2px 6px", background: isEmployer ? "#eef4fa" : "#e3f1d9", color: isEmployer ? "#1a5fa6" : "#2c5a14", borderRadius: "10px", textTransform: "capitalize" }}>
                {user.role === "job_seeker" ? "Candidate" : user.role}
              </span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                border: "none",
                background: "transparent",
                color: "#777",
                cursor: "pointer",
                fontSize: "13px",
                textDecoration: "underline",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

