import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", fontFamily: "sans-serif", color: "#555" }}>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If employer trying to view candidate page or candidate trying to view recruiter page
    if (user.role === "employer") {
      return <Navigate to="/recruiter" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

