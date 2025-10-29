using Newtonsoft.Json;
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

    private WebSocket ws;
    private ConcurrentQueue<string> queue = new ConcurrentQueue<string>();
    private Dictionary<string, TelemetryVehiclePlayer> vehicles = new Dictionary<string, TelemetryVehiclePlayer>();

    void Start() {
        ws = new WebSocket(ServerUrl);
        ws.OnOpen += (s, e) => Debug.Log("Connected to websocket!");
        ws.OnMessage += (s, e) => queue.Enqueue(e.Data);
        ws.ConnectAsync();
    }

    void Update() {
        while (queue.TryDequeue(out string json)) {
            var frame = JsonConvert.DeserializeObject<TelemetryPacket>(json);

            if (frame.type == "telemetry_frame") {

                // Apply weather
                if (WeatherManager != null && frame.weather != null) {
                    WeatherManager.ApplyWeather(frame.weather);
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

    public void Register(TelemetryVehiclePlayer v) {
        vehicles[v.VehicleId] = v;
        Debug.Log($"Vehicle with ID {v.VehicleId} registered.");
    }

    public void Register(TelemetryVehicleController v) {
        //vehicles[v.VehicleId] = v;
        //Debug.Log($"Vehicle with ID {v.VehicleId} registered.");
    }

    // Control
    public void Play() {
        foreach (var vehicle in vehicles) {
            vehicle.Value.OnTelemetryStreamPaused(false);
        }
        Send("{\"type\":\"control\",\"cmd\":\"play\"}");
    }

    public void Pause() {
        foreach (var vehicle in vehicles) {
            vehicle.Value.OnTelemetryStreamPaused(true);
        }
        Send("{\"type\":\"control\",\"cmd\":\"pause\"}");
    }

    public void SetSpeed(float s) => Send($"{{\"type\":\"control\",\"cmd\":\"speed\",\"value\":{s}}}");

    void Send(string j) {
        if (ws.ReadyState == WebSocketState.Open) ws.Send(j);
    }
}
