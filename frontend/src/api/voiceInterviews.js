import apiClient from "./client";

/**
 * Voice Interviews & Spoken Interviewer API Service (MsingiAI & Gemini)
 */
export const voiceInterviewsApi = {
  /**
   * Start a new voice interview session.
   * @param {Object} data - { skill_id?, cv_id?, language?: 'sw'|'en' }
   */
  startInterview(data = {}) {
    return apiClient("/api/voice-interviews/start", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get the current active question turn.
   * @param {number} interviewId
   */
  getCurrentTurn(interviewId) {
    return apiClient(`/api/voice-interviews/${interviewId}/current-question`, {
      method: "GET",
    });
  },

  /**
   * Get synthesized question WAV audio from MsingiAI.
   * @param {number} interviewId
   * @param {number} turnIndex
   */
  getQuestionAudioUrl(interviewId, turnIndex) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    return `${baseUrl}/api/voice-interviews/${interviewId}/turns/${turnIndex}/audio`;
  },

  /**
   * Submit recorded audio answer for the current interview turn.
   * @param {number} interviewId
   * @param {Blob|File} audioBlob
   */
  submitTurnAnswer(interviewId, audioBlob) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "answer.wav");
    return apiClient(`/api/voice-interviews/${interviewId}/answer`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  /**
   * Get full voice interview details, transcript, and scores.
   * @param {number} interviewId
   */
  getInterview(interviewId) {
    return apiClient(`/api/voice-interviews/${interviewId}`, {
      method: "GET",
    });
  },

  /**
   * List all voice interviews for the candidate.
   */
  getMyInterviews() {
    return apiClient("/api/voice-interviews/mine", {
      method: "GET",
    });
  },

  /**
   * Cancel an in-progress voice interview.
   * @param {number} interviewId
   */
  cancelInterview(interviewId) {
    return apiClient(`/api/voice-interviews/${interviewId}/cancel`, {
      method: "POST",
    });
  },
};

export default voiceInterviewsApi;
