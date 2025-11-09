using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TelemetryUI : MonoBehaviour {
    public TelemetryReceiver Receiver;
    public WeatherManager WeatherMng;
    public Button PlayBtn, PauseBtn, ReverseBtn;
    public Slider SpeedSlider;
    public Toggle WeatherSwitch;
    public Toggle ShowGhostCars;

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
    public TextMeshProUGUI CurrentTime;

    public TextMeshProUGUI AccelerationXForce;
    public TextMeshProUGUI AccelerationYForce;
    public TextMeshProUGUI AccelerationForceClass;

    public TextMeshProUGUI CurrentActiveCameraValue;
    public Image CurrentColorImage;
    public Image CurrentFlagColorImage;

    private void Start() {
        PlayBtn.onClick.AddListener(Receiver.Play);
        PauseBtn.onClick.AddListener(Receiver.Pause);
        ReverseBtn.onClick.AddListener(Receiver.Reverse);

        SpeedSlider.onValueChanged.AddListener(v => {
            Receiver.SetSpeed(v);
            CurrentSpeedSliderValue.text = v.ToString();
        });

        CurrentSpeedSliderValue.text = SpeedSlider.value.ToString();

        WeatherSwitch.onValueChanged.AddListener(v => {
            WeatherMng.OnUseWeatherChanged(v);
        });
    }
}
