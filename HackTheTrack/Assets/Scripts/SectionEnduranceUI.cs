using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using XCharts.Runtime;

public class SectionEnduranceUI : MonoBehaviour {
    [SerializeField] private TelemetryUI telemetryUI;
    [SerializeField] private SectionEnduranceReceiver sectionEnduranceReceiver;
    [SerializeField] private GameObject sectionEndurancePanel;

    [SerializeField] private Transform lapEventParent;
    [SerializeField] private GameObject lapEventPrefab;

    [SerializeField] private Button ShowVehicleLapTimes;
    [SerializeField] private Button ShowCurrentLapTimes;
    [SerializeField] private Button ShowAllLapTimesForCurrentVehicle;
    [SerializeField] private Button ShowCurrentLapTimesForAllVehicles;
    [SerializeField] private Button ShowAllLapTimesForAllVehicles;

    [SerializeField] private LineChart vehicleLineChart;
    [SerializeField] private LineChart currentLapAllVehiclesLineChart;
    [SerializeField] private LineChart allLapAllVehiclesLineChart;

    [SerializeField] private List<GameObject> tabPages = new();

    private string oldVehicleId;
    private bool isStatsVisible;

    private void Start() {
        sectionEndurancePanel.SetActive(false);
        EnableTabPage(tabPages.Count - 1);

        ShowVehicleLapTimes.onClick.AddListener(() => {
            EnableTabPage(0);
            ShowLapDataForVehicle();
        });
        ShowCurrentLapTimes.onClick.AddListener(() => {
            EnableTabPage(0);
            var currentLapNumber = int.Parse(telemetryUI.CurrentLap.text);
            var currentLapNumberData = sectionEnduranceReceiver.GetLapEventsForCurrentLap(currentLapNumber);
            ShowLapData(currentLapNumberData, true);
        });
        ShowAllLapTimesForCurrentVehicle.onClick.AddListener(() => {
            EnableTabPage(1);

            oldVehicleId = sectionEnduranceReceiver.VehicleSelector.GetCurrentlySelectedVehicleId();
            var carNumber = sectionEnduranceReceiver.VehicleSelector.ExtractCarNumber(oldVehicleId);
            ShowLapDataGraph(sectionEnduranceReceiver.CarLapData[carNumber], vehicleLineChart);
        });
        ShowCurrentLapTimesForAllVehicles.onClick.AddListener(() => {
            EnableTabPage(2);
            var currentLapNumber = int.Parse(telemetryUI.CurrentLap.text);
            var currentLapNumberData = sectionEnduranceReceiver.GetLapEventsForCurrentLap(currentLapNumber);
            ShowLapDataGraph(currentLapNumberData, currentLapAllVehiclesLineChart, true);
        });
        ShowAllLapTimesForAllVehicles.onClick.AddListener(() => {
            EnableTabPage(3);
            ShowAllLapDataForAllVehicles();
        });
    }

    private void Update() {
        // show/hide stats
        if (Keyboard.current.tabKey.wasPressedThisFrame) {
            isStatsVisible = !isStatsVisible;
            ToggleVisibility(isStatsVisible);

            //ShowLapDataForVehicle();
        }

        if (isStatsVisible && oldVehicleId != sectionEnduranceReceiver.VehicleSelector.GetCurrentlySelectedVehicleId()) {
            // refresh data in UI
            oldVehicleId = sectionEnduranceReceiver.VehicleSelector.GetCurrentlySelectedVehicleId();
            var carNumber = sectionEnduranceReceiver.VehicleSelector.ExtractCarNumber(oldVehicleId);
            ShowLapData(sectionEnduranceReceiver.CarLapData[carNumber]);
        }
    }

    private void EnableTabPage(int index) {
        for (int i = 0; i < tabPages.Count; i++) {
            tabPages[i].SetActive(i == index);
        }
    }

    public void ToggleVisibility(bool visible) {
        sectionEndurancePanel.SetActive(visible);
    }

    private void ShowAllLapDataForAllVehicles() {
        allLapAllVehiclesLineChart.ClearData();
        allLapAllVehiclesLineChart.ClearSerieData();

        var isXAxisDataAdded = false;

        foreach (var carLapData in sectionEnduranceReceiver.CarLapData) {
            if (sectionEnduranceReceiver.CarColor.ContainsKey(carLapData.Key)) {
                var lineSerie = allLapAllVehiclesLineChart.AddSerie<Line>(carLapData.Key);
                lineSerie.serieName = carLapData.Key;
                lineSerie.showDataName = true;
                lineSerie.lineStyle.color = sectionEnduranceReceiver.CarColor[carLapData.Key];
                lineSerie.itemStyle.color = sectionEnduranceReceiver.CarColor[carLapData.Key];

                foreach (var lapEvent in carLapData.Value) {
                    if (!isXAxisDataAdded) {
                        allLapAllVehiclesLineChart.AddXAxisData(lapEvent.lap.ToString());
                    }
                    var seconds = ParseLapTimeToSeconds(lapEvent.lap_time);
                    lineSerie.AddXYData(lapEvent.lap, seconds);
                }

                isXAxisDataAdded = true;
            }
        }
    }

    private void ShowLapDataForVehicle() {
        oldVehicleId = sectionEnduranceReceiver.VehicleSelector.GetCurrentlySelectedVehicleId();

        var carNumber = sectionEnduranceReceiver.VehicleSelector.ExtractCarNumber(oldVehicleId);
        ShowLapData(sectionEnduranceReceiver.CarLapData[carNumber]);
    }

    private void ShowLapData(List<LapEvent> lapEvents, bool showVehicleId = false) {

        // remove existing children
        for (int i = 0; i < lapEventParent.childCount; i++) {
            Destroy(lapEventParent.GetChild(i).gameObject);
        }

        foreach (var lapEvent in lapEvents) {
            var lapEventData = Instantiate(lapEventPrefab, lapEventParent);
            var lapEventDataImage = lapEventData.GetComponent<Image>();

            if (sectionEnduranceReceiver.CarColor.ContainsKey(lapEvent.vehicle_id)) {
                lapEventDataImage.color = sectionEnduranceReceiver.CarColor[lapEvent.vehicle_id];
            }

            var lapEventDataUi = lapEventData.GetComponent<LapEventDataUI>();

            if (!showVehicleId) {
                lapEventDataUi.LapText.text = $"Lap: {lapEvent.lap}";
            } else {
                lapEventDataUi.LapText.text = $"Vehicle: {lapEvent.vehicle_id}";
            }

            lapEventDataUi.LapTimeText.text = $"Lap Time: {lapEvent.lap_time}";
            lapEventDataUi.S1Text.text = $"S1: {lapEvent.sector_times[0]}";
            lapEventDataUi.S2Text.text = $"S2: {lapEvent.sector_times[1]}";
            lapEventDataUi.S3Text.text = $"S3: {lapEvent.sector_times[2]}";
            lapEventDataUi.TopSpeedText.text = $"Top Speed: {lapEvent.top_speed}";
        }
    }

    private void ShowLapDataGraph(List<LapEvent> lapEvents, LineChart lineChart, bool showVehicleId = false) {

        lineChart.ClearData();

        var carNumber = sectionEnduranceReceiver.VehicleSelector.ExtractCarNumber(oldVehicleId);
        if (!showVehicleId && sectionEnduranceReceiver.CarColor.ContainsKey(carNumber)) {
            lineChart.series[0].lineStyle.color = sectionEnduranceReceiver.CarColor[carNumber];
        } else {
            lineChart.series[0].lineStyle.color = Color.white;
        }

        foreach (var lapEvent in lapEvents) {

            if (!showVehicleId) {
                lineChart.AddXAxisData(lapEvent.lap.ToString());
            } else {
                lineChart.AddXAxisData(lapEvent.vehicle_id);
            }

            var seconds = ParseLapTimeToSeconds(lapEvent.lap_time);
            lineChart.series[0].AddXYData(lapEvent.lap, seconds);

            if (showVehicleId && sectionEnduranceReceiver.CarColor.ContainsKey(lapEvent.vehicle_id)) {
                var serieData = lineChart.series[0].data[^1];
                var serieDataItemStyle = serieData.EnsureComponent<ItemStyle>();
                serieDataItemStyle.color = sectionEnduranceReceiver.CarColor[lapEvent.vehicle_id];
            }
        }
    }

    private double ParseLapTimeToSeconds(string lapTime) {
        if (string.IsNullOrWhiteSpace(lapTime))
            return 0f;

        // Example: "1:47.909" -> split into ["1", "47.909"]
        var parts = lapTime.Trim().Split(':');
        if (parts.Length == 2) {
            if (float.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out float minutes) &&
                float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float seconds)) {
                return minutes * 60f + seconds;
            }
        } else if (parts.Length == 3) {
            // Handle "0:01:47.909" just in case
            if (float.TryParse(parts[0], out float hours) &&
                float.TryParse(parts[1], out float minutes) &&
                float.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out float seconds)) {
                return hours * 3600f + minutes * 60f + seconds;
            }
        }

        // Fallback: try to parse as raw seconds
        if (float.TryParse(lapTime, NumberStyles.Float, CultureInfo.InvariantCulture, out float result))
            return result;

        Debug.LogWarning($"Unrecognized lap time format: {lapTime}");
        return 0f;
    }
}
