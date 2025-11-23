import { useTelemetryStore } from '../store/telemetryStore';
import { Trophy, Clock } from 'lucide-react';

export function Leaderboard() {
  const { leaderboard } = useTelemetryStore();

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-yellow-600';
    if (position === 2) return 'bg-gray-400';
    if (position === 3) return 'bg-orange-600';
    return 'bg-gray-700';
  };

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-96 max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy size={20} />
        Leaderboard
      </h3>

      {leaderboard.length === 0 ? (
        <div className="text-sm text-gray-400">No leaderboard data yet</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.vehicle_id}
              className={`p-3 rounded ${
                entry.position <= 3 ? getPositionColor(entry.position) : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">#{entry.position}</span>
                  <span className="font-semibold">
                    {entry.vehicle || `Vehicle ${entry.vehicle_id}`}
                  </span>
                </div>
                <div className="text-sm">{entry.laps} laps</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div>
                  <span className="text-gray-300">Gap to Leader:</span>{' '}
                  <span className="font-semibold">{entry.gap_first || '--'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Gap to Previous:</span>{' '}
                  <span className="font-semibold">{entry.gap_previous || '--'}</span>
                </div>
              </div>

              {entry.best_lap_time && (
                <div className="flex items-center gap-1 text-xs mt-2">
                  <Clock size={12} />
                  <span>Best Lap: {entry.best_lap_time}</span>
                  <span className="text-gray-400">
                    ({entry.best_lap_kph.toFixed(1)} km/h)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

