import { useWebSocket } from '../hooks/useWebSocket';
import { useTelemetryStore } from '../store/telemetryStore';
import { TelemetryFrame, ControlMessage } from '../types/telemetry';
import { geoToUnity, setReference } from '../utils/gpsUtils';
import { API_CONFIG } from '../config/api';

const TELEMETRY_WS_URL = API_CONFIG.WS_TELEMETRY;

// Set GPS reference (from Unity code)
setReference(33.530494689941406, -86.62052154541016, 1.0);

export function useTelemetryServiceWS() {
  const {
    updateVehicle,
    setWeather,
    setPlaying,
    setPaused,
    setPlaybackSpeed,
  } = useTelemetryStore();

  const { isConnected, send } = useWebSocket<TelemetryFrame | any>({
    url: TELEMETRY_WS_URL,
    enabled: API_CONFIG.WEBSOCKET_ENABLED,
    autoConnect: API_CONFIG.WEBSOCKET_AUTO_CONNECT,
    onMessage: (frame: any) => {
      // Handle different message types
      if (frame.type === 'connected') {
        console.log('Telemetry WebSocket connected:', frame);
        if (!frame.has_data) {
          console.warn('⚠️ Server connected but no telemetry data loaded. Check CSV files in telemetry-server/logs/vehicles/');
        }
      } else if (frame.type === 'telemetry_frame') {
        // Update weather
        if (frame.weather) {
          setWeather(frame.weather);
        }

        // Update vehicles
        if (frame.vehicles) {
          Object.entries(frame.vehicles).forEach(([vehicleId, telemetry]: [string, any]) => {
            // Extract GPS coordinates if available
            const lat = telemetry.gps_lat;
            const lon = telemetry.gps_lon;
            const altitude = telemetry.altitude || 0;

            let position = undefined;
            if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
              position = geoToUnity(lat, lon, altitude);
            }

            // Always update vehicle, even without GPS coordinates
            updateVehicle(vehicleId, {
              ...telemetry,
              timestamp: frame.timestamp,
            }, position);
          });
        } else {
          console.warn('Telemetry frame has no vehicles');
        }
      } else if (frame.type === 'telemetry_end') {
        console.log('Telemetry playback ended');
        setPaused(true);
      }
      // Silently ignore unknown frame types
    },
    onOpen: () => {
      console.log('Connected to telemetry server (WebSocket)');
    },
    onError: (error) => {
      console.error('Telemetry WebSocket error:', error);
    },
  });

  const play = () => {
    send({ type: 'control', cmd: 'play' } as ControlMessage);
    setPlaying(true);
  };

  const pause = () => {
    send({ type: 'control', cmd: 'pause' } as ControlMessage);
    setPaused(true);
  };

  const reverse = () => {
    send({ type: 'control', cmd: 'reverse' } as ControlMessage);
    setPlaying(true);
  };

  const restart = () => {
    send({ type: 'control', cmd: 'restart' } as ControlMessage);
    setPlaying(true);
  };

  const setSpeed = (speed: number) => {
    send({ type: 'control', cmd: 'speed', value: speed } as ControlMessage);
    setPlaybackSpeed(speed);
  };

  return {
    isConnected,
    play,
    pause,
    reverse,
    restart,
    setSpeed,
  };
}

