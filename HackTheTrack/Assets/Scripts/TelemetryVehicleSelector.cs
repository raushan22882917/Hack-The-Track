using System.Collections.Generic;
using System.Text.RegularExpressions;
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
            CinemachineCams[i].Target.TrackingTarget = vehicles[currentVehicleIndex].GetCameraTarget();
        }
        TelemetryDisplay.CurrentActiveCameraValue.text = CinemachineCamsLabels[currentCameraIndex];
    }

    private void Update() {
        if (Keyboard.current.rKey.wasPressedThisFrame && vehicles.Count > 0) {
            currentVehicleIndex = (currentVehicleIndex + 1) % vehicles.Count;

            foreach (var cinemachineCam in CinemachineCams) {
                cinemachineCam.Target.TrackingTarget = vehicles[currentVehicleIndex].GetCameraTarget();
            }
        }

        if (Keyboard.current.cKey.wasPressedThisFrame && vehicles.Count > 0) {
            SelectNextCamera();
        }

        if (Keyboard.current.vKey.wasPressedThisFrame && vehicles.Count > 0) {
            SelectPreviousCamera();
        }

        if (currentVehicleIndex >= 0) {
            vehicles[currentVehicleIndex].UpdateUIValues();
        }
    }

    private void SelectNextCamera() {
        SelectNextOrPreviousCamera(true);
    }

    private void SelectPreviousCamera() {
        SelectNextOrPreviousCamera(false);
    }

    private void SelectNextOrPreviousCamera(bool goToNextCamera) {
        currentCameraIndex += goToNextCamera ? 1 : -1;

        if (currentCameraIndex < 0) {
            currentCameraIndex = CinemachineCams.Length - 1;
        } else {
            currentCameraIndex %= CinemachineCams.Length;
        }

        TelemetryDisplay.CurrentActiveCameraValue.text = CinemachineCamsLabels[currentCameraIndex];

        for (int i = 0; i < CinemachineCams.Length; i++) {
            CinemachineCams[i].gameObject.SetActive(i == currentCameraIndex);
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

    public string ExtractCarNumber(string vehicleId) {
        // Match last numeric segment, e.g. GR86-004-78 -> 78
        var match = Regex.Match(vehicleId, @"(\d+)$");
        return match.Success ? match.Value : vehicleId;
    }
}
