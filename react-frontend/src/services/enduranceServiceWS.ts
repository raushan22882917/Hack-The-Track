import { useWebSocket } from '../hooks/useWebSocket';
import { useTelemetryStore } from '../store/telemetryStore';
import { LapEvent } from '../types/telemetry';
import { API_CONFIG } from '../config/api';

const ENDURANCE_WS_URL = API_CONFIG.WS_ENDURANCE;

export function useEnduranceServiceWS() {
  const { addLapEvent } = useTelemetryStore();

  const { isConnected } = useWebSocket<LapEvent>({
    url: ENDURANCE_WS_URL,
    enabled: API_CONFIG.WEBSOCKET_ENABLED,
    autoConnect: API_CONFIG.WEBSOCKET_AUTO_CONNECT,
    onMessage: (event: LapEvent) => {
      if (event.type === 'lap_event') {
        addLapEvent(event);
      }
    },
    onOpen: () => {
      console.log('Connected to endurance server (WebSocket)');
    },
    onError: () => {
      // Errors are logged by the useWebSocket hook
    },
  });

  return { isConnected };
}

