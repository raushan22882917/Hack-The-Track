using Dreamteck.Splines;
using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TelemetryVehiclePlayer : MonoBehaviour {
    public string VehicleId;
    public SplinePositioner Positioner;

    [Header("UI")]
    public TextMeshProUGUI CurrentSpeed;
    public TextMeshProUGUI CurrentGear;
    public TextMeshProUGUI CurrentLap;
    public TextMeshProUGUI CurrentLapDistance;
    public TextMeshProUGUI CurrentThrottle;
    public Slider CurrentThrottleSlider;
    public TextMeshProUGUI CurrentBrakeFront;
    public Slider CurrentBrakeFrontSlider;
    public TextMeshProUGUI CurrentBrakeRear;
    public Slider CurrentBrakeRearSlider;
    public TextMeshProUGUI CurrentSteering;
    public RectTransform SteeringWheelImage;
    public TextMeshProUGUI CurrentRPM;
    public Slider CurrentRPMSlider;

    // Sanity check tolerance (meters)
    public float DistanceTolerance = 5f;

    public LineRenderer TrackRenderer;
    public Transform SimulationCube;

    [Header("Physics Settings")]
    public float maxAcceleration = 5f;   // m/s² at full throttle
    public float maxBraking = 10f;       // m/s² at full brake
    public float maxSpeed = 100f;        // m/s (360 km/h)

    private List<Vector3> points = new List<Vector3>();
    private Vector3 newPosition = Vector3.zero;
    private Vector3 oldPosition = Vector3.zero;

    private float currentSpeed;          // m/s
    private float integratedDistance;    // meters along spline (our continuous integration)
    private float splineLength;
    private int currentLapNumber = 2;
    private float lastLapDistance;

    private float currentRPM;
    private float currentThrottle;
    private float currentBrakeFront;
    private float currentBrakeRear;
    private float currentSteeringAngle;

    private void Start() {
        var receiver = FindFirstObjectByType<TelemetryReceiver>();
        if (receiver != null) receiver.Register(this);

        splineLength = Positioner.CalculateLength();
        Debug.Log($"Spline Length: {splineLength}");
    }

    private void Update() {
        // --- Simulate acceleration and braking ---
        float throttleInput = Mathf.Clamp01(currentThrottle / 100f); // 0 to 1
        float brakeInput = Mathf.Clamp01((currentBrakeFront + currentBrakeRear) / 20f); // normalize ~0–1 (assuming 10 bar max per axle)

        float acceleration = throttleInput * maxAcceleration; // m/s²
        float braking = brakeInput * maxBraking;              // m/s²

        float netAccel = acceleration - braking;

        currentSpeed += netAccel * Time.deltaTime;
        currentSpeed = Mathf.Clamp(currentSpeed, 0f, maxSpeed);

        // Advance integrated distance
        integratedDistance += currentSpeed * Time.deltaTime;

        // Wrap around spline
        if (integratedDistance > splineLength) {
            integratedDistance -= splineLength;
            currentLapNumber++;
        }

        Positioner.SetDistance(integratedDistance);

        // Update estimated speed display
        CurrentSpeed.text = (currentSpeed * 3.6f).ToString("F2"); // km/h
    }

    private void OnDestroy() {
        points.Clear();
    }

    public void ApplyTelemetry(Dictionary<string, object> samples, string timestamp) {
        if (!samples.ContainsKey("Laptrigger_lapdist_dls")) return;
        if (!DateTime.TryParse(timestamp, out DateTime dt)) return;

        if (samples.ContainsKey("nmot")) {
            currentRPM = Convert.ToSingle(samples["nmot"]);

            CurrentRPM.text = currentRPM.ToString("F0");
            CurrentRPMSlider.value = currentRPM;
        }

        if (samples.ContainsKey("Steering_Angle")) {
            currentSteeringAngle = Convert.ToSingle(samples["Steering_Angle"]);

            CurrentSteering.text = currentSteeringAngle.ToString("F2");
            SteeringWheelImage.rotation = Quaternion.Euler(Vector3.forward * currentSteeringAngle);
        }

        if (samples.ContainsKey("aps")) {
            currentThrottle = Convert.ToSingle(samples["aps"]);

            CurrentThrottle.text = currentThrottle.ToString("F2");
            CurrentThrottleSlider.value = currentThrottle;
        }

        if (samples.ContainsKey("pbrake_f")) {
            currentBrakeFront = Convert.ToSingle(samples["pbrake_f"]);

            CurrentBrakeFront.text = currentBrakeFront.ToString("F2");
            CurrentBrakeFrontSlider.value = currentBrakeFront;
        }
        if (samples.ContainsKey("pbrake_r")) {
            currentBrakeRear = Convert.ToSingle(samples["pbrake_r"]);

            CurrentBrakeRear.text = currentBrakeRear.ToString("F2");
            CurrentBrakeRearSlider.value = currentBrakeRear;
        }

        if (samples.ContainsKey("gear"))
            CurrentGear.text = samples["gear"].ToString();

        // Speed is usually in km/h, convert to m/s if needed
        if (samples.ContainsKey("speed")) {
            float speedKph = Convert.ToSingle(samples["speed"]);
            currentSpeed = speedKph / 3.6f;

            //CurrentSpeed.text = speedKph.ToString("F2");
        }

        float lapDist = (float)Convert.ToDouble(samples["Laptrigger_lapdist_dls"]);
        CurrentLapDistance.text = lapDist.ToString("F2");

        // First sample: initialise
        if (integratedDistance <= 0f) {
            integratedDistance = lapDist;
            Positioner.SetDistance(integratedDistance);
            return;
        }

        // Detect lap wrap
        if (lastLapDistance > 3000 && lapDist < lastLapDistance) {
            integratedDistance -= splineLength;
            currentLapNumber++;
        }
        lastLapDistance = lapDist;
        CurrentLap.text = currentLapNumber.ToString();

        // Sanity check: if telemetry lap distance differs too much from our integrated distance, snap
        if (Mathf.Abs(lapDist - integratedDistance) > DistanceTolerance) {
            integratedDistance = lapDist;
            Positioner.SetDistance(integratedDistance);
        }

        // render real postion of race car to have a value to compare
        if (samples.ContainsKey("VBOX_Lat_Min") && samples.ContainsKey("VBOX_Long_Minutes")) {
            double lat = Convert.ToDouble(samples["VBOX_Lat_Min"]);
            double lon = Convert.ToDouble(samples["VBOX_Long_Minutes"]);
            newPosition = GPSUtils.GeoToUnity((float)lat, (float)lon);

            SimulationCube.position = newPosition;
        }

        // update meta data
        if (!oldPosition.Equals(newPosition)) {
            oldPosition = newPosition;

            points.Add(newPosition);

            TrackRenderer.positionCount = points.Count;
            TrackRenderer.SetPositions(points.ToArray());
        }
    }

    public void OnTelemetryStreamEnded(string timestamp) {
        Debug.Log($"{VehicleId} telemetry stream ended at {timestamp}");
    }
}
