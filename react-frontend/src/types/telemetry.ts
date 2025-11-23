/**
 * Type definitions for telemetry data structures
 */

export interface TelemetryFrame {
  type: 'telemetry_frame';
  timestamp: string;
  vehicles: Record<string, Record<string, number | null>>;
  weather?: WeatherData;
}

export interface WeatherData {
  air_temp?: number | null;
  track_temp?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  wind_speed?: number | null;
  wind_direction?: number | null;
  rain?: number | null;
}

export interface LapEvent {
  type: 'lap_event';
  vehicle_id: string;
  lap: number;
  lap_time?: number | null;
  sector_times: Array<number | null>;
  top_speed?: number | null;
  flag?: string | null;
  pit: boolean;
  timestamp?: string | null;
}

export interface LeaderboardEntry {
  type: 'leaderboard_entry';
  class_type?: string | null;
  position: number;
  pic: number;
  vehicle_id: string;
  vehicle?: string | null;
  laps: number;
  elapsed?: string | null;
  gap_first?: string | null;
  gap_previous?: string | null;
  best_lap_num: number;
  best_lap_time?: string | null;
  best_lap_kph: number;
}

export interface ControlMessage {
  type: 'control';
  cmd: 'play' | 'pause' | 'reverse' | 'restart' | 'speed' | 'seek';
  value?: number;
  timestamp?: string;
}

export interface VehicleTelemetry {
  vehicleId: string;
  speed?: number;
  rpm?: number;
  gear?: number;
  throttle?: number;
  brake_front?: number;
  brake_rear?: number;
  steering?: number;
  lap?: number;
  lap_distance?: number;
  gps_lat?: number;
  gps_lon?: number;
  altitude?: number;
  acceleration_x?: number;
  acceleration_y?: number;
  timestamp: string;
}

export interface VehicleState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  telemetry: VehicleTelemetry;
}

