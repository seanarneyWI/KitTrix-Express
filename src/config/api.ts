// API configuration - determines the base URL based on environment
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;

  // Detect production by checking if we're NOT on localhost
  // This is more reliable than import.meta.env.PROD for our deployment setup
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocalhost) {
    // Production: Use the same origin as the frontend (Express serves both)
    return window.location.origin;
  }

  // Development: Use VITE_API_URL or default to localhost:3001
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const devUrl = viteApiUrl || 'http://localhost:3001';
  return devUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const apiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};
