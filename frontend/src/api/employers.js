import apiClient from "./client";

/**
 * Employers API Service
 */
export const employersApi = {
  /**
   * Get current employer profile.
   */
  getProfile() {
    return apiClient("/api/employers/profile", { method: "GET" });
  },

  /**
   * Update employer profile.
   * @param {Object} data - { company_name?, company_description?, company_website?, company_location?, industry?, company_logo? }
   */
  updateProfile(data) {
    return apiClient("/api/employers/profile", {
      method: "PUT",
      body: data,
    });
  },

  /**
   * List jobs posted by current employer.
   * @param {Object} params - { page?, page_size?, status? }
   */
  getMyJobs(params) {
    return apiClient("/api/employers/my-jobs", {
      method: "GET",
      params,
    });
  },
};

export default employersApi;

