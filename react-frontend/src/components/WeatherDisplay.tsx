import { useTelemetryStore } from '../store/telemetryStore';

// Weather condition inference matching Unity's WeatherManager logic
function inferWeatherCondition(
  airTemp: number | undefined,
  humidity: number | undefined,
  windSpeed: number | undefined,
  rain: number | undefined
): string {
  if (rain && rain > 0) return 'rainy';
  if (humidity && humidity >= 70) return 'humid';
  if (windSpeed && windSpeed >= 6) return 'windy';
  if (humidity && humidity >= 60) return 'overcast';
  if (airTemp && airTemp >= 30 && windSpeed && windSpeed >= 6) return 'hotandwindy';
  if (airTemp && airTemp >= 30) return 'sunny';
  return 'clear';
}

export function WeatherDisplay() {
  const { weather, weatherEnabled, setWeatherEnabled } = useTelemetryStore();

  if (!weather) return null;

  const weatherCondition = inferWeatherCondition(
    weather.air_temp,
    weather.humidity,
    weather.wind_speed,
    weather.rain
  );

  const getWeatherIcon = () => {
    try {
      return (
        <img
          src={`/assets/weather/${weatherCondition}.png`}
          alt={weatherCondition}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            // Fallback to clear if image not found
            (e.target as HTMLImageElement).src = '/assets/weather/clear.png';
          }}
        />
      );
    } catch {
      return <div className="w-8 h-8 bg-gray-600 rounded"></div>;
    }
  };

  const getWeatherConditionLabel = () => {
    const labels: Record<string, string> = {
      rainy: 'Rainy',
      humid: 'Humid',
      windy: 'Windy',
      overcast: 'Overcast',
      hotandwindy: 'Hot & Windy',
      sunny: 'Sunny',
      clear: 'Clear',
    };
    return labels[weatherCondition] || 'Clear';
  };

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={weatherEnabled}
            onChange={(e) => setWeatherEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Weather Effects</span>
        </label>
      </div>

      {weatherEnabled && (
        <div className="flex items-center gap-3">
          {getWeatherIcon()}
          <div>
            <div className="text-sm font-semibold">{getWeatherConditionLabel()}</div>
            <div className="text-xs text-gray-400">
              {weather.air_temp?.toFixed(1)}°C | {weather.humidity?.toFixed(0)}% |{' '}
              {weather.wind_speed?.toFixed(1)} m/s
            </div>
            {weather.rain && weather.rain > 0 && (
              <div className="text-xs text-blue-400">Rain: {weather.rain.toFixed(1)} mm</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

