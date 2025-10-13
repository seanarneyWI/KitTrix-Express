// API configuration - determines the base URL based on environment
const getApiBaseUrl = (): string => {
  const isProd = import.meta.env.PROD;
  const mode = import.meta.env.MODE;
  const viteApiUrl = import.meta.env.VITE_API_URL;

  console.log('🔧 API Config:', {
    'import.meta.env.PROD': isProd,
    'import.meta.env.MODE': mode,
    'VITE_API_URL': viteApiUrl,
    'window.location.origin': window.location.origin,
    'window.location.href': window.location.href
  });

  // In production, use the same origin as the frontend (since Express serves both)
  if (isProd) {
    console.log('✅ Using production URL:', window.location.origin);
    return window.location.origin;
  }

  // In development, use VITE_API_URL or default to localhost:3001
  const devUrl = viteApiUrl || 'http://localhost:3001';
  console.log('🔧 Using development URL:', devUrl);
  return devUrl;
};

export const API_BASE_URL = getApiBaseUrl();
console.log('📡 Final API_BASE_URL:', API_BASE_URL);

// Helper function to build API URLs
export const apiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};
