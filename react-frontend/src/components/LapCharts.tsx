import { useTelemetryStore } from '../store/telemetryStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Trophy } from 'lucide-react';

export function LapCharts() {
  const { lapEvents, selectedVehicleId } = useTelemetryStore();

  const selectedEvents = selectedVehicleId
    ? lapEvents[selectedVehicleId] || []
    : [];

  // Prepare lap time data
  const lapTimeData = selectedEvents
    .filter((e) => e.lap_time !== null && e.lap_time !== undefined)
    .map((e) => ({
      lap: e.lap,
      time: e.lap_time,
      name: `Lap ${e.lap}`,
    }));

  // Prepare sector time data
  const sectorData = selectedEvents
    .filter((e) => e.sector_times && e.sector_times.length === 3)
    .slice(-10) // Last 10 laps
    .map((e) => ({
      lap: e.lap,
      sector1: e.sector_times[0],
      sector2: e.sector_times[1],
      sector3: e.sector_times[2],
      name: `Lap ${e.lap}`,
    }));

  // Top 10 fastest laps
  const topLaps = [...selectedEvents]
    .filter((e) => e.lap_time !== null && e.lap_time !== undefined)
    .sort((a, b) => (a.lap_time || 0) - (b.lap_time || 0))
    .slice(0, 10)
    .map((e) => ({
      lap: e.lap,
      time: e.lap_time,
      name: `Lap ${e.lap}`,
    }));

  if (selectedEvents.length === 0) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-full max-w-4xl">
        <div className="text-sm text-gray-400">No lap data available</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-full max-w-4xl space-y-6 max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Trophy size={20} />
        Lap Analysis - Vehicle {selectedVehicleId}
      </h3>

      {/* Lap Times Chart */}
      {lapTimeData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Lap Times</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lapTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="time"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Lap Time (s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector Times Chart */}
      {sectorData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Sector Times (Last 10 Laps)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Bar dataKey="sector1" fill="#ef4444" name="Sector 1" />
              <Bar dataKey="sector2" fill="#3b82f6" name="Sector 2" />
              <Bar dataKey="sector3" fill="#10b981" name="Sector 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 10 Fastest Laps */}
      {topLaps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Top 10 Fastest Laps</h4>
          <div className="space-y-1">
            {topLaps.map((lap, index) => (
              <div
                key={lap.lap}
                className="flex items-center justify-between p-2 bg-gray-700 rounded"
              >
                <span className="text-sm">
                  #{index + 1} - {lap.name}
                </span>
                <span className="font-semibold">{lap.time?.toFixed(3)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

