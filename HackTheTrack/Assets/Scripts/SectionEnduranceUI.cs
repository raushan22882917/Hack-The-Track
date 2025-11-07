using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class SectionEnduranceUI : MonoBehaviour {
    [SerializeField] private TelemetryUI telemetryUI;
    [SerializeField] private SectionEnduranceReceiver sectionEnduranceReceiver;
    [SerializeField] private GameObject sectionEndurancePanel;
    [SerializeField] private LapTimeGraph laptimeGraph;

    [SerializeField] private Transform lapEventParent;
    [SerializeField] private GameObject lapEventPrefab;

    [SerializeField] private Button ShowVehicleLapTimes;
    [SerializeField] private Button ShowCurrentLapTimes;

    private List<float> lapTimes = new();

    private void Start() {
        sectionEndurancePanel.SetActive(false);

        ShowVehicleLapTimes.onClick.AddListener(() => {
            sectionEnduranceReceiver.ShowLapDataForVehicle();
        });
        ShowCurrentLapTimes.onClick.AddListener(() => {
            var currentLapNumber = int.Parse(telemetryUI.CurrentLap.text);
            var currentLapNumberData = sectionEnduranceReceiver.GetLapEventsForCurrentLap(currentLapNumber);
            ShowLapData(currentLapNumberData, true);
        });
    }

    public void ToggleVisibility(bool visible) {
        sectionEndurancePanel.SetActive(visible);
    }

    public void ShowLapData(List<LapEvent> lapEvents, bool showVehicleId = false) {

        // remove existing children
        for (int i = 0; i < lapEventParent.childCount; i++) {
            Destroy(lapEventParent.GetChild(i).gameObject);
        }
        lapTimes.Clear();

        foreach (var lapEvent in lapEvents) {
            var lapEventData = Instantiate(lapEventPrefab, lapEventParent);
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

            var seconds = laptimeGraph.ParseLapTimeToSeconds(lapEvent.lap_time);
            lapTimes.Add(seconds);
        }

        // setup graph
        laptimeGraph.SetLapTimes(lapTimes);
    }
}
