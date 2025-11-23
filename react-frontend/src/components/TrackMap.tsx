import { useMemo } from 'react';
import { GoogleMap, LoadScript, Polyline, Polygon, Marker } from '@react-google-maps/api';
import trackData from '../data/track.json';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (will be calculated from track data)
const defaultCenter = {
  lat: 33.532687202828264,
  lng: -86.61964077924488,
};

// Google Maps API key - you'll need to replace this with your own
// For development, you can use a free API key from Google Cloud Console
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface VehicleData {
  position: { lat: number; lng: number };
  heading?: number;
  speed?: number;
  vehicleId?: string;
}

interface TrackMapProps {
  vehicles?: Record<string, VehicleData>;
  showStartFinish?: boolean;
  showCheckpoints?: boolean;
}

export function TrackMap({ vehicles, showStartFinish = true, showCheckpoints = false }: TrackMapProps) {
  // Count vehicles with valid GPS coordinates
  const vehicleCount = useMemo(() => {
    if (!vehicles) return 0;
    return Object.values(vehicles).filter(
      (v) => v.position && v.position.lat && v.position.lng
    ).length;
  }, [vehicles]);
  
  // Extract track path coordinates
  const trackPath = useMemo(() => {
    return trackData.trackPath.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));
  }, []);

  // Calculate center and bounds
  const { center, bounds } = useMemo(() => {
    if (trackPath.length === 0) {
      return { center: defaultCenter, bounds: undefined };
    }

    const lats = trackPath.map((p) => p.lat);
    const lngs = trackPath.map((p) => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    const bounds = {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
    };

    return { center, bounds };
  }, [trackPath]);

  // Calculate track boundaries (inner and outer edges)
  const { trackBoundaries, centerLine } = useMemo(() => {
    if (trackPath.length < 2) {
      return { trackBoundaries: { inner: [], outer: [] }, centerLine: [] };
    }

    const TRACK_WIDTH_METERS = 12; // Standard racing track width (~12 meters)
    const EARTH_RADIUS = 6378137; // Earth radius in meters

    const innerBoundary: Array<{ lat: number; lng: number }> = [];
    const outerBoundary: Array<{ lat: number; lng: number }> = [];

    // Helper function to calculate perpendicular offset
    const calculatePerpendicularOffset = (
      point: { lat: number; lng: number },
      prevPoint: { lat: number; lng: number },
      nextPoint: { lat: number; lng: number },
      offsetMeters: number
    ): { lat: number; lng: number } => {
      // Calculate bearing from previous to next point
      const lat1 = prevPoint.lat * (Math.PI / 180);
      const lon1 = prevPoint.lng * (Math.PI / 180);
      const lat2 = nextPoint.lat * (Math.PI / 180);
      const lon2 = nextPoint.lng * (Math.PI / 180);

      const dLon = lon2 - lon1;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearing = Math.atan2(y, x);

      // Perpendicular bearing (90 degrees)
      const perpBearing = bearing + Math.PI / 2;

      // Calculate offset in degrees
      const offsetLat =
        (offsetMeters / EARTH_RADIUS) * Math.cos(perpBearing) * (180 / Math.PI);
      const offsetLng =
        ((offsetMeters / EARTH_RADIUS) *
          Math.sin(perpBearing) *
          (180 / Math.PI)) /
        Math.cos(point.lat * (Math.PI / 180));

      return {
        lat: point.lat + offsetLat,
        lng: point.lng + offsetLng,
      };
    };

    for (let i = 0; i < trackPath.length; i++) {
      const current = trackPath[i];
      const next = trackPath[(i + 1) % trackPath.length];
      const prev = trackPath[i === 0 ? trackPath.length - 1 : i - 1];

      // Calculate offset for inner and outer boundaries
      const halfWidth = TRACK_WIDTH_METERS / 2;

      // For inner boundary (left side when looking forward)
      const innerOffset = calculatePerpendicularOffset(current, prev, next, -halfWidth);
      innerBoundary.push(innerOffset);

      // For outer boundary (right side when looking forward)
      const outerOffset = calculatePerpendicularOffset(current, prev, next, halfWidth);
      outerBoundary.push(outerOffset);
    }

    return {
      trackBoundaries: { inner: innerBoundary, outer: outerBoundary },
      centerLine: trackPath,
    };
  }, [trackPath]);

  // Create polygon path for track surface (combine outer and inner boundaries)
  const trackSurfacePath = useMemo(() => {
    if (trackBoundaries.outer.length === 0 || trackBoundaries.inner.length === 0) {
      return [];
    }
    // Close the polygon by connecting outer to inner
    return [
      ...trackBoundaries.outer,
      ...trackBoundaries.inner.slice().reverse(),
      trackBoundaries.outer[0], // Close the polygon
    ];
  }, [trackBoundaries]);

  // Polyline options for centerline (racing line)
  const centerLineOptions = useMemo(
    () => ({
      strokeColor: '#FFFF00',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 3,
    }),
    []
  );

  // Polyline options for track boundaries (white lines)
  const boundaryOptions = useMemo(
    () => ({
      strokeColor: '#FFFFFF',
      strokeOpacity: 1.0,
      strokeWeight: 2.5,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 2,
    }),
    []
  );

  // Polygon options for track surface (asphalt)
  const trackSurfaceOptions = useMemo(
    () => ({
      fillColor: '#1A1A1A', // Dark asphalt color
      fillOpacity: 0.85,
      strokeColor: '#FFFFFF', // White track boundaries
      strokeOpacity: 1.0,
      strokeWeight: 2,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 1,
    }),
    []
  );

  // Start/Finish marker
  const startFinishPoint = trackPath[0];
  const finishPoint = trackPath[trackPath.length - 1];

  // Checkpoint markers (every 10 points)
  const checkpoints = useMemo(() => {
    if (!showCheckpoints) return [];
    return trackPath
      .map((point, index) => ({ point, index }))
      .filter((_, index) => index % 10 === 0 && index > 0 && index < trackPath.length - 1);
  }, [trackPath, showCheckpoints]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    }),
    []
  );

  // If no API key, show a message
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === '') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center p-8 max-w-2xl">
          <h3 className="text-xl font-bold mb-4">Google Maps API Key Required</h3>
          <p className="text-gray-400 mb-4">
            To display the track on Google Maps, please add your API key:
          </p>
          <ol className="text-left text-sm text-gray-300 space-y-2 list-decimal list-inside mb-4">
            <li>Get a free API key from{' '}
              <a
                href="https://console.cloud.google.com/google/maps-apis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Create a <code className="bg-gray-700 px-2 py-1 rounded">.env</code> file in the react-frontend directory</li>
            <li>Add: <code className="bg-gray-700 px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
            <li>Restart the development server</li>
          </ol>
          <div className="mt-6 p-4 bg-gray-700 rounded">
            <p className="text-sm text-gray-300">
              <strong>Note:</strong> The track path is still available in the 3D view. This map view is optional.
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-900/30 rounded border border-blue-500">
            <p className="text-sm text-blue-200">
              <strong>Track Info:</strong> {trackData.trackName} - {trackData.totalPoints} points
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={(map) => {
          // Fit bounds to track
          if (bounds && window.google?.maps) {
            const googleBounds = new window.google.maps.LatLngBounds();
            trackPath.forEach((point) => {
              googleBounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
            });
            map.fitBounds(googleBounds, { padding: 50 });
          }
        }}
      >
        {/* Track Visualization Layers (rendered in order from bottom to top) */}
        
        {/* Layer 1: Track Surface (Asphalt) - Dark polygon representing the track surface */}
        {trackSurfacePath.length > 0 && (
          <Polygon paths={trackSurfacePath} options={trackSurfaceOptions} />
        )}

        {/* Layer 2: Track Boundaries - White lines marking track edges */}
        {trackBoundaries.outer.length > 0 && (
          <Polyline path={trackBoundaries.outer} options={boundaryOptions} />
        )}
        {trackBoundaries.inner.length > 0 && (
          <Polyline path={trackBoundaries.inner} options={boundaryOptions} />
        )}

        {/* Layer 3: Center Line (Racing Line) - Yellow line showing optimal racing line */}
        {centerLine.length > 0 && (
          <Polyline path={centerLine} options={centerLineOptions} />
        )}

        {/* Start/Finish Marker */}
        {showStartFinish && startFinishPoint && (
          <Marker
            position={startFinishPoint}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE,
              scale: 8,
              fillColor: '#00FF00',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }}
            label={{
              text: 'START',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          />
        )}

        {/* Finish Marker */}
        {showStartFinish && finishPoint && finishPoint !== startFinishPoint && (
          <Marker
            position={finishPoint}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE,
              scale: 8,
              fillColor: '#FF0000',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }}
            label={{
              text: 'FINISH',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          />
        )}

        {/* Checkpoint Markers */}
        {checkpoints.map((checkpoint, idx) => (
          <Marker
            key={`checkpoint-${checkpoint.index}`}
            position={checkpoint.point}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE,
              scale: 5,
              fillColor: '#FFFF00',
              fillOpacity: 0.8,
              strokeColor: '#000000',
              strokeWeight: 1,
            }}
            label={{
              text: `CP${idx + 1}`,
              color: '#000000',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          />
        ))}

        {/* Vehicle Markers - Show vehicles running on track */}
        {vehicles && vehicleCount > 0 && (
          <>
            {Object.entries(vehicles).map(([vehicleId, vehicle]) => {
              if (!vehicle.position || !vehicle.position.lat || !vehicle.position.lng) {
                return null;
              }

            // Calculate heading in degrees (convert from radians if needed)
            // Google Maps uses degrees, and rotation is clockwise from north
            let heading = 0;
            if (vehicle.heading !== undefined) {
              // If heading is in radians, convert to degrees
              // Also adjust: Google Maps uses 0° = North, clockwise
              heading = (vehicle.heading * 180) / Math.PI;
              if (heading < 0) heading += 360;
            }

            // Vehicle color based on speed (blue for normal, red for fast)
            const speed = vehicle.speed || 0;
            const fillColor = speed > 50 ? '#EF4444' : '#3B82F6'; // Red if fast, blue if normal

            // Create icon configuration
            // Use a simple path if SymbolPath is not available
            const arrowPath = window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW 
              || 'M 0,0 0,-1 1,0 0,1 z'; // Simple arrow path as fallback
            
            const iconConfig: google.maps.Symbol = {
              path: arrowPath,
              scale: 7,
              fillColor: fillColor,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              rotation: heading,
            };

            return (
              <Marker
                key={`vehicle-${vehicleId}`}
                position={vehicle.position}
                icon={iconConfig}
                label={{
                  text: vehicle.vehicleId || vehicleId,
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
                title={`Vehicle: ${vehicle.vehicleId || vehicleId}\nSpeed: ${speed.toFixed(1)} km/h`}
                zIndex={1000} // Ensure vehicles appear on top
              />
            );
            })}
          </>
        )}
      </GoogleMap>
    </LoadScript>
  );
}

