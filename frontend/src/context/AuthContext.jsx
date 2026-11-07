import { createContext, useContext, useEffect, useState, useCallback } from "react";
import authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("thibitisha_token"));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("thibitisha_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem("thibitisha_token");
    if (!storedToken) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setProfile(data.candidate_profile || data.employer_profile || null);
      localStorage.setItem("thibitisha_user", JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.warn("Failed to fetch current user profile:", err.message);
      // If unauthorized, clear stale credentials
      if (err.status === 401) {
        localStorage.removeItem("thibitisha_token");
        localStorage.removeItem("thibitisha_user");
        setToken(null);
        setUser(null);
        setProfile(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      setProfile(null);
    };

    window.addEventListener("thibitisha_auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("thibitisha_auth_expired", handleAuthExpired);
    };
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem("thibitisha_token", data.access_token);
    localStorage.setItem("thibitisha_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    // Fetch full profiles
    await fetchCurrentUser();
    return data;
  };

  const register = async ({ email, password, full_name, role, phone_number, location }) => {
    const data = await authApi.register({
      email,
      password,
      full_name,
      role,
      phone_number: phone_number || undefined,
      location: location || undefined,
    });
    localStorage.setItem("thibitisha_token", data.access_token);
    localStorage.setItem("thibitisha_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    await fetchCurrentUser();
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Server logout notification skipped:", err.message);
    } finally {
      localStorage.removeItem("thibitisha_token");
      localStorage.removeItem("thibitisha_user");
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const value = {
    user,
    token,
    profile,
    loading,
    isAuthenticated: !!token && !!user,
    isJobSeeker: user?.role === "job_seeker",
    isEmployer: user?.role === "employer",
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

