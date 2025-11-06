using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;

public class ControlCinemachineOrbitalFollowZoom : MonoBehaviour {

    [SerializeField] private CinemachineOrbitalFollow cameraFollower;

    private Vector3 zoomDefaultValue;

    private void Awake() {
        zoomDefaultValue = cameraFollower.TargetOffset;
    }

    private void OnEnable() {
        cameraFollower.TargetOffset = zoomDefaultValue;
    }

    private void Update() {
        // zoom out
        if (Mouse.current.scroll.down.value != 0) {
            cameraFollower.Radius++;
        }
        // zoom in
        if (Mouse.current.scroll.up.value != 0) {
            cameraFollower.Radius--;
        }
    }
}
