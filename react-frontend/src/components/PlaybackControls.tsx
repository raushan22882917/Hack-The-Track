import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryServiceWS as useTelemetryService } from '../services/telemetryServiceWS';

export function PlaybackControls() {
  const { isPaused, playbackSpeed } = useTelemetryStore();
  const { play, pause, reverse, restart, setSpeed } = useTelemetryService();

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 flex items-center gap-4">
      <button
        onClick={isPaused ? play : pause}
        className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        title={isPaused ? 'Play' : 'Pause'}
      >
        {isPaused ? <Play size={20} /> : <Pause size={20} />}
      </button>

      <button
        onClick={reverse}
        className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
        title="Reverse"
      >
        <RotateCcw size={20} />
      </button>

      <button
        onClick={restart}
        className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
        title="Restart"
      >
        <FastForward size={20} />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm">Speed:</span>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={playbackSpeed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-24"
        />
        <span className="text-sm w-12">{playbackSpeed.toFixed(1)}x</span>
      </div>
    </div>
  );
}

