// GPSUtils.cs
// Place in Assets/Scripts/Utilities/ or similar
using System;
using UnityEngine;

/// <summary>
/// GPS -> Unity coordinate conversions using a local tangent plane approximation.
/// - Uses an origin (referenceLat, referenceLon) in decimal degrees.
/// - Converts lat/lon differences to meters using Earth's radius and cos(meanLat).
/// - Returns Vector3 where X = East (meters), Z = North (meters), Y = altitude (meters).
/// - Multiply resulting Vector3 by scale (Unity units per meter) if needed.
/// </summary>
public static class GPSUtils {
    // WGS84 Earth radius (meters)
    private const double EarthRadius = 6378137.0;

    // Reference origin (decimal degrees). All conversion is relative to this.
    // Default = (0,0) until SetReference is called.
    private static double referenceLat = 0.0;
    private static double referenceLon = 0.0;
    private static bool hasReference = false;

    // Unity scale: how many Unity units equal 1 meter.
    // Default = 1 (1 Unity unit == 1 meter)
    private static float unityScale = 1.0f;

    /// <summary>
    /// Set the lat/lon origin for conversion.
    /// Example: call once with the first GPS coordinate from the logs to center the scene.
    /// </summary>
    public static void SetReference(double refLat, double refLon, float scale = 1.0f) {
        referenceLat = refLat;
        referenceLon = refLon;
        hasReference = true;
        unityScale = scale;
    }

    /// <summary>
    /// Reset reference (useful for tests)
    /// </summary>
    public static void ClearReference() {
        referenceLat = 0.0;
        referenceLon = 0.0;
        hasReference = false;
    }

    /// <summary>
    /// Convert lat/lon (decimal degrees) to Unity world position (Vector3).
    /// Y (height) optional (meters).
    /// Uses equirectangular approximation: good for small areas (few km).
    /// X axis = East, Z axis = North.
    /// </summary>
    public static Vector3 GeoToUnity(double lat, double lon, double altitudeMeters = 0.0) {
        if (!hasReference) {
            Debug.LogWarning("GPSUtils: reference not set. Defaulting reference to provided coordinate.");
            SetReference(lat, lon, unityScale);
            // returns zero vector for reference point
            return Vector3.zero;
        }

        // Convert degrees to radians
        double latRad = lat * Mathf.Deg2Rad;
        double lonRad = lon * Mathf.Deg2Rad;
        double refLatRad = referenceLat * Mathf.Deg2Rad;
        double refLonRad = referenceLon * Mathf.Deg2Rad;

        // Equirectangular approximation:
        // deltaX (east)  = R * cos(meanLat) * deltaLon
        // deltaZ (north) = R * deltaLat
        double meanLat = (latRad + refLatRad) / 2.0;
        double dLat = latRad - refLatRad;
        double dLon = lonRad - refLonRad;

        double metersNorth = EarthRadius * dLat;
        double metersEast = EarthRadius * Math.Cos(meanLat) * dLon;

        // Y axis uses altitude in meters
        float x = (float)(metersEast * unityScale);
        float z = (float)(metersNorth * unityScale);
        float y = (float)(altitudeMeters * unityScale);

        return new Vector3(x, y, z);
    }

    /// <summary>
    /// Overload that accepts floats (convenience).
    /// </summary>
    public static Vector3 GeoToUnity(float lat, float lon, float altitudeMeters = 0f) {
        return GeoToUnity((double)lat, (double)lon, (double)altitudeMeters);
    }

    /// <summary>
    /// Compute a good reference automatically from a collection of lat/lon pairs (centroid).
    /// Use before calling GeoToUnity for many points to center the scene.
    /// </summary>
    public static void SetReferenceFromPoints(System.Collections.Generic.IEnumerable<(double lat, double lon)> points, float scale = 1.0f) {
        double sumLat = 0.0;
        double sumLon = 0.0;
        int count = 0;
        foreach (var p in points) {
            sumLat += p.lat;
            sumLon += p.lon;
            count++;
        }
        if (count == 0) throw new ArgumentException("No points provided");
        SetReference(sumLat / count, sumLon / count, scale);
    }

    /// <summary>
    /// Utility: convert meters back to lat/lon delta (approx).
    /// Returns (deltaLatDegrees, deltaLonDegrees) for given metersNorth, metersEast.
    /// Useful for debugging or inverse mapping.
    /// </summary>
    public static (double deltaLatDeg, double deltaLonDeg) MetersToDegrees(double metersNorth, double metersEast) {
        double deltaLatRad = metersNorth / EarthRadius;
        double meanLatRad = referenceLat * Mathf.Deg2Rad;
        double deltaLonRad = metersEast / (EarthRadius * Math.Cos(meanLatRad));
        return (deltaLatRad * Mathf.Rad2Deg, deltaLonRad * Mathf.Rad2Deg);
    }
}
