using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
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
    public string ServerUrl = "ws://localhost:8766";
    public Dictionary<string, List<LapEvent>> CarLapData = new();
    public Dictionary<string, Color> CarColor = new();

    private WebSocket ws;

    private void Start() {
        ws = new WebSocket(ServerUrl);
        ws.OnOpen += (s, e) => Debug.Log($"Connected to websocket! {ServerUrl}");
        ws.OnMessage += (s, e) => HandleMessage(e.Data);
        ws.ConnectAsync();
    }

    private void OnDestroy() {
        ws.CloseAsync();
    }

    //public void ShowLapDataForVehicle() {
    //    oldVehicleId = VehicleSelector.GetCurrentlySelectedVehicleId();

    //    var carNumber = VehicleSelector.ExtractCarNumber(oldVehicleId);
    //    SectionEndurance.ShowLapData(carLapData[carNumber]);
    //}

    private void HandleMessage(string json) {
        LapEvent lapEvent = JsonUtility.FromJson<LapEvent>(json);
        if (lapEvent == null || lapEvent.type != "lap_event") return;

        if (!CarLapData.TryGetValue(lapEvent.vehicle_id, out var lapData)) {
            lapData = new List<LapEvent>();
            CarLapData[lapEvent.vehicle_id] = lapData;
        }

        lapData.Add(lapEvent);

        //Debug.Log($"Car #{lapEvent.vehicle_id} finished lap {lapEvent.lap} ({lapEvent.lap_time})");
    }

    public void RegisterVehicle(TelemetryVehiclePlayer vehicle) {
        // Extract the numeric car number from GR86-004-78 -> "78"
        string carNumber = VehicleSelector.ExtractCarNumber(vehicle.VehicleId);

        if (!CarLapData.ContainsKey(carNumber)) {
            CarLapData[carNumber] = new List<LapEvent>();
            Debug.Log($"SECTION ENDURANCE: Registered vehicle {vehicle.VehicleId} mapped to car #{carNumber}");
        }
        if (!CarColor.ContainsKey(carNumber)) {
            CarColor[carNumber] = vehicle.TrackRenderer.material.color;
        }
    }

    public List<LapEvent> GetLapEventsForCurrentLap(int lapNumber) {
        var lapEventsForCurrentLap = new List<LapEvent>();

        foreach (var lapData in CarLapData) {
            var lapEvent = lapData.Value.FirstOrDefault(v => v.lap == lapNumber);
            if (lapEvent != null) {
                lapEventsForCurrentLap.Add(lapEvent);
            }
        }

        return lapEventsForCurrentLap;
    }
}
