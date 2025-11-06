using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;

public class ControlCinemachineFollowZoom : MonoBehaviour {

    [SerializeField] private CinemachineFollow cameraFollower;
    [SerializeField] private Vector3 zoomValue;

    private Vector3 zoomDefaultValue;

    private void Awake() {
        zoomDefaultValue = cameraFollower.FollowOffset;
    }

    private void OnEnable() {
        cameraFollower.FollowOffset = zoomDefaultValue;
    }

    private void Update() {
        // zoom out
        if (Mouse.current.scroll.down.value != 0) {
            cameraFollower.FollowOffset -= zoomValue;
        }
        // zoom in
        if (Mouse.current.scroll.up.value != 0) {
            cameraFollower.FollowOffset += zoomValue;
        }
    }
}
