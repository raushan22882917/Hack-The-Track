import { useWebSocket } from '../hooks/useWebSocket';
import { useTelemetryStore } from '../store/telemetryStore';
import { LeaderboardEntry } from '../types/telemetry';
import { API_CONFIG } from '../config/api';

const LEADERBOARD_WS_URL = API_CONFIG.WS_LEADERBOARD;

export function useLeaderboardServiceWS() {
  const { updateLeaderboard } = useTelemetryStore();

  const { isConnected } = useWebSocket<LeaderboardEntry>({
    url: LEADERBOARD_WS_URL,
    enabled: API_CONFIG.WEBSOCKET_ENABLED,
    autoConnect: API_CONFIG.WEBSOCKET_AUTO_CONNECT,
    onMessage: (entry: LeaderboardEntry) => {
      if (entry.type === 'leaderboard_entry') {
        updateLeaderboard(entry);
      }
    },
    onOpen: () => {
      console.log('Connected to leaderboard server (WebSocket)');
    },
    onError: () => {
      // Errors are logged by the useWebSocket hook
    },
  });

  return { isConnected };
}

