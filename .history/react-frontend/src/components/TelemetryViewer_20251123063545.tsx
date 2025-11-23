import { useEffect, useState } from 'react';
// Use WebSocket for real-time data streaming
import { useTelemetryServiceWS as useTelemetryService } from '../services/telemetryServiceWS';
import { useEnduranceServiceWS as useEnduranceService } from '../services/enduranceServiceWS';
import { useLeaderboardServiceWS as useLeaderboardService } from '../services/leaderboardServiceWS';
import { Scene3D } from './Scene3D';
import { TrackMap } from './TrackMap';
import { TelemetryUI } from './TelemetryUI';
import { Leaderboard } from './Leaderboard';
import { PlaybackControls } from './PlaybackControls';
import { WeatherDisplay } from './WeatherDisplay';
import { VehicleSelector } from './VehicleSelector';
import { LapCharts } from './LapCharts';
import { ServerStatus } from './ServerStatus';
import { DriverInsights } from './DriverInsights';
import { TrackInfo } from './TrackInfo';
import { useTelemetryStore } from '../store/telemetryStore';

export function TelemetryViewer() {
  const telemetryService = useTelemetryService();
  const enduranceService = useEnduranceService();
  const leaderboardService = useLeaderboardService();
  const { vehicles } = useTelemetryStore();
  const [showCharts, setShowCharts] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');

  const allConnected =
    telemetryService.isConnected &&
    enduranceService.isConnected &&
    leaderboardService.isConnected;
  
  const hasVehicles = Object.keys(vehicles).length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowCharts((prev) => !prev);
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setViewMode((prev) => (prev === '3d' ? 'map' : '3d'));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-connect when component mounts (automatic WebSocket connection)
  useEffect(() => {
    // WebSocket connections are automatically established via useTelemetryService hooks
    // No manual connection needed - React hooks handle it automatically
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-900 text-white overflow-hidden">
      {/* Connection Status - All WebSocket connections shown in ServerStatus */}
      <div className="absolute top-4 right-4 z-50">
        <ServerStatus />
      </div>

      

      {/* 3D Scene or Map */}
      <div className="absolute inset-0">
        {viewMode === '3d' ? (
          <Scene3D />
        ) : (
          <TrackMap
            vehicles={Object.fromEntries(
              Object.entries(vehicles)
                .filter(([, vehicle]) => 
                  vehicle.telemetry.gps_lat != null && 
                  vehicle.telemetry.gps_lon != null &&
                  !isNaN(vehicle.telemetry.gps_lat) &&
                  !isNaN(vehicle.telemetry.gps_lon)
                )
                .map(([id, vehicle]) => [
                  id,
                  {
                    position: {
                      lat: vehicle.telemetry.gps_lat!,
                      lng: vehicle.telemetry.gps_lon!,
                    },
                    heading: vehicle.rotation?.y || 0,
                    speed: vehicle.telemetry.speed || 0,
                    vehicleId: id,
                  },
                ])
            )}
            showStartFinish={true}
            showCheckpoints={false}
          />
        )}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Top Bar */}
          <div className="absolute top-4 left-4 flex gap-4">
            <PlaybackControls />
            <WeatherDisplay />
          </div>

          {/* Left Sidebar - Telemetry */}
          <div className="absolute left-4 top-24 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
            <TrackInfo />
            <VehicleSelector />
            <TelemetryUI />
            <DriverInsights />
          </div>

          {/* Right Sidebar - Leaderboard */}
          <div className="absolute right-4 top-24">
            <Leaderboard />
          </div>

          {/* Charts Modal */}
          {showCharts && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
              <div className="relative">
                <button
                  onClick={() => setShowCharts(false)}
                  className="absolute top-2 right-2 text-white hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
                <LapCharts />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Warning */}
      {!allConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="text-center max-w-2xl mx-4">
            <h2 className="text-2xl font-bold mb-4">Connecting to server...</h2>
            <p className="text-gray-400 mb-2">
              Make sure the FastAPI server is running on port 8000
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Using WebSocket for real-time data streaming
            </p>
            <div className="bg-gray-800 rounded-lg p-4 text-left text-sm">
              <p className="text-yellow-400 font-semibold mb-2">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Check if the server is running: <code className="bg-gray-700 px-1 rounded">python -m uvicorn fastapi-server.main:app --reload</code></li>
                <li>Verify CSV files exist in <code className="bg-gray-700 px-1 rounded">fastapi-server/logs/vehicles/</code></li>
                <li>Check browser console for connection errors</li>
                <li>Ensure port 8000 is not blocked by firewall</li>
                <li className="mt-2 pt-2 border-t border-gray-700">
                  <strong className="text-yellow-400">For Deployment:</strong> Set <code className="bg-gray-700 px-1 rounded">VITE_API_BASE_URL</code> environment variable to your backend URL (e.g., <code className="bg-gray-700 px-1 rounded">https://your-backend.com</code>)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Data Warning - Connected but no data */}
      {allConnected && !hasVehicles && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="text-center max-w-2xl mx-4">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Connected but no telemetry data</h2>
            <p className="text-gray-400 mb-2">
              Server is connected but no vehicle data is being received
            </p>
            <div className="bg-gray-800 rounded-lg p-4 text-left text-sm mt-4">
              <p className="text-yellow-400 font-semibold mb-2">Possible issues:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Click the <strong>Play</strong> button to start playback (data starts paused)</li>
                <li>Check if CSV files exist in <code className="bg-gray-700 px-1 rounded">telemetry-server/logs/vehicles/</code></li>
                <li>Verify server console shows data was loaded successfully</li>
                <li>Check browser console for any error messages</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

