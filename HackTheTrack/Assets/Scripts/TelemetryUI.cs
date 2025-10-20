using UnityEngine;
using UnityEngine.UI;

public class TelemetryUI : MonoBehaviour {
    public TelemetryReceiver Receiver;
    public Button PlayBtn, PauseBtn;
    public Slider SpeedSlider;

    void Start() {
        PlayBtn.onClick.AddListener(Receiver.Play);
        PauseBtn.onClick.AddListener(Receiver.Pause);
        SpeedSlider.onValueChanged.AddListener(v => Receiver.SetSpeed(v));
    }
}
