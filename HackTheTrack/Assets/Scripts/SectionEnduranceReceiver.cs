using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.InputSystem;
using WebSocketSharp;

[Serializable]
public class LapEvent {
    public string type;
    public string vehicle_id;   // e.g. "78"
    public int lap;
    public string lap_time;
    public float[] sector_times;
    public float top_speed;
    public string flag;
    public bool pit;
    public string timestamp;
}

public class SectionEnduranceReceiver : MonoBehaviour {

    public TelemetryVehicleSelector VehicleSelector;
    public SectionEnduranceUI SectionEndurance;
    public string ServerUrl = "ws://localhost:8766";

    private WebSocket ws;
    private Dictionary<string, List<LapEvent>> carLapData = new();

    private string oldVehicleId;
    private bool isStatsVisible;

    private void Start() {
        ws = new WebSocket(ServerUrl);
        ws.OnOpen += (s, e) => Debug.Log($"Connected to websocket! {ServerUrl}");
        ws.OnMessage += (s, e) => HandleMessage(e.Data);
        ws.ConnectAsync();
    }

    private void Update() {
        // show/hide stats
        if (Keyboard.current.tabKey.wasPressedThisFrame) {
            isStatsVisible = !isStatsVisible;
            SectionEndurance.ToggleVisibility(isStatsVisible);

            ShowLapDataForVehicle();
        }

        if (isStatsVisible && oldVehicleId != VehicleSelector.GetCurrentlySelectedVehicleId()) {
            // refresh data in UI
            oldVehicleId = VehicleSelector.GetCurrentlySelectedVehicleId();
            var carNumber = ExtractCarNumber(oldVehicleId);
            SectionEndurance.ShowLapData(carLapData[carNumber]);
        }
    }

    private void OnDestroy() {
        ws.CloseAsync();
    }

    public void ShowLapDataForVehicle() {
        oldVehicleId = VehicleSelector.GetCurrentlySelectedVehicleId();

        var carNumber = ExtractCarNumber(oldVehicleId);
        SectionEndurance.ShowLapData(carLapData[carNumber]);
    }

    private void HandleMessage(string json) {
        LapEvent lapEvent = JsonUtility.FromJson<LapEvent>(json);
        if (lapEvent == null || lapEvent.type != "lap_event") return;

        if (!carLapData.TryGetValue(lapEvent.vehicle_id, out var lapData)) {
            lapData = new List<LapEvent>();
            carLapData[lapEvent.vehicle_id] = lapData;
        }

        lapData.Add(lapEvent);

        //Debug.Log($"Car #{lapEvent.vehicle_id} finished lap {lapEvent.lap} ({lapEvent.lap_time})");
    }

    public void RegisterVehicle(TelemetryVehiclePlayer vehicle) {
        // Extract the numeric car number from GR86-004-78 -> "78"
        string carNumber = ExtractCarNumber(vehicle.VehicleId);

        if (!carLapData.ContainsKey(carNumber)) {
            carLapData[carNumber] = new List<LapEvent>();
            Debug.Log($"SECTION ENDURANCE: Registered vehicle {vehicle.VehicleId} mapped to car #{carNumber}");
        }
    }

    private string ExtractCarNumber(string vehicleId) {
        // Match last numeric segment, e.g. GR86-004-78 -> 78
        var match = Regex.Match(vehicleId, @"(\d+)$");
        return match.Success ? match.Value : vehicleId;
    }

    public List<LapEvent> GetLapEventsForCurrentLap(int lapNumber) {
        var lapEventsForCurrentLap = new List<LapEvent>();

        foreach (var lapData in carLapData) {
            var lapEvent = lapData.Value.FirstOrDefault(v => v.lap == lapNumber);
            if (lapEvent != null) {
                lapEventsForCurrentLap.Add(lapEvent);
            }
        }

        return lapEventsForCurrentLap;
    }
}
