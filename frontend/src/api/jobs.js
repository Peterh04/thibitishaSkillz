import apiClient from "./client";

/**
 * Jobs & Candidate Matching API Service
 */
export const jobsApi = {
  /**
   * Browse published jobs with filters.
   * @param {Object} params - { page?, page_size?, q?, location?, employment_type?, skill_id?, status? }
   */
  getJobs(params) {
    return apiClient("/api/jobs", {
      method: "GET",
      params,
      requiresAuth: false,
    });
  },

  /**
   * Get job details and required skills.
   * @param {number} jobId
   */
  getJob(jobId) {
    return apiClient(`/api/jobs/${jobId}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  /**
   * Employer: Create a new job.
   * @param {Object} data - { title, description, responsibilities?, qualifications?, location?, employment_type?, experience_level?, status?, application_deadline? }
   */
  createJob(data) {
    return apiClient("/api/jobs", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Employer: Update job details or change status (draft, published, closed).
   * @param {number} jobId
   * @param {Object} data
   */
  updateJob(jobId, data) {
    return apiClient(`/api/jobs/${jobId}`, {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Employer: Delete a job.
   * @param {number} jobId
   */
  deleteJob(jobId) {
    return apiClient(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });
  },

  /**
   * Employer: Add required skills to a job.
   * @param {number} jobId
   * @param {Object} data - { skills: [{ skill_id: number, minimum_score?: number, importance_weight?: number }] }
   */
  addJobSkills(jobId, data) {
    return apiClient(`/api/jobs/${jobId}/skills`, {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get required skills for a job.
   * @param {number} jobId
   */
  getJobSkills(jobId) {
    return apiClient(`/api/jobs/${jobId}/skills`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  /**
   * Employer: Replace all required skills for a job.
   * @param {number} jobId
   * @param {Object} data - { skills: [...] }
   */
  replaceJobSkills(jobId, data) {
    return apiClient(`/api/jobs/${jobId}/skills`, {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Employer: Find candidates who meet ALL required skills and minimum scores.
   * @param {number} jobId
   * @param {Object} params - { page?, page_size? }
   */
  getQualifiedCandidates(jobId, params) {
    return apiClient(`/api/jobs/${jobId}/candidates`, {
      method: "GET",
      params,
    });
  },

  /**
   * Employer: Find all candidates ranked by weighted match score against this job.
   * @param {number} jobId
   * @param {Object} params - { page?, page_size? }
   */
  getJobMatches(jobId, params) {
    return apiClient(`/api/jobs/${jobId}/matches`, {
      method: "GET",
      params,
    });
  },
};

export default jobsApi;

