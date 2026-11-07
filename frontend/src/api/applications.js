import apiClient from "./client";

/**
 * Job Applications API Service
 */
export const applicationsApi = {
  /**
   * Candidate applies for a job.
   * @param {number} jobId
   * @param {Object} data - { cover_letter?: string }
   */
  applyToJob(jobId, data = {}) {
    return apiClient(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      body: data,
    });
  },

  /**
   * Candidate lists their submitted applications.
   * @param {Object} params - { page?, page_size? }
   */
  getMyApplications(params) {
    return apiClient("/api/applications/my-applications", {
      method: "GET",
      params,
    });
  },

  /**
   * Employer lists all applications for a specific job.
   * @param {number} jobId
   * @param {Object} params - { page?, page_size? }
   */
  getJobApplications(jobId, params) {
    return apiClient(`/api/jobs/${jobId}/applications`, {
      method: "GET",
      params,
    });
  },

  /**
   * View details of a specific job application.
   * @param {number} applicationId
   */
  getApplication(applicationId) {
    return apiClient(`/api/applications/${applicationId}`, {
      method: "GET",
    });
  },

  /**
   * Employer: Update application status (pending, shortlisted, rejected, accepted).
   * @param {number} applicationId
   * @param {Object} data - { application_status: 'pending'|'shortlisted'|'rejected'|'accepted' }
   */
  updateApplicationStatus(applicationId, data) {
    const payload =
      typeof data === "string"
        ? { application_status: data }
        : { application_status: data.application_status || data.status };
    return apiClient(`/api/applications/${applicationId}/status`, {
      method: "PUT",
      body: payload,
    });
  },
};

export default applicationsApi;

