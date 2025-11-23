# Pure FastAPI REST API - No WebSocket, No SSE

## Architecture

The application now uses **pure FastAPI REST API** only:
- ✅ REST API endpoints for all data access
- ✅ REST API endpoints for controls
- ✅ Background broadcast loops update cache
- ✅ Clients poll REST endpoints for updates
- ❌ No WebSocket
- ❌ No SSE (Server-Sent Events)

## Available Endpoints

### Data Endpoints (GET - Poll for updates)

```bash
# Get latest telemetry data
GET /api/telemetry

# Get endurance/lap events
GET /api/endurance

# Get leaderboard data
GET /api/leaderboard

# Health check
GET /api/health
```

### Control Endpoints (POST)

```bash
# Control playback
POST /api/control
Body: {"cmd": "play"} | {"cmd": "pause"} | {"cmd": "speed", "value": 2.0} | etc.

# Preprocess telemetry data
POST /api/preprocess
```

## How It Works

1. **Background Broadcast Loops**: Run continuously to update cache
2. **REST Endpoints**: Return cached data instantly
3. **Client Polling**: Frontend polls REST endpoints periodically

## Frontend Usage

### Polling for Updates

```typescript
// Poll telemetry every 100ms (10Hz)
setInterval(async () => {
  const response = await fetch('/api/telemetry');
  const data = await response.json();
  if (data.vehicles) {
    updateCars(data.vehicles);
  }
}, 100);

// Poll endurance every 500ms (2Hz)
setInterval(async () => {
  const response = await fetch('/api/endurance');
  const data = await response.json();
  data.events.forEach(event => handleLapEvent(event));
}, 500);

// Poll leaderboard every 1000ms (1Hz)
setInterval(async () => {
  const response = await fetch('/api/leaderboard');
  const data = await response.json();
  updateLeaderboard(data.leaderboard);
}, 1000);
```

### Control Commands

```typescript
// Play
await fetch('/api/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmd: 'play' })
});

// Pause
await fetch('/api/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmd: 'pause' })
});

// Set speed
await fetch('/api/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmd: 'speed', value: 2.0 })
});

// Seek
await fetch('/api/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmd: 'seek', timestamp: '2024-01-01T12:00:00Z' })
});
```

## Benefits

✅ **Simple** - Standard HTTP REST API
✅ **Reliable** - Works everywhere, no special protocols
✅ **Easy to Debug** - Standard HTTP requests/responses
✅ **Cloud Run Friendly** - No connection timeouts or limits
✅ **Scalable** - Stateless, horizontal scaling
✅ **Compatible** - Works with any HTTP client

## Polling Frequency Recommendations

- **Telemetry**: 10-60Hz (100ms - 16ms intervals) - Real-time car positions
- **Endurance**: 1-2Hz (500ms - 1000ms intervals) - Lap events
- **Leaderboard**: 0.5-1Hz (1000ms - 2000ms intervals) - Position updates

## Example: Complete Frontend Service

```typescript
class RacingGameService {
  private apiUrl: string;
  private pollingIntervals: NodeJS.Timeout[] = [];

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  // Start polling for updates
  startPolling(callbacks: {
    onTelemetry: (data: any) => void;
    onEndurance: (data: any) => void;
    onLeaderboard: (data: any) => void;
  }) {
    // Poll telemetry at 10Hz
    const telemetryInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.apiUrl}/api/telemetry`);
        const data = await res.json();
        if (data.vehicles) {
          callbacks.onTelemetry(data);
        }
      } catch (e) {
        console.error('Telemetry poll error:', e);
      }
    }, 100);
    this.pollingIntervals.push(telemetryInterval);

    // Poll endurance at 2Hz
    const enduranceInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.apiUrl}/api/endurance`);
        const data = await res.json();
        data.events.forEach((event: any) => callbacks.onEndurance(event));
      } catch (e) {
        console.error('Endurance poll error:', e);
      }
    }, 500);
    this.pollingIntervals.push(enduranceInterval);

    // Poll leaderboard at 1Hz
    const leaderboardInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.apiUrl}/api/leaderboard`);
        const data = await res.json();
        callbacks.onLeaderboard(data.leaderboard);
      } catch (e) {
        console.error('Leaderboard poll error:', e);
      }
    }, 1000);
    this.pollingIntervals.push(leaderboardInterval);
  }

  // Stop polling
  stopPolling() {
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals = [];
  }

  // Control commands
  async play() {
    return this.sendControl('play');
  }

  async pause() {
    return this.sendControl('pause');
  }

  async setSpeed(speed: number) {
    return this.sendControl('speed', speed);
  }

  private async sendControl(cmd: string, value?: number, timestamp?: string) {
    const body: any = { cmd };
    if (value !== undefined) body.value = value;
    if (timestamp) body.timestamp = timestamp;

    return fetch(`${this.apiUrl}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
}

// Usage
const service = new RacingGameService('https://your-app.run.app');
service.startPolling({
  onTelemetry: (data) => updateCars(data.vehicles),
  onEndurance: (data) => handleLap(data),
  onLeaderboard: (data) => updatePositions(data)
});
```

## Summary

- ✅ Pure FastAPI REST API
- ✅ No WebSocket
- ✅ No SSE
- ✅ Simple polling for updates
- ✅ Works perfectly on Cloud Run
- ✅ Easy to implement and maintain

