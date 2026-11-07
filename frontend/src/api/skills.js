import apiClient from "./client";

/**
 * Skills Catalog & Candidate Skills Service
 */
export const skillsApi = {
  /**
   * Get all skills in the platform catalog.
   */
  getSkills() {
    return apiClient("/api/skills", {
      method: "GET",
      requiresAuth: false,
    });
  },

  /**
   * Get distinct categories.
   */
  getCategories() {
    return apiClient("/api/skills/categories", {
      method: "GET",
      requiresAuth: false,
    });
  },

  /**
   * Get candidate's claimed/added skills.
   */
  getMySkills() {
    return apiClient("/api/skills/my-skills", { method: "GET" });
  },

  /**
   * Add a skill to candidate's profile.
   * @param {Object} data - { skill_id, claimed_level?: 'beginner'|'intermediate'|'advanced' }
   */
  addMySkill(data) {
    return apiClient("/api/skills/my-skills", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Remove a skill from candidate's profile.
   * @param {number} skillId
   */
  removeMySkill(skillId) {
    return apiClient(`/api/skills/my-skills/${skillId}`, {
      method: "DELETE",
    });
  },

  /**
   * Get a single skill by id.
   * @param {number} skillId
   */
  getSkill(skillId) {
    return apiClient(`/api/skills/${skillId}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  /**
   * Admin: Create skill in catalog.
   */
  adminCreateSkill(data) {
    return apiClient("/api/skills", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Admin: Update skill in catalog.
   */
  adminUpdateSkill(skillId, data) {
    return apiClient(`/api/skills/${skillId}`, {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Admin: Delete unused skill from catalog.
   */
  adminDeleteSkill(skillId) {
    return apiClient(`/api/skills/${skillId}`, {
      method: "DELETE",
    });
  },
};

export default skillsApi;

