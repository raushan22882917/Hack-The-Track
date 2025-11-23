/**
 * API Configuration
 * All services run on integrated FastAPI server (port 8000)
 * Using WebSocket for real-time data streaming
 * 
 * Backend URL can be configured via environment variable:
 * - VITE_API_BASE_URL (defaults to http://127.0.0.1:8000/)
 * - VITE_WEBSOCKET_ENABLED (defaults to true) - Set to "false" to disable WebSocket auto-connection
 * - VITE_WEBSOCKET_AUTO_CONNECT (defaults to true) - Set to "false" to disable auto-connection on mount
 */

// Get base URL from environment variable or use default
const getBaseUrl = (): string => {
  // Vite uses import.meta.env for environment variables
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // Remove trailing slash if present
    return envUrl.trim().replace(/\/$/, '');
  }
  // Default to localhost:8000 (use same hostname as frontend to avoid CORS/WebSocket issues)
  // This ensures consistent hostname between frontend (localhost:3000) and backend (localhost:8000)
  return 'http://127.0.0.1:8000/';
};

// Get WebSocket enabled setting from environment variable
const getWebSocketEnabled = (): boolean => {
  const envValue = import.meta.env.VITE_WEBSOCKET_ENABLED;
  if (envValue === 'false' || envValue === '0') {
    return false;
  }
  return true; // Default to enabled
};

// Get WebSocket auto-connect setting from environment variable
const getWebSocketAutoConnect = (): boolean => {
  const envValue = import.meta.env.VITE_WEBSOCKET_AUTO_CONNECT;
  if (envValue === 'false' || envValue === '0') {
    return false;
  }
  return true; // Default to auto-connect
};

const BASE_URL = getBaseUrl();
const WEBSOCKET_ENABLED = getWebSocketEnabled();
const WEBSOCKET_AUTO_CONNECT = getWebSocketAutoConnect();

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (path: string): string => {
  // Always use absolute URL based on BASE_URL
  // This ensures WebSocket connects directly to backend (avoids proxy issues)
  const wsBase = BASE_URL.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsBase}${normalizedPath}`;
};

export const API_CONFIG = {
  // Integrated FastAPI server URL (all services on one port)
  BASE_URL,
  
  // WebSocket configuration
  WEBSOCKET_ENABLED,
  WEBSOCKET_AUTO_CONNECT,
  
  // WebSocket endpoints (primary method for real-time data, all on port 8000)
  WS_TELEMETRY: getWebSocketUrl('/ws/telemetry'),
  WS_ENDURANCE: getWebSocketUrl('/ws/endurance'),
  WS_LEADERBOARD: getWebSocketUrl('/ws/leaderboard'),
  
  // Server-Sent Events (SSE) endpoints - alternative method
  SSE_TELEMETRY: '/sse/telemetry',
  SSE_ENDURANCE: '/sse/endurance',
  SSE_LEADERBOARD: '/sse/leaderboard',
  
  // REST API endpoints
  API: {
    HEALTH: '/api/health',
    TELEMETRY: '/api/telemetry',
    ENDURANCE: '/api/endurance',
    LEADERBOARD: '/api/leaderboard',
    CONTROL: '/api/control',
  },
};

// Log the configured backend URL on startup
console.log('🔌 Backend API Configuration:');
console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
console.log(`   Frontend URL: ${typeof window !== 'undefined' ? window.location.origin : 'N/A (SSR)'}`);
console.log(`   WebSocket Enabled: ${API_CONFIG.WEBSOCKET_ENABLED}`);
console.log(`   WebSocket Auto-Connect: ${API_CONFIG.WEBSOCKET_AUTO_CONNECT}`);
if (API_CONFIG.WEBSOCKET_ENABLED) {
  console.log(`   WebSocket Telemetry: ${API_CONFIG.WS_TELEMETRY}`);
  console.log(`   WebSocket Endurance: ${API_CONFIG.WS_ENDURANCE}`);
  console.log(`   WebSocket Leaderboard: ${API_CONFIG.WS_LEADERBOARD}`);
  
  // Test if backend is reachable
  if (typeof window !== 'undefined') {
    fetch(`${API_CONFIG.BASE_URL}/api/health`)
      .then(res => res.json())
      .then(data => {
        console.log(`   ✅ Backend server is reachable:`, data);
      })
      .catch(err => {
        console.warn(`   ⚠️ Backend server appears unreachable at ${API_CONFIG.BASE_URL}:`, err.message);
        console.warn(`   Make sure the FastAPI server is running: python run.py (in fastapi-server/)`);
      });
  }
} else {
  console.log(`   ⚠️ WebSocket is disabled. Set VITE_WEBSOCKET_ENABLED=true to enable.`);
}
console.log(`   To configure, set environment variables in .env file:`);
console.log(`   - VITE_API_BASE_URL=http://127.0.0.1:8000/`);
console.log(`   - VITE_WEBSOCKET_ENABLED=true (or false to disable)`);
console.log(`   - VITE_WEBSOCKET_AUTO_CONNECT=true (or false to disable auto-connection)`);

