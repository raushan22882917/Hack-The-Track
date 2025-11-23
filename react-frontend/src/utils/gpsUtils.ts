/**
 * GPS -> 3D coordinate conversions using a local tangent plane approximation.
 * Converted from Unity C# GPSUtils.cs
 */

const EARTH_RADIUS = 6378137.0; // WGS84 Earth radius (meters)
const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

let referenceLat = 0.0;
let referenceLon = 0.0;
let hasReference = false;
let unityScale = 1.0;

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Set the lat/lon origin for conversion.
 * Example: call once with the first GPS coordinate from the logs to center the scene.
 */
export function setReference(refLat: number, refLon: number, scale: number = 1.0): void {
  referenceLat = refLat;
  referenceLon = refLon;
  hasReference = true;
  unityScale = scale;
}

/**
 * Reset reference (useful for tests)
 */
export function clearReference(): void {
  referenceLat = 0.0;
  referenceLon = 0.0;
  hasReference = false;
}

/**
 * Convert lat/lon (decimal degrees) to 3D world position.
 * Y (height) optional (meters).
 * Uses equirectangular approximation: good for small areas (few km).
 * X axis = East, Z axis = North.
 */
export function geoToUnity(
  lat: number,
  lon: number,
  altitudeMeters: number = 0.0
): Vector3 {
  if (!hasReference) {
    console.warn("GPSUtils: reference not set. Defaulting reference to provided coordinate.");
    setReference(lat, lon, unityScale);
    return { x: 0, y: 0, z: 0 };
  }

  // Convert degrees to radians
  const latRad = lat * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;
  const refLatRad = referenceLat * DEG_TO_RAD;
  const refLonRad = referenceLon * DEG_TO_RAD;

  // Equirectangular approximation:
  // deltaX (east)  = R * cos(meanLat) * deltaLon
  // deltaZ (north) = R * deltaLat
  const meanLat = (latRad + refLatRad) / 2.0;
  const dLat = latRad - refLatRad;
  const dLon = lonRad - refLonRad;

  const metersNorth = EARTH_RADIUS * dLat;
  const metersEast = EARTH_RADIUS * Math.cos(meanLat) * dLon;

  // Y axis uses altitude in meters
  const x = metersEast * unityScale;
  const z = metersNorth * unityScale;
  const y = altitudeMeters * unityScale;

  return { x, y, z };
}

/**
 * Compute a good reference automatically from a collection of lat/lon pairs (centroid).
 */
export function setReferenceFromPoints(
  points: Array<{ lat: number; lon: number }>,
  scale: number = 1.0
): void {
  if (points.length === 0) {
    throw new Error("No points provided");
  }

  const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
  const sumLon = points.reduce((sum, p) => sum + p.lon, 0);
  setReference(sumLat / points.length, sumLon / points.length, scale);
}

/**
 * Utility: convert meters back to lat/lon delta (approx).
 */
export function metersToDegrees(
  metersNorth: number,
  metersEast: number
): { deltaLatDeg: number; deltaLonDeg: number } {
  const deltaLatRad = metersNorth / EARTH_RADIUS;
  const meanLatRad = referenceLat * DEG_TO_RAD;
  const deltaLonRad = metersEast / (EARTH_RADIUS * Math.cos(meanLatRad));
  return {
    deltaLatDeg: deltaLatRad * RAD_TO_DEG,
    deltaLonDeg: deltaLonRad * RAD_TO_DEG,
  };
}

