import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Skeleton from "./ui/Skeleton";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          gap: "var(--space-4)",
          padding: "var(--space-8)",
        }}
      >
        <Skeleton height="32px" width="220px" />
        <Skeleton height="16px" width="340px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "employer") {
      return <Navigate to="/recruiter" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
