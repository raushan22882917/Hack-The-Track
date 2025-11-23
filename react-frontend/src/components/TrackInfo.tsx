import { useState, useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import { TrackMap } from './TrackMap';
import trackData from '../data/track.json';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Google Maps API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function TrackInfo() {
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Extract track path coordinates from JSON
  const trackPath = useMemo(() => {
    return trackData.trackPath.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));
  }, []);

  // Calculate center from track path
  const center = useMemo(() => {
    if (trackPath.length === 0) {
      return { lat: 33.532687202828264, lng: -86.61964077924488 };
    }
    const lats = trackPath.map((p) => p.lat);
    const lngs = trackPath.map((p) => p.lng);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [trackPath]);

  // Start/Finish point
  const startFinishPoint = trackPath[0];

  // Create icon config only when Google Maps is loaded
  const startMarkerIcon = useMemo(() => {
    if (!mapLoaded || !window.google?.maps?.SymbolPath) {
      return undefined; // Use default marker
    }
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#00FF00',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    };
  }, [mapLoaded]);

  // Polyline options for track path
  const trackPathOptions = {
    strokeColor: '#FFFF00',
    strokeOpacity: 0.9,
    strokeWeight: 3,
    clickable: false,
    draggable: false,
    editable: false,
    visible: true,
    zIndex: 1,
  };

  const mapOptions = {
    zoom: 15,
    center: center,
    mapTypeId: 'satellite' as const,
    disableDefaultUI: true,
    zoomControl: true,
  };

  return (
    <>
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold">Barber Motorsports Park</h3>
        </div>
        <div 
          className="relative w-full h-32 rounded overflow-hidden bg-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowFullscreenMap(true)}
          title="Click to view fullscreen map"
        >
          {GOOGLE_MAPS_API_KEY ? (
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                options={mapOptions}
                onLoad={(map) => {
                  setMapLoaded(true);
                  // Fit bounds to track
                  if (trackPath.length > 0 && window.google?.maps) {
                    const googleBounds = new window.google.maps.LatLngBounds();
                    trackPath.forEach((point) => {
                      googleBounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
                    });
                    map.fitBounds(googleBounds, 20);
                  }
                }}
              >
                {/* Draw track path */}
                {trackPath.length > 0 && (
                  <Polyline path={trackPath} options={trackPathOptions} />
                )}
                {/* Start/Finish Marker */}
                {startFinishPoint && (
                  <Marker
                    position={startFinishPoint}
                    icon={startMarkerIcon}
                    label={{
                      text: 'START',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  />
                )}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              <div className="text-center">
                <MapPin size={24} className="mx-auto mb-1" />
                <div>Google Maps API key required</div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          <div>Track Length: 2.38 miles (3.83 km)</div>
          <div>Location: Birmingham, Alabama</div>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {showFullscreenMap && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowFullscreenMap(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors"
              title="Close map"
            >
              <X size={24} />
            </button>
          </div>
          <div className="w-full h-full">
            <TrackMap 
              showStartFinish={true}
              showCheckpoints={true}
            />
          </div>
        </div>
      )}
    </>
  );
}

