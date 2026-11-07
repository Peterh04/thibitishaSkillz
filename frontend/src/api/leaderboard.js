import apiClient from "./client";

/**
 * Leaderboard & Rankings API Service
 */
export const leaderboardApi = {
  /**
   * Get public leaderboard across all skills or filtered by category/skill.
   * @param {Object} params - { page?, page_size?, skill_id?, category? }
   */
  getLeaderboard(params) {
    return apiClient("/api/leaderboard", {
      method: "GET",
      params,
      requiresAuth: false,
    });
  },

  /**
   * Get leaderboard rankings for a specific skill.
   * @param {number} skillId
   * @param {Object} params - { page?, page_size? }
   */
  getSkillLeaderboard(skillId, params) {
    return apiClient(`/api/leaderboard/${skillId}`, {
      method: "GET",
      params,
      requiresAuth: false,
    });
  },

  /**
   * Get top N ranked candidates for a specific skill.
   * @param {number} skillId
   * @param {number} limit
   */
  getTopLeaderboard(skillId, limit = 10) {
    return apiClient(`/api/leaderboard/${skillId}/top`, {
      method: "GET",
      params: { limit },
      requiresAuth: false,
    });
  },
};

export default leaderboardApi;

