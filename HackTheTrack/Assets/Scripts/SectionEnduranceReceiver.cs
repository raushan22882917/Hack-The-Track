using System;
using System.Collections.Generic;
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

[Serializable]
public class CarRaceState {
    public string LastLapTime;
    public float[] LastSectorTimes;
    public float LastTopSpeed;
    public string LastFlag;
    public bool InPit;
}

public class SectionEnduranceReceiver : MonoBehaviour {

    public TelemetryVehicleSelector VehicleSelector;
    public SectionEnduranceUI SectionEndurance;
    public string ServerUrl = "ws://localhost:8766";

    private WebSocket ws;
    private Dictionary<string, CarRaceState> carStates = new();

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
            oldVehicleId = VehicleSelector.GetCurrentlySelectedVehicleId();
            isStatsVisible = !isStatsVisible;
            SectionEndurance.ToggleVisibility(isStatsVisible);
        }

        if (isStatsVisible && oldVehicleId != VehicleSelector.GetCurrentlySelectedVehicleId()) {
            // refresh data in UI
        }
    }

    private void OnDestroy() {
        ws.CloseAsync();
    }

    private void HandleMessage(string json) {
        LapEvent lapEvent = JsonUtility.FromJson<LapEvent>(json);
        if (lapEvent == null || lapEvent.type != "lap_event") return;

        if (!carStates.TryGetValue(lapEvent.vehicle_id, out var state)) {
            state = new CarRaceState();
            carStates[lapEvent.vehicle_id] = state;
        }

        state.LastLapTime = lapEvent.lap_time;
        state.LastSectorTimes = lapEvent.sector_times;
        state.LastTopSpeed = lapEvent.top_speed;
        state.LastFlag = lapEvent.flag;
        state.InPit = lapEvent.pit;

        //Debug.Log($"Car #{lapEvent.vehicle_id} finished lap {lapEvent.lap} ({lapEvent.lap_time})");
    }

    public void RegisterVehicle(TelemetryVehiclePlayer vehicle) {
        // Extract the numeric car number from GR86-004-78 -> "78"
        string carNumber = ExtractCarNumber(vehicle.VehicleId);

        if (!carStates.ContainsKey(carNumber)) {
            carStates[carNumber] = new CarRaceState();
            Debug.Log($"SECTION ENDURANCE: Registered vehicle {vehicle.VehicleId} mapped to car #{carNumber}");
        }
    }

    private string ExtractCarNumber(string vehicleId) {
        // Match last numeric segment, e.g. GR86-004-78 -> 78
        var match = Regex.Match(vehicleId, @"(\d+)$");
        return match.Success ? match.Value : vehicleId;
    }
}
