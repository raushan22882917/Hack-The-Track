using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using WebSocketSharp;

[Serializable]
public class LeaderboardEntry {
    public string type;
    public string class_type;
    public int position;
    public int pic;
    public string vehicle_id;
    public string vehicle;
    public int laps;
    public string elapsed;
    public string gap_first;
    public string gap_previous;
    public int best_lap_num;
    public string best_lap_time;
    public float best_lap_kph;
}

public class LeaderboardReceiver : MonoBehaviour {
    [Header("WebSocket Settings")]
    public string ServerUrl = "ws://localhost:8767";

    [Header("UI References")]
    public Transform LeaderboardContainer;
    public GameObject LeaderboardRowPrefab;

    public Dictionary<string, LeaderboardEntry> LeaderboardDict = new();

    private WebSocket ws;

    private void Start() {
        ConnectToServer();
    }

    private void ConnectToServer() {
        ws = new WebSocket(ServerUrl);

        ws.OnOpen += (s, e) => Debug.Log($"Connected to leaderboard server at {ServerUrl}");
        ws.OnMessage += (s, e) => {
            try {
                var entry = JsonUtility.FromJson<LeaderboardEntry>(e.Data);
                if (entry.type == "leaderboard_entry") {
                    LeaderboardDict[entry.vehicle_id] = entry;
                }
            } catch (Exception ex) {
                Debug.LogError($"JSON parse error: {ex.Message}");
            }
        };

        ws.ConnectAsync();
    }

    private void OnDestroy() {
        ws?.CloseAsync();
    }
}
