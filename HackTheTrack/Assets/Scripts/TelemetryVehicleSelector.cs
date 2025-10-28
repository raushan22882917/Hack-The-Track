using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;

public class TelemetryVehicleSelector : MonoBehaviour {

    public CinemachineCamera CinemachineCam;

    private List<TelemetryVehiclePlayer> vehicles = new List<TelemetryVehiclePlayer>();
    private int currentIndex = 0;

    private void Update() {
        if (Keyboard.current.rKey.wasPressedThisFrame && vehicles.Count > 0) {
            currentIndex = (currentIndex + 1) % vehicles.Count;
            CinemachineCam.Target.TrackingTarget = vehicles[currentIndex].CarGeometry.transform;
        }

        if (currentIndex >= 0) {
            vehicles[currentIndex].UpdateUIValues();
        }
    }

    public void RegisterVehicle(TelemetryVehiclePlayer vehicle) {
        if (!vehicles.Contains(vehicle)) {
            vehicles.Add(vehicle);

            // First registered vehicle becomes active
            if (vehicles.Count == 1) {
                currentIndex = 0;
            }
        }
    }
}
