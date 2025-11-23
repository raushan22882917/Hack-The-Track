import { useMemo } from 'react';
import { Vector3, geoToUnity, setReferenceFromPoints } from '../utils/gpsUtils';
import { VehicleState } from '../types/telemetry';
import { Line } from '@react-three/drei';
import trackData from '../data/track.json';

interface Track3DProps {
  vehicles: Record<string, VehicleState>;
}

export function Track3D({ vehicles }: Track3DProps) {
  // Generate track path from track.json GPS coordinates
  const trackPoints = useMemo(() => {
    // Convert GPS coordinates to 3D positions
    const gpsPoints = trackData.trackPath.map((point) => ({
      lat: point.latitude,
      lon: point.longitude,
    }));

    // Set reference from track points if not already set
    if (gpsPoints.length > 0) {
      setReferenceFromPoints(gpsPoints, 1.0);
    }

    // Convert all track points to 3D coordinates
    return gpsPoints.map((point) => geoToUnity(point.lat, point.lon, 0));
  }, []);

  if (trackPoints.length < 2) return null;

  return (
    <group>
      {/* Track Path Line - Main racing line */}
      {trackPoints.length > 1 && (
        <Line
          points={trackPoints.map((p) => [p.x, p.y + 0.1, p.z])}
          color="#FF0000"
          lineWidth={4}
        />
      )}

      {/* Track Center Line - Dashed effect */}
      {trackPoints.length > 1 && (
        <Line
          points={trackPoints.map((p) => [p.x, p.y + 0.11, p.z])}
          color="#FFFF00"
          lineWidth={1}
          dashed
          dashScale={10}
          dashSize={2}
          gapSize={2}
        />
      )}

      {/* Start/Finish Marker */}
      {trackPoints.length > 0 && (
        <mesh position={[trackPoints[0].x, trackPoints[0].y + 0.3, trackPoints[0].z]}>
          <cylinderGeometry args={[2, 2, 0.5, 16]} />
          <meshStandardMaterial color="#00FF00" />
        </mesh>
      )}

      {/* Checkpoint Markers (every 10 points) */}
      {trackPoints
        .map((point, index) => ({ point, index }))
        .filter((_, index) => index % 10 === 0 && index > 0 && index < trackPoints.length - 1)
        .map(({ point, index }) => (
          <mesh key={`checkpoint-${index}`} position={[point.x, point.y + 0.2, point.z]}>
            <coneGeometry args={[1, 2, 8]} />
            <meshStandardMaterial color="#FFFF00" />
          </mesh>
        ))}
    </group>
  );
}

