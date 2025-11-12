using UnityEngine;

public class SteeringRotationHelper : MonoBehaviour {
    [SerializeField] private WheelCollider sourceRotation;

    private void Update() {
        transform.localRotation = Quaternion.Euler(transform.localRotation.x, transform.localRotation.y, sourceRotation.steerAngle * (-1f));
    }
}
