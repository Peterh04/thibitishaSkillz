import apiClient from "./client";

/**
 * Skill Assessments & Verifications API Service
 */
export const assessmentsApi = {
  /**
   * Start a new assessment for a skill with Gemini-generated questions.
   * @param {Object} data - { skill_id: number, difficulty_level: 'beginner'|'intermediate'|'advanced' }
   */
  startAssessment(data) {
    return apiClient("/api/assessments/start", {
      method: "POST",
      body: data,
    });
  },

  /**
   * List all assessments taken by the candidate.
   */
  getMyAssessments() {
    return apiClient("/api/assessments/my-assessments", { method: "GET" });
  },

  /**
   * Get single assessment metadata.
   * @param {number} assessmentId
   */
  getAssessment(assessmentId) {
    return apiClient(`/api/assessments/${assessmentId}`, { method: "GET" });
  },

  /**
   * Get questions for an open assessment (correct answers stripped).
   * @param {number} assessmentId
   */
  getQuestions(assessmentId) {
    return apiClient(`/api/assessments/${assessmentId}/questions`, {
      method: "GET",
    });
  },

  /**
   * Submit answers for all assessment questions.
   * @param {number} assessmentId
   * @param {Object} data - { answers: [{ question_id: number, candidate_answer: string }] }
   */
  submitAssessment(assessmentId, data) {
    return apiClient(`/api/assessments/${assessmentId}/submit`, {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get results, awarded marks, and feedback for completed assessment.
   * @param {number} assessmentId
   */
  getResults(assessmentId) {
    return apiClient(`/api/assessments/${assessmentId}/results`, {
      method: "GET",
    });
  },

  /**
   * Get candidate's verified skills history.
   */
  getMyVerifications() {
    return apiClient("/api/verifications/my-skills", { method: "GET" });
  },

  /**
   * Get candidate's latest verification for a specific skill.
   * @param {number} skillId
   */
  getSkillVerification(skillId) {
    return apiClient(`/api/verifications/${skillId}`, { method: "GET" });
  },

  /**
   * Get verified skills for any public candidate (or viewed by authorized employer).
   * @param {number} candidateId
   */
  getCandidateVerifications(candidateId) {
    return apiClient(`/api/verifications/candidate/${candidateId}`, {
      method: "GET",
      requiresAuth: false,
    });
  },
};

export default assessmentsApi;

