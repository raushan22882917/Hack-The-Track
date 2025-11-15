using TMPro;
using UnityEngine;

public class PingPongText : MonoBehaviour {
    public TextMeshProUGUI targetText;
    public float duration = 2f; // time for one fade in/out cycle

    private Color baseColor;

    private void Start() {
        if (targetText == null) targetText = GetComponent<TextMeshProUGUI>();
        baseColor = targetText.color;
    }

    private void Update() {
        if (targetText == null) return;

        // PingPong value between 0 and 1
        float t = Mathf.PingPong(Time.time / duration, 1f);

        // Adjust alpha
        Color c = baseColor;
        c.a = t;
        targetText.color = c;
    }
}
