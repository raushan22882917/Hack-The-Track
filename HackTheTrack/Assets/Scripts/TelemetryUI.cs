using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TelemetryUI : MonoBehaviour {
    public TelemetryReceiver Receiver;
    public Button PlayBtn, PauseBtn;
    public Slider SpeedSlider;

    public TextMeshProUGUI VehicleId;
    public TextMeshProUGUI CurrentSpeed;
    public TextMeshProUGUI CurrentGear;
    public TextMeshProUGUI CurrentLap;
    public TextMeshProUGUI CurrentLapDistance;
    public TextMeshProUGUI CurrentThrottle;
    public Slider CurrentThrottleSlider;
    public TextMeshProUGUI CurrentBrakeFront;
    public Slider CurrentBrakeFrontSlider;
    public TextMeshProUGUI CurrentBrakeRear;
    public Slider CurrentBrakeRearSlider;
    public TextMeshProUGUI CurrentSteering;
    public RectTransform SteeringWheelImage;
    public TextMeshProUGUI CurrentRPM;
    public TextMeshProUGUI CurrentSpeedSliderValue;
    public Slider CurrentRPMSlider;

    private void Start() {
        PlayBtn.onClick.AddListener(Receiver.Play);
        PauseBtn.onClick.AddListener(Receiver.Pause);
        SpeedSlider.onValueChanged.AddListener(v => {
            Receiver.SetSpeed(v);
            CurrentSpeedSliderValue.text = v.ToString();
        });

        CurrentSpeedSliderValue.text = SpeedSlider.value.ToString();
    }
}
