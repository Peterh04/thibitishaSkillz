import apiClient from "./client";

/**
 * CV Management & Gemini AI Analysis Service
 */
export const cvApi = {
  /**
   * Upload candidate CV file (PDF or DOCX).
   * @param {File} file
   */
  uploadCv(file) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient("/api/cv/upload", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  /**
   * Get candidate's currently active CV.
   */
  getMyCv() {
    return apiClient("/api/cv/my-cv", { method: "GET" });
  },

  /**
   * Get candidate's CV upload history.
   */
  getMyCvHistory() {
    return apiClient("/api/cv/my-cv/history", { method: "GET" });
  },

  /**
   * Delete an uploaded CV.
   * @param {number} cvId
   */
  deleteCv(cvId) {
    return apiClient(`/api/cv/${cvId}`, { method: "DELETE" });
  },

  /**
   * Trigger Google Gemini AI analysis and skill extraction on an uploaded CV.
   * @param {number} cvId
   */
  analyzeCv(cvId) {
    return apiClient(`/api/cv/${cvId}/analyze`, { method: "POST" });
  },

  /**
   * Retrieve saved analysis result for a CV.
   * @param {number} cvId
   */
  getCvAnalysis(cvId) {
    return apiClient(`/api/cv/${cvId}/analysis`, { method: "GET" });
  },
};

export default cvApi;

