using System.Collections.Generic;
using System.Text.RegularExpressions;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

public class TelemetryVehicleSelector : MonoBehaviour {

    public TelemetryUI TelemetryDisplay;

    public CinemachineCamera[] CinemachineCams;
    public string[] CinemachineCamsLabels;

    [Header("Player Controls")]
    [SerializeField] private bool isPlayerCarActive;
    [SerializeField] private GameObject playerCarObject;
    [SerializeField] private CinemachineCamera playerCarFollowCamera;
    [SerializeField] private CinemachineCamera playerCarCockpitCamera;
    [SerializeField] private GameObject playerSpeedText;

    private GameObject playerCarObjectRef;

    private List<TelemetryVehiclePlayer> vehicles = new List<TelemetryVehiclePlayer>();
    private int currentVehicleIndex = 0;
    private int currentCameraIndex = 0;

    private void Start() {
        for (int i = 0; i < CinemachineCams.Length; i++) {
            CinemachineCams[i].gameObject.SetActive(i == currentCameraIndex);
            CinemachineCams[i].Target.TrackingTarget = vehicles[currentVehicleIndex].GetCameraTarget();
        }
        TelemetryDisplay.CurrentActiveCameraValue.text = CinemachineCamsLabels[currentCameraIndex];

        playerCarFollowCamera.gameObject.SetActive(isPlayerCarActive);
        playerCarCockpitCamera.gameObject.SetActive(isPlayerCarActive);
        playerSpeedText.SetActive(isPlayerCarActive);
    }

    private void Update() {

        if (Keyboard.current.xKey.wasPressedThisFrame) {
            isPlayerCarActive = !isPlayerCarActive;
        }

        if (!isPlayerCarActive && playerCarObjectRef) {
            Destroy(playerCarObjectRef);

            for (int i = 0; i < CinemachineCams.Length; i++) {
                CinemachineCams[i].gameObject.SetActive(i == currentCameraIndex);
            }

            playerCarCockpitCamera.gameObject.SetActive(isPlayerCarActive);
            playerCarFollowCamera.gameObject.SetActive(isPlayerCarActive);
            playerSpeedText.SetActive(isPlayerCarActive);
        }

        if (isPlayerCarActive &&
            (Keyboard.current.cKey.wasPressedThisFrame || Keyboard.current.vKey.wasPressedThisFrame)) {
            playerCarCockpitCamera.gameObject.SetActive(!playerCarCockpitCamera.gameObject.activeSelf);
            playerCarFollowCamera.gameObject.SetActive(!playerCarFollowCamera.gameObject.activeSelf);
        }

        if (isPlayerCarActive && !playerCarObjectRef) {
            playerCarObjectRef = Instantiate(playerCarObject, Vector3.zero, Quaternion.identity);
            var carController = playerCarObjectRef.GetComponentInChildren<PrometeoCarController>();
            carController.carEngineSound.Play();
            carController.carSpeedText = playerSpeedText.GetComponentInChildren<Text>();

            for (int i = 0; i < CinemachineCams.Length; i++) {
                CinemachineCams[i].gameObject.SetActive(false);
            }

            playerCarCockpitCamera.Target.TrackingTarget = carController.transform;
            playerCarFollowCamera.Target.TrackingTarget = carController.transform;
            playerCarFollowCamera.gameObject.SetActive(isPlayerCarActive);
            playerSpeedText.SetActive(isPlayerCarActive);
        }

        if (isPlayerCarActive) {
            return;
        }

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
