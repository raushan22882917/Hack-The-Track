import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { Car } from 'lucide-react';

export function VehicleSelector() {
  const { vehicles, selectedVehicleId, setSelectedVehicle } = useTelemetryStore();
  const vehicleIds = Object.keys(vehicles);

  // Debug: Log vehicles when they change
  React.useEffect(() => {
    if (vehicleIds.length > 0) {
      console.log('VehicleSelector: Vehicles in store:', vehicleIds);
      vehicleIds.forEach(id => {
        const v = vehicles[id];
        console.log(`  - ${id}: position=${JSON.stringify(v.position)}, hasGPS=${!!(v.telemetry.gps_lat && v.telemetry.gps_lon)}`);
      });
    }
  }, [vehicleIds.length, vehicles]);

  if (vehicleIds.length === 0) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Car size={16} />
          Vehicles
        </h3>
        <div className="text-xs text-gray-400">Waiting for vehicle data...</div>
        <div className="text-xs text-gray-500 mt-2">Check browser console for debug info</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Car size={16} />
        Select Vehicle
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {vehicleIds.map((vehicleId) => {
          const isSelected = vehicleId === selectedVehicleId;
          return (
            <button
              key={vehicleId}
              onClick={() => setSelectedVehicle(vehicleId)}
              className={`p-2 rounded text-xs transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {vehicleId}
            </button>
          );
        })}
      </div>
    </div>
  );
}

