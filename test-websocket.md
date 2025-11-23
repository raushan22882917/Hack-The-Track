# WebSocket Connection Test Guide

## Quick Test Steps

### 1. Check if WebSocket Endpoints Are Accessible

```bash
# Test WebSocket connection (replace with your URL)
wscat -c wss://hack-the-track-821372121985.europe-west1.run.app/ws/telemetry
```

Or use browser console:
```javascript
const ws = new WebSocket('wss://hack-the-track-821372121985.europe-west1.run.app/ws/telemetry');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onmessage = (msg) => console.log('📨 Message:', msg.data);
ws.onclose = (e) => console.log('🔌 Closed:', e.code, e.reason);
```

### 2. Check Cloud Run Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hack-the-track" \
  --limit=50 \
  --format=json \
  --freshness=5m
```

Look for:
- ✅ "Client connected to telemetry WebSocket"
- ❌ "Failed to accept WebSocket connection"
- ❌ Connection timeout errors

### 3. Verify Cloud Run Configuration

```bash
gcloud run services describe hack-the-track \
  --region=europe-west1 \
  --format="yaml(spec.template.spec.timeoutSeconds,spec.template.spec.sessionAffinity)"
```

Should show:
- `timeoutSeconds: 1800` (30 minutes)
- `sessionAffinity: true`

### 4. Test Control Commands

Once connected, test sending control commands:

```javascript
ws.send(JSON.stringify({type: "control", cmd: "play"}));
ws.send(JSON.stringify({type: "control", cmd: "pause"}));
ws.send(JSON.stringify({type: "control", cmd: "speed", value: 2.0}));
```

## Expected Behavior

### ✅ Working Correctly:
- Connection establishes within 1-2 seconds
- Receives "connected" message immediately
- Receives ping messages every 30 seconds
- Control commands work (play/pause/speed)
- Telemetry data streams continuously

### ❌ Problems to Watch For:
- Connection fails immediately → Check CORS, firewall, URL
- Connection drops after 30 minutes → Normal (timeout), reconnect
- Multiple reconnection attempts → Frontend issue, add backoff
- No data received → Check if data files are loaded
- Connection refused → Cloud Run instance not running

## If It Doesn't Work

### Option 1: Check Frontend Reconnection Logic
Add exponential backoff to prevent connection spam:

```typescript
let retryCount = 0;
const maxRetries = 5;

function connect() {
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    retryCount = 0; // Reset on success
  };
  
  ws.onclose = () => {
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(connect, delay);
      retryCount++;
    }
  };
}
```

### Option 2: Use Hybrid Approach
- WebSocket for telemetry (with controls) only
- SSE for endurance and leaderboard (more reliable)

### Option 3: Check if Cloud Run Supports WebSocket
Some regions or configurations might have issues. Check:
- Region support
- VPC connector (if using)
- Load balancer configuration

