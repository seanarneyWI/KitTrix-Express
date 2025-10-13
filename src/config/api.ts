// API configuration - determines the base URL based on environment
const getApiBaseUrl = (): string => {
  const isProd = import.meta.env.PROD;
  const mode = import.meta.env.MODE;
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const hostname = window.location.hostname;

  console.log('🔧 API Config:', {
    'import.meta.env.PROD': isProd,
    'import.meta.env.MODE': mode,
    'VITE_API_URL': viteApiUrl,
    'window.location.hostname': hostname,
    'window.location.origin': window.location.origin,
    'window.location.href': window.location.href
  });

  // Detect production by checking if we're NOT on localhost
  // This is more reliable than import.meta.env.PROD for our deployment setup
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocalhost) {
    // Production: Use the same origin as the frontend (Express serves both)
    console.log('✅ Production detected (not localhost), using:', window.location.origin);
    return window.location.origin;
  }

  // Development: Use VITE_API_URL or default to localhost:3001
  const devUrl = viteApiUrl || 'http://localhost:3001';
  console.log('🔧 Development detected (localhost), using:', devUrl);
  return devUrl;
};

export const API_BASE_URL = getApiBaseUrl();
console.log('📡 Final API_BASE_URL:', API_BASE_URL);

// Helper function to build API URLs
export const apiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};
