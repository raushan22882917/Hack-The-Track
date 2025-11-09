using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using UnityEngine;
using WebSocketSharp;

[Serializable]
public class TelemetryPacket {
    public string type;
    public string timestamp;
    public Dictionary<string, Dictionary<string, object>> vehicles;
    public Dictionary<string, object> weather;
}

public class TelemetryReceiver : MonoBehaviour {
    public string ServerUrl = "ws://localhost:8765";
    public WeatherManager WeatherManager;
    public TelemetryVehicleSelector VehicleSelector;

    private WebSocket ws;
    private ConcurrentQueue<string> queue = new ConcurrentQueue<string>();
    private Dictionary<string, TelemetryVehiclePlayer> vehicles = new Dictionary<string, TelemetryVehiclePlayer>();

    private void Start() {
        GPSUtils.SetReference(33.530494689941406, -86.62052154541016);

        ws = new WebSocket(ServerUrl);
        ws.OnOpen += (s, e) => Debug.Log($"Connected to websocket! {ServerUrl}");
        ws.OnMessage += (s, e) => queue.Enqueue(e.Data);
        ws.OnError += (s, e) => Debug.LogError($"WebSocket error: {e.Message}");
        ws.OnClose += (s, e) => Debug.Log($"WebSocket closed: {e.Reason}");
        ws.ConnectAsync();
    }

    private void Update() {
        while (queue.TryDequeue(out string json)) {
            var frame = JsonConvert.DeserializeObject<TelemetryPacket>(json);

            if (frame.type == "telemetry_frame") {

                // Apply weather
                if (WeatherManager != null && frame.weather != null) {
                    WeatherManager.ApplyWeather(frame.weather, frame.timestamp);
                }

                foreach (var kv in frame.vehicles) {
                    string vehicleId = kv.Key;
                    Dictionary<string, object> samples = kv.Value;

                    if (!vehicles.ContainsKey(vehicleId)) continue;

                    vehicles[vehicleId].ApplyTelemetry(samples, frame.timestamp);
                }
            } else if (frame.type == "telemetry_end") {
                Debug.Log($"Telemetry stream ended at {frame.timestamp}");

                // Optional: trigger UI or state change
                foreach (var vehicle in vehicles) {
                    vehicle.Value.OnTelemetryStreamEnded(frame.timestamp);
                }
            }
        }
    }

    private void OnDestroy() {
        ws?.CloseAsync();
    }

    public void Register(TelemetryVehiclePlayer v) {
        vehicles[v.VehicleId] = v;
        Debug.Log($"TELEMETRY: Vehicle with ID {v.VehicleId} registered.");
    }

    // -------- Control --------
    public void Play() {
        foreach (var vehicle in vehicles) {
            vehicle.Value.OnTelemetryStreamPaused(false);
        }
        SendControl("play");
    }

    public void Pause() {
        foreach (var vehicle in vehicles) {
            vehicle.Value.OnTelemetryStreamPaused(true);
        }
        SendControl("pause");
    }

    public void SetSpeed(float s) {
        var obj = new JObject {
            ["type"] = "control",
            ["cmd"] = "speed",
            ["value"] = s
        };
        Send(obj.ToString(Formatting.None));
    }

    // ----- Skip commands with vehicle_id -----
    public void Reverse() {
        SendControl("reverse");
    }

    public void Restart() {
        SendControl("restart");
    }

    // -------- Helpers --------
    private void SendControl(string cmd) {
        var obj = new JObject {
            ["type"] = "control",
            ["cmd"] = cmd
        };
        Send(obj.ToString(Formatting.None));
    }

    private void Send(string j) {
        if (ws != null && ws.ReadyState == WebSocketState.Open) {
            ws.Send(j);
        } else {
            Debug.LogWarning("WebSocket not open; cannot send control message.");
        }
    }
}