using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;

public class TelemetryVehicleSelector : MonoBehaviour {

    public TelemetryUI TelemetryDisplay;

    public CinemachineCamera[] CinemachineCams;
    public string[] CinemachineCamsLabels;

    private List<TelemetryVehiclePlayer> vehicles = new List<TelemetryVehiclePlayer>();
    private int currentVehicleIndex = 0;
    private int currentCameraIndex = 0;

    private void Start() {
        for (int i = 0; i < CinemachineCams.Length; i++) {
            CinemachineCams[i].gameObject.SetActive(i == currentCameraIndex);
        }
        TelemetryDisplay.CurrentActiveCameraValue.text = CinemachineCamsLabels[currentCameraIndex];
    }

    private void Update() {
        if (Keyboard.current.rKey.wasPressedThisFrame && vehicles.Count > 0) {
            currentVehicleIndex = (currentVehicleIndex + 1) % vehicles.Count;

            foreach (var cinemachineCam in CinemachineCams) {
                cinemachineCam.Target.TrackingTarget = vehicles[currentVehicleIndex].CarGeometry.transform;
            }
        }

        if (Keyboard.current.cKey.wasPressedThisFrame && vehicles.Count > 0) {
            currentCameraIndex = (currentCameraIndex + 1) % CinemachineCams.Length;
            TelemetryDisplay.CurrentActiveCameraValue.text = CinemachineCamsLabels[currentCameraIndex];

            for (int i = 0; i < CinemachineCams.Length; i++) {
                CinemachineCams[i].gameObject.SetActive(i == currentCameraIndex);
            }
        }

        if (currentVehicleIndex >= 0) {
            vehicles[currentVehicleIndex].UpdateUIValues();
        }
    }

    public void RegisterVehicle(TelemetryVehiclePlayer vehicle) {
        if (!vehicles.Contains(vehicle)) {
            vehicles.Add(vehicle);

            // First registered vehicle becomes active
            if (vehicles.Count == 1) {
                currentVehicleIndex = 0;
            }
        }
    }

    public string GetCurrentlySelectedVehicleId() {
        return vehicles[currentVehicleIndex].VehicleId;
    }
}
