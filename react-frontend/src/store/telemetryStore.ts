import { create } from 'zustand';
import { VehicleState, WeatherData, LapEvent, LeaderboardEntry } from '../types/telemetry';
import { Vector3 } from '../utils/gpsUtils';

interface TelemetryState {
  // Vehicles
  vehicles: Record<string, VehicleState>;
  selectedVehicleId: string | null;
  
  // Weather
  weather: WeatherData | null;
  weatherEnabled: boolean;
  
  // Playback
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  
  // Lap events
  lapEvents: Record<string, LapEvent[]>;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  
  // Actions
  updateVehicle: (vehicleId: string, telemetry: Partial<VehicleState['telemetry']>, position?: Vector3) => void;
  autoSelectFirstVehicle: () => void;
  setSelectedVehicle: (vehicleId: string | null) => void;
  setWeather: (weather: WeatherData) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addLapEvent: (event: LapEvent) => void;
  updateLeaderboard: (entry: LeaderboardEntry) => void;
  reset: () => void;
}

const initialState = {
  vehicles: {},
  selectedVehicleId: null,
  weather: null,
  weatherEnabled: true,
  isPlaying: false,
  isPaused: true,
  playbackSpeed: 1.0,
  lapEvents: {},
  leaderboard: [],
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...initialState,

  updateVehicle: (vehicleId, telemetry, position) =>
    set((state) => {
      const existing = state.vehicles[vehicleId];
      const newPosition = position || existing?.position || { x: 0, y: 0, z: 0 };
      
      // Auto-select first vehicle if none selected
      const shouldAutoSelect = !state.selectedVehicleId && Object.keys(state.vehicles).length === 0;
      
      return {
        vehicles: {
          ...state.vehicles,
          [vehicleId]: {
            position: newPosition,
            rotation: existing?.rotation || { x: 0, y: 0, z: 0 },
            telemetry: {
              ...existing?.telemetry,
              ...telemetry,
              vehicleId,
            } as VehicleState['telemetry'],
          },
        },
        selectedVehicleId: shouldAutoSelect ? vehicleId : state.selectedVehicleId,
      };
    }),

  autoSelectFirstVehicle: () =>
    set((state) => {
      const vehicleIds = Object.keys(state.vehicles);
      if (vehicleIds.length > 0 && !state.selectedVehicleId) {
        return { selectedVehicleId: vehicleIds[0] };
      }
      return state;
    }),

  setSelectedVehicle: (vehicleId) =>
    set({ selectedVehicleId: vehicleId }),

  setWeather: (weather) =>
    set({ weather }),

  setWeatherEnabled: (enabled) =>
    set({ weatherEnabled: enabled }),

  setPlaying: (playing) =>
    set({ isPlaying: playing, isPaused: !playing }),

  setPaused: (paused) =>
    set({ isPaused: paused, isPlaying: !paused }),

  setPlaybackSpeed: (speed) =>
    set({ playbackSpeed: speed }),

  addLapEvent: (event) =>
    set((state) => {
      const vehicleEvents = state.lapEvents[event.vehicle_id] || [];
      return {
        lapEvents: {
          ...state.lapEvents,
          [event.vehicle_id]: [...vehicleEvents, event],
        },
      };
    }),

  updateLeaderboard: (entry) =>
    set((state) => {
      const existing = state.leaderboard.findIndex((e) => e.vehicle_id === entry.vehicle_id);
      const newLeaderboard = [...state.leaderboard];
      
      if (existing >= 0) {
        newLeaderboard[existing] = entry;
      } else {
        newLeaderboard.push(entry);
      }
      
      // Sort by position
      newLeaderboard.sort((a, b) => a.position - b.position);
      
      return { leaderboard: newLeaderboard };
    }),

  reset: () => set(initialState),
}));

