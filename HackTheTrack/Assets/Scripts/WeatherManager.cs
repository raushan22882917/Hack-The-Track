using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class WeatherManager : MonoBehaviour {
    [Header("Weather Effects")]
    public ParticleSystem RainParticles;
    public AudioSource RainAudio;
    public WindZone WindZone;
    public Material SkyboxMaterial;

    [Header("Fog Settings")]
    public bool EnableFog = true;
    public float MinFogDensity = 0.001f;
    public float MaxFogDensity = 0.02f;

    [Header("Weather Condition")]
    public TextMeshProUGUI GeneralWeatherConditionText;
    public Image WeatherImage;
    public Sprite[] WeatherImages;

    public void ApplyWeather(Dictionary<string, object> weatherData) {
        if (weatherData == null) return;

        float airTemp = GetFloat(weatherData, "air_temp");
        float humidity = GetFloat(weatherData, "humidity");
        float pressure = GetFloat(weatherData, "pressure");
        float windSpeed = GetFloat(weatherData, "wind_speed");
        float windDirection = GetFloat(weatherData, "wind_direction");
        float rain = GetFloat(weatherData, "rain");

        // Wind
        if (WindZone != null) {
            WindZone.windMain = windSpeed;
            WindZone.transform.rotation = Quaternion.Euler(0f, windDirection, 0f);
        }

        // Rain
        if (RainParticles != null) {
            var emission = RainParticles.emission;
            emission.rateOverTime = rain > 0 ? rain * 100f : 0f;
            if (rain > 0 && !RainParticles.isPlaying) RainParticles.Play();
            else if (rain <= 0 && RainParticles.isPlaying) RainParticles.Stop();
        }

        if (RainAudio != null) {
            RainAudio.volume = Mathf.Clamp01(rain / 10f);
        }

        // Fog based on humidity
        if (EnableFog) {
            float fogFactor = Mathf.InverseLerp(30f, 100f, humidity);
            RenderSettings.fog = true;
            RenderSettings.fogDensity = Mathf.Lerp(MinFogDensity, MaxFogDensity, fogFactor);
        }

        // Skybox tint based on humidity
        if (SkyboxMaterial != null) {
            Color baseColor = Color.Lerp(Color.blue, Color.gray, humidity / 100f);
            SkyboxMaterial.SetColor("_SkyTint", baseColor);
        }

        // Infer general weather condition
        if (GeneralWeatherConditionText != null) {
            var weatherCondition = InferCondition(airTemp, humidity, windSpeed, rain);
            GeneralWeatherConditionText.text = weatherCondition;

            WeatherImage.sprite = null;
            foreach (Sprite s in WeatherImages) {
                if (s.name.ToLower() == weatherCondition.ToLower()) {
                    WeatherImage.sprite = s;
                    break;
                }
            }
            if (WeatherImage.sprite == null) {
                WeatherImage.sprite = WeatherImages[WeatherImages.Count() - 1];
            }
        }
    }

    private float GetFloat(Dictionary<string, object> data, string key) {
        if (data.ContainsKey(key) && float.TryParse(data[key].ToString(), out float val)) {
            return val;
        }
        return 0f;
    }

    public string InferCondition(float airTemp, float humidity, float windSpeed, float rain) {
        if (rain > 0f) return "Rainy";
        if (humidity >= 70f) return "Humid";
        if (windSpeed >= 6f) return "Windy";
        if (humidity >= 60f) return "Overcast";
        if (airTemp >= 30f && windSpeed >= 6f) return "Hot & Windy";
        if (airTemp >= 30f) return "Sunny";
        return "Clear";
    }
}
