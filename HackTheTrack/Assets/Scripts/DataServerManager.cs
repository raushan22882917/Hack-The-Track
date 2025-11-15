using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using TMPro;
#if UNITY_EDITOR
using UnityEditor;
#endif
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.InputSystem;

public class DataServerManager : MonoBehaviour {
    public static DataServerManager Instance;

    // Event fired after all servers are started
    public UnityEvent OnServersStarted;

    public TextMeshProUGUI ServerStartedText;

    private Process leaderboardProcess;
    private Process enduranceProcess;
    private Process telemetryProcess;

    //private int serversReady = 0;

    private void Awake() {
        // Singleton pattern
        if (Instance != null && Instance != this) {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject); // Persist across scene loads

#if UNITY_EDITOR
        // Register callback for exiting play mode
        EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
#endif
    }

    private async void Start() {
        ServerStartedText.text = "Starting Servers...";
        await StartServersAsync();
    }

    private void Update() {
        if (Keyboard.current.escapeKey.wasPressedThisFrame) {
            Application.Quit();
        }
    }

    public async Task StartServersAsync() {
        string buildFolder;

        if (Application.isEditor) {
            buildFolder = @"C:\Users\marku\Unity\hack-the-track\HackTheTrack\Build\";
        } else {
            buildFolder = Path.GetDirectoryName(Application.dataPath);
        }

        await WaitForServerReady(buildFolder, "leaderboard_server.exe");
        ServerStartedText.text += "\nLeaderboard Server started...";
        await WaitForServerReady(buildFolder, "section_endurance_server.exe");
        ServerStartedText.text += "\nEndurance Server started...";
        await WaitForServerReady(buildFolder, "telemetry_vehicle_server.exe");
        ServerStartedText.text += "\nTelemetry Server started...";

        UnityEngine.Debug.Log("All servers reported ready.");
        OnServersStarted?.Invoke();
    }

    private Task WaitForServerReady(string buildFolder, string exeName) {
        var tcs = new TaskCompletionSource<bool>();
        string exePath = Path.Combine(buildFolder, exeName);
        UnityEngine.Debug.Log("Trying to start: " + exePath);

        try {
            if (!File.Exists(exePath)) {
                UnityEngine.Debug.LogError($"Executable not found: {exePath}");
                tcs.SetResult(false);
                return tcs.Task;
            }

            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = exePath,
                UseShellExecute = false,
                WorkingDirectory = buildFolder,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                //CreateNoWindow = true
            };

            var p = new Process { StartInfo = psi, EnableRaisingEvents = true };
            p.OutputDataReceived += (sender, e) => {
                if (!string.IsNullOrEmpty(e.Data)) {
                    UnityEngine.Debug.Log($"[{Path.GetFileName(exePath)}] {e.Data}");

                    // Adjust this trigger phrase to match your server’s output
                    if (e.Data.Contains("server running")) {
                        tcs.TrySetResult(true);
                    }
                }
            };
            p.ErrorDataReceived += (sender, e) => {
                if (!string.IsNullOrEmpty(e.Data))
                    UnityEngine.Debug.LogError($"[Server ERROR] {e.Data}");
            };

            try {
                p.Start();
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
            } catch (Win32Exception wex) {
                UnityEngine.Debug.LogError($"Failed to start process {exePath}: {wex.Message} (ErrorCode {wex.NativeErrorCode})");
                tcs.TrySetResult(false);
            }

            // Store reference if needed
            if (exePath.Contains("leaderboard")) leaderboardProcess = p;
            else if (exePath.Contains("endurance")) enduranceProcess = p;
            else if (exePath.Contains("telemetry")) telemetryProcess = p;
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"Failed to start process {exePath}: {ex.Message}");
            tcs.TrySetResult(false);
        }

        return tcs.Task;
    }

    private void OnApplicationQuit() {
        // Clean up processes when Unity quits
        StopServers();
    }

#if UNITY_EDITOR
    private void OnPlayModeStateChanged(PlayModeStateChange state) {
        if (state == PlayModeStateChange.ExitingPlayMode || state == PlayModeStateChange.EnteredEditMode) {
            StopServers();
        }
    }
#endif

    private void StopServers() {
        TryKill(leaderboardProcess, "leaderboard_server");
        TryKill(enduranceProcess, "section_endurance_server");
        TryKill(telemetryProcess, "telemetry_vehicle_server");
    }

    private void TryKill(Process p, string processName) {
        try {
            if (p != null && !p.HasExited) {
                p.Kill(); // kill process tree if possible
                UnityEngine.Debug.Log($"Killed tracked process {processName}");
            } else {
                // Fallback: kill by name
                foreach (var proc in Process.GetProcessesByName(processName)) {
                    try {
                        proc.Kill();
                        UnityEngine.Debug.Log($"Killed orphaned process {processName}");
                    } catch (Exception ex) {
                        UnityEngine.Debug.LogWarning($"Failed to kill {processName}: {ex.Message}");
                    }
                }
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogWarning($"Error killing {processName}: {ex.Message}");
        }
    }
}
