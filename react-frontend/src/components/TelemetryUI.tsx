import { useTelemetryStore } from '../store/telemetryStore';

export function TelemetryUI() {
  const { vehicles, selectedVehicleId } = useTelemetryStore();
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : null;

  if (!selectedVehicle) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-80">
        <div className="text-sm text-gray-400">No vehicle selected</div>
      </div>
    );
  }

  const telemetry = selectedVehicle.telemetry;

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-80 space-y-4">
      <div className="border-b border-gray-700 pb-2">
        <h3 className="text-lg font-bold">Vehicle {telemetry.vehicleId}</h3>
      </div>

      {/* Speed & RPM */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Speed</div>
          <div className="text-2xl font-bold">
            {telemetry.speed ? (telemetry.speed * 3.6).toFixed(1) : '--'} km/h
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">RPM</div>
          <div className="text-2xl font-bold">
            {telemetry.rpm?.toFixed(0) || '--'}
          </div>
        </div>
      </div>

      {/* Gear & Lap */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Gear</div>
          <div className="text-xl font-semibold">{telemetry.gear ?? '--'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Lap</div>
          <div className="text-xl font-semibold">{telemetry.lap ?? '--'}</div>
        </div>
      </div>

      {/* Throttle & Brake */}
      <div>
        <div className="text-xs text-gray-400 mb-1">Throttle</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(telemetry.throttle || 0) * 100}%` }}
          />
        </div>
        <div className="text-xs text-right mt-1">
          {((telemetry.throttle || 0) * 100).toFixed(0)}%
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Brake (Front)</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${(telemetry.brake_front || 0) * 100}%` }}
          />
        </div>
        <div className="text-xs text-right mt-1">
          {((telemetry.brake_front || 0) * 100).toFixed(0)}%
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Brake (Rear)</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${(telemetry.brake_rear || 0) * 100}%` }}
          />
        </div>
        <div className="text-xs text-right mt-1">
          {((telemetry.brake_rear || 0) * 100).toFixed(0)}%
        </div>
      </div>

      {/* Steering */}
      <div>
        <div className="text-xs text-gray-400 mb-1">Steering</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className="absolute h-full w-1 bg-blue-500 transition-all"
              style={{
                left: `${50 + (telemetry.steering || 0) * 50}%`,
                transform: 'translateX(-50%)',
              }}
            />
          </div>
          <div className="text-xs w-12 text-right">
            {((telemetry.steering || 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Lap Distance */}
      {telemetry.lap_distance !== undefined && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Lap Distance</div>
          <div className="text-lg font-semibold">
            {telemetry.lap_distance.toFixed(2)} m
          </div>
        </div>
      )}

      {/* Acceleration Forces */}
      {(telemetry.acceleration_x !== undefined || telemetry.acceleration_y !== undefined) && (
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Forces</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              X: {telemetry.acceleration_x?.toFixed(2) || '--'} m/s²
            </div>
            <div>
              Y: {telemetry.acceleration_y?.toFixed(2) || '--'} m/s²
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

