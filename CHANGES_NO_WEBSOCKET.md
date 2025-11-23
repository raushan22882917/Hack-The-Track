# Changes: Removed WebSocket, Using FastAPI REST + SSE Only

## Summary

All WebSocket functionality has been removed. The application now uses:
- **FastAPI REST API** (`/api/control`) for control commands
- **FastAPI SSE** (`/sse/telemetry`, `/sse/endurance`, `/sse/leaderboard`) for real-time streaming

## Changes Made

### 1. Removed WebSocket Imports
- Removed `WebSocket` and `WebSocketDisconnect` from FastAPI imports
- Removed WebSocket-specific logging configuration

### 2. Removed WebSocket Connection Pools
- Removed `telemetry_connections`, `endurance_connections`, `leaderboard_connections` lists
- No longer tracking WebSocket connections

### 3. Removed WebSocket Endpoints
- Removed `/ws/telemetry` endpoint
- Removed `/ws/endurance` endpoint  
- Removed `/ws/leaderboard` endpoint

### 4. Updated Broadcast Loops
- Removed WebSocket sending logic from broadcast loops
- Data is now only sent via SSE streams (managed by FastAPI)

### 5. Updated API Documentation
- Root endpoint (`/`) now shows SSE endpoints instead of WebSocket
- Health check endpoint shows data loading status instead of connection counts
- Updated suggestions to use SSE instead of WebSocket

### 6. Updated Startup Messages
- Removed WebSocket endpoint listings
- Updated to show SSE endpoints as primary

## Current Architecture

### Available Endpoints

**REST API (Controls & Data):**
- `POST /api/control` - Send control commands (play, pause, speed, seek, etc.)
- `GET /api/telemetry` - Get latest telemetry data
- `GET /api/endurance` - Get endurance/lap events
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/health` - Health check

**SSE Streams (Real-time):**
- `GET /sse/telemetry` - Real-time telemetry stream
- `GET /sse/endurance` - Real-time endurance events
- `GET /sse/leaderboard` - Real-time leaderboard updates

## Frontend Usage

### Control Commands (REST API)
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
```

### Real-time Streams (SSE)
```typescript
// Telemetry stream
const telemetrySSE = new EventSource('/sse/telemetry');
telemetrySSE.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateCars(data.vehicles);
};

// Endurance stream
const enduranceSSE = new EventSource('/sse/endurance');
enduranceSSE.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleLapEvent(data);
};

// Leaderboard stream
const leaderboardSSE = new EventSource('/sse/leaderboard');
leaderboardSSE.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateLeaderboard(data);
};
```

## Benefits

✅ **More Reliable** - SSE works better on Cloud Run
✅ **Simpler Code** - No WebSocket connection management
✅ **Auto Reconnection** - SSE has built-in reconnection
✅ **Better Scalability** - SSE handles more concurrent connections
✅ **Lower Maintenance** - No timeout or connection issues

## Migration Notes

- All WebSocket endpoints are removed
- Frontend must use REST API for controls
- Frontend must use SSE for real-time streams
- No code changes needed for SSE endpoints - they already work
- Broadcast loops automatically start when SSE clients connect

