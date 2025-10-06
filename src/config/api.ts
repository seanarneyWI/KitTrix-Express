// API configuration - determines the base URL based on environment
const getApiBaseUrl = (): string => {
  // In production, use the same origin as the frontend (since Express serves both)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // In development, use VITE_API_URL or default to localhost:3001
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const apiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};
