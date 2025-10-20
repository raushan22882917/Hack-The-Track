using Dreamteck.Splines;
using TMPro;
using UnityEngine;

public class SimulationVehicleController : MonoBehaviour {
    public TelemetryMetaData MetaData;
    public TextMeshProUGUI CurrentSpeed;
    public TextMeshProUGUI CurrentGear;
    public TextMeshProUGUI CurrentLap;

    private SplineFollower splineFollower;
    private int pointCount;
    private float splineLength;
    private float currentDistance = 0f;

    private void Awake() {
        splineFollower = GetComponent<SplineFollower>();
        splineFollower.follow = false;
        splineFollower.followSpeed = MetaData.SpeedArray[0];

        pointCount = splineFollower.spline.GetPoints().Length;
        splineLength = splineFollower.spline.CalculateLength();
    }

    void Update() {
        if (splineLength <= 0f) {
            splineLength = splineFollower.spline.CalculateLength();
            return;
        }

        // Convert current distance to percent
        double percent = currentDistance / splineLength;

        // Find segment indices
        int indexA = Mathf.FloorToInt((float)(percent * (pointCount - 1)));
        int indexB = Mathf.Min(indexA + 1, pointCount - 1);

        // Calculate local t between indexA and indexB
        double segmentStart = (double)indexA / (pointCount - 1);
        double segmentEnd = (double)indexB / (pointCount - 1);
        float t = Mathf.InverseLerp((float)segmentStart, (float)segmentEnd, (float)percent);

        // Interpolate speed
        float speedA = MetaData.SpeedArray[indexA];
        float speedB = MetaData.SpeedArray[indexB];
        float lerpedSpeed = Mathf.Lerp(speedA, speedB, t); // in m/s

        CurrentSpeed.text = (lerpedSpeed * 3.6f).ToString("F2");
        CurrentGear.text = t <= 0.5f ? MetaData.GearArray[indexA].ToString() : MetaData.GearArray[indexB].ToString();
        CurrentLap.text = t <= 0.5f ? MetaData.LapNumberArray[indexA].ToString() : MetaData.LapNumberArray[indexB].ToString();

        // Advance by meters
        currentDistance += lerpedSpeed * Time.deltaTime;
        currentDistance = Mathf.Min(currentDistance, splineLength); // clamp

        // Apply to follower
        splineFollower.SetPercent(currentDistance / splineLength);
    }

}
