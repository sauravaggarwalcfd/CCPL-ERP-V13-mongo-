// Auto-detect Codespaces, LAN access, or use environment variable
const getApiUrl = () => {
  // Check if we're in Codespaces
  if (window.location.hostname.includes('app.github.dev')) {
    const codespaceUrl = window.location.origin.replace('-5173', '-8000')
    return `${codespaceUrl}/api`
  }

  // Use environment variable if explicitly set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // For LAN access: use the same host as the frontend but with backend port 8000
  // This allows accessing from any device on the same network
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:8000/api`
}

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  ACCESS_TOKEN_KEY: import.meta.env.VITE_ACCESS_TOKEN_KEY || 'access_token',
  REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token',
  USER_KEY: import.meta.env.VITE_USER_KEY || 'current_user',
}

console.log('🔧 API Configuration:', {
  baseUrl: API_CONFIG.BASE_URL,
  environment: window.location.hostname.includes('app.github.dev') ? 'Codespaces' : 'Local'
})
