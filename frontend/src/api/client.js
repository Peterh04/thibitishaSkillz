/**
 * Centralized API client for Thibitisha Skills frontend.
 * Automatically injects JWT Bearer tokens, handles JSON & FormData,
 * formats query parameters, and standardizes error responses.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Perform an HTTP request with automatic token injection and error handling.
 */
export async function apiClient(endpoint, options = {}) {
  const {
    method = "GET",
    body,
    params,
    headers = {},
    requiresAuth = true,
    isFormData = false,
  } = options;

  // Build query string if params are provided
  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `${url.includes("?") ? "&" : "?"}${queryString}`;
    }
  }

  // Set default headers
  const requestHeaders = new Headers(headers);

  // Set content type for JSON bodies
  if (!isFormData && body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Inject JWT authorization token if available and required
  if (requiresAuth) {
    const token = localStorage.getItem("thibitisha_token");
    if (token && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    throw new ApiError(
      "Network error: Unable to connect to backend server. Make sure the backend is running.",
      0,
      null
    );
  }

  // Handle 401 Unauthorized (expired/invalid token)
  if (response.status === 401 && requiresAuth) {
    localStorage.removeItem("thibitisha_token");
    localStorage.removeItem("thibitisha_user");
    // Broadcast auth change or trigger redirect if not already on auth pages
    if (!window.location.pathname.includes("/signin") && !window.location.pathname.includes("/signup")) {
      window.dispatchEvent(new Event("thibitisha_auth_expired"));
    }
  }

  // Extract response body
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred.";
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Pydantic validation errors
        errorMessage = data.detail.map((err) => `${err.loc.join(".")}: ${err.msg}`).join(", ");
      } else if (data.message) {
        errorMessage = data.message;
      }
    } else if (typeof data === "string" && data.trim()) {
      errorMessage = data;
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}

export default apiClient;

