import apiClient from "./client";

/**
 * Users, Candidate Profiles, and Admin Service
 */
export const usersApi = {
  /**
   * Get my user account details.
   */
  getMyAccount() {
    return apiClient("/api/users/me", { method: "GET" });
  },

  /**
   * Update my user account details.
   * @param {Object} data - { full_name?, phone_number?, location?, bio?, profile_picture? }
   */
  updateMyAccount(data) {
    return apiClient("/api/users/me", {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Update candidate specific profile.
   * @param {Object} data - { education?, experience_summary?, career_interests?, portfolio_url?, linkedin_url?, github_url?, is_public? }
   */
  updateCandidateProfile(data) {
    return apiClient("/api/candidates/profile", {
      method: "PUT",
      body: data,
    });
  },

  /**
   * View public profile of a user (or private if owner/authorized employer).
   * @param {number} userId
   */
  getUserProfile(userId) {
    return apiClient(`/api/users/${userId}/profile`, {
      method: "GET",
      requiresAuth: false, // can be accessed publicly if candidate is_public
    });
  },

  /**
   * Admin: List users with pagination and search.
   * @param {Object} params - { page?, page_size?, role?, q? }
   */
  getAdminUsers(params) {
    return apiClient("/api/admin/users", {
      method: "GET",
      params,
    });
  },

  /**
   * Admin: Update user active status or role.
   * @param {number} userId
   * @param {Object} data - { is_active?, role? }
   */
  updateAdminUser(userId, data) {
    return apiClient(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: data,
    });
  },

  /**
   * Admin: Get platform summary statistics.
   */
  getAdminSummary() {
    return apiClient("/api/admin/summary", { method: "GET" });
  },
};

export default usersApi;

