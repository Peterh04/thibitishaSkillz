import apiClient from "./client";

/**
 * Authentication API Service
 */
export const authApi = {
  /**
   * Register a new user account.
   * @param {Object} data - { full_name, email, password, role: 'job_seeker'|'employer', phone_number?, location? }
   */
  register(data) {
    return apiClient("/api/auth/register", {
      method: "POST",
      body: data,
      requiresAuth: false,
    });
  },

  /**
   * Login with email and password.
   * @param {Object} data - { email, password }
   */
  login(data) {
    return apiClient("/api/auth/login", {
      method: "POST",
      body: data,
      requiresAuth: false,
    });
  },

  /**
   * Get current authenticated user session and role profiles.
   */
  getMe() {
    return apiClient("/api/auth/me", {
      method: "GET",
    });
  },

  /**
   * Logout and revoke active JWT access token on backend.
   */
  logout() {
    return apiClient("/api/auth/logout", {
      method: "POST",
    });
  },

  /**
   * Change current user's password.
   * @param {Object} data - { current_password, new_password }
   */
  changePassword(data) {
    return apiClient("/api/auth/change-password", {
      method: "POST",
      body: data,
    });
  },
};

export default authApi;

