using Dreamteck.Splines;
using System;
using System.Collections.Generic;
using UnityEngine;

public class TelemetryVehicleController : MonoBehaviour {
    public string VehicleId;
    public LineRenderer TrackRenderer;
    public bool UseSingleLapObjects;

    private Vector3 newPosition = Vector3.zero;
    private Vector3 oldPosition = Vector3.zero;

    private List<Vector3> points = new List<Vector3>();
    private List<SplinePoint> splinePoints = new List<SplinePoint>();

    private List<float> speedPoints = new List<float>();
    private List<float> rpmPoints = new List<float>();
    private List<float> throttlePoints = new List<float>();
    private List<int> gearPoints = new List<int>();
    private List<int> lapNumberPoints = new List<int>();

    private float currentSpeed;
    private float currentRPM;
    private float currentThrottle;
    private int currentGear;

    private float currentLapDistance;
    private float lastLapDistance;

    private int currentLapNumber;
    private int lastLapNumber;

    void Start() {
        FindFirstObjectByType<TelemetryReceiver>().Register(this);
    }

    public void ApplyTelemetry(Dictionary<string, object> samples) {
        //currentTimestamp = timestamp;

        if (samples.ContainsKey("nmot"))
            currentRPM = Convert.ToSingle(samples["nmot"]);
        if (samples.ContainsKey("aps"))
            currentThrottle = Convert.ToSingle(samples["aps"]);
        if (samples.ContainsKey("gear"))
            currentGear = Convert.ToInt16(samples["gear"]);

        //if (samples.ContainsKey("lap"))
        //    currentLapNumber = Convert.ToInt16(samples["lap"]);

        if (samples.ContainsKey("VBOX_Lat_Min") && samples.ContainsKey("VBOX_Long_Minutes")) {
            double lat = Convert.ToDouble(samples["VBOX_Lat_Min"]);
            double lon = Convert.ToDouble(samples["VBOX_Long_Minutes"]);
            newPosition = GPSUtils.GeoToUnity((float)lat, (float)lon);

            transform.position = newPosition;
        }

        if (samples.ContainsKey("Laptrigger_lapdist_dls")) {
            currentLapDistance = (float)Convert.ToDouble(samples["Laptrigger_lapdist_dls"]);

            if (currentLapDistance < lastLapDistance) {
                currentLapNumber++;
            }

            lastLapDistance = currentLapDistance;
        }

        if (samples.ContainsKey("speed")) {
            var currentSpeedKmh = Convert.ToSingle(samples["speed"]);
            // convert speed to m/s
            currentSpeed = currentSpeedKmh * 0.277778f;
        }

        // start new lap
        if (UseSingleLapObjects && (currentLapNumber > lastLapNumber)) {

            lastLapNumber = currentLapNumber;

            CreateSplineObject();
        }


        // update meta data
        if (!oldPosition.Equals(newPosition)) {
            oldPosition = transform.position;

            points.Add(transform.position);

            // add spline point
            var point = new SplinePoint();
            point.position = transform.position;
            point.normal = Vector3.up;
            point.size = 1f;
            point.color = Color.white;
            splinePoints.Add(point);

            speedPoints.Add(currentSpeed);
            rpmPoints.Add(currentRPM);
            gearPoints.Add(currentGear);
            throttlePoints.Add(currentThrottle);
            lapNumberPoints.Add(currentLapNumber);

            TrackRenderer.positionCount = points.Count;
            TrackRenderer.SetPositions(points.ToArray());
        }

        //lastLapDistance = currentLapDistance;
        //lastTimestamp = timestamp;
    }

    public void OnTelemetryStreamEnded(string timestamp) {
        CreateSplineObject();
    }

    private void CreateSplineObject() {
        var lapSpline = new GameObject();
        lapSpline.transform.SetParent(null);

        if (UseSingleLapObjects) {
            lapSpline.name = $"{VehicleId} - Lap {currentLapNumber + 1}";
        } else {
            lapSpline.name = $"{VehicleId} - Full Race";
        }

        SplineComputer spline = lapSpline.AddComponent<SplineComputer>();
        spline.type = Spline.Type.BSpline;
        spline.multithreaded = true;
        spline.sampleMode = SplineComputer.SampleMode.Uniform;
        spline.SetPoints(splinePoints.ToArray());
        spline.Close();

        // add metadata
        TelemetryMetaData metaData = lapSpline.AddComponent<TelemetryMetaData>();
        metaData.SpeedArray = speedPoints.ToArray();
        metaData.RpmArray = rpmPoints.ToArray();
        metaData.GearArray = gearPoints.ToArray();
        metaData.ThrottleArray = throttlePoints.ToArray();
        metaData.LapNumberArray = lapNumberPoints.ToArray();

        // reset points to get next lap
        splinePoints.Clear();
        speedPoints.Clear();
        rpmPoints.Clear();
        gearPoints.Clear();
        throttlePoints.Clear();
        lapNumberPoints.Clear();

        //points.Clear();
    }

    //float EstimateSpeedFromLapDistance() {
    //    float deltaTime = GetDeltaTimeFromTimestamp();
    //    if (deltaTime <= 0f) return 0f;

    //    float deltaDist = currentLapDistance - lastLapDistance;
    //    return deltaDist / deltaTime; // speed in m/s
    //}

    //float EstimateSpeedFromGPS() {
    //    float deltaTime = GetDeltaTimeFromTimestamp();
    //    if (deltaTime <= 0f) return 0f;

    //    float distance = Vector3.Distance(oldPosition, newPosition);
    //    return distance / deltaTime; // speed in m/s
    //}

    //private float GetDeltaTimeFromTimestamp() {
    //    DateTime t1 = DateTime.Parse(lastTimestamp);
    //    DateTime t2 = DateTime.Parse(currentTimestamp);

    //    return (float)(t2 - t1).TotalSeconds;
    //}
}
