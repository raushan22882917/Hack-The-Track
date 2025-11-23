#!/bin/bash
# Cloud Run WebSocket Configuration Script for Racing Game
# This configures Cloud Run for optimal WebSocket performance

SERVICE_NAME="hack-the-track"
REGION="europe-west1"

echo "🏎️  Configuring Cloud Run for Racing Game WebSocket Connections..."
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# 1. Increase timeout to 30 minutes (required for long WebSocket connections)
echo "⏱️  Setting timeout to 30 minutes (1800 seconds)..."
gcloud run services update $SERVICE_NAME \
  --timeout=1800 \
  --region=$REGION \
  --quiet

if [ $? -eq 0 ]; then
    echo "✅ Timeout updated successfully"
else
    echo "❌ Failed to update timeout"
    exit 1
fi

# 2. Enable session affinity (keeps clients on same instance)
echo ""
echo "🔗 Enabling session affinity..."
gcloud run services update $SERVICE_NAME \
  --session-affinity \
  --region=$REGION \
  --quiet

if [ $? -eq 0 ]; then
    echo "✅ Session affinity enabled"
else
    echo "⚠️  Session affinity may not be available in your region"
fi

# 3. Check and suggest CPU/Memory if needed
echo ""
echo "💻 Checking current resource allocation..."
CPU=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null)
MEMORY=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(spec.template.spec.containers[0].resources.limits.memory)" 2>/dev/null)

echo "Current CPU: ${CPU:-default}"
echo "Current Memory: ${MEMORY:-default}"

if [ -z "$CPU" ] || [ "$CPU" = "1000m" ]; then
    echo ""
    echo "💡 Recommendation: Increase CPU/Memory for better WebSocket performance:"
    echo "   gcloud run services update $SERVICE_NAME \\"
    echo "     --cpu=2 \\"
    echo "     --memory=2Gi \\"
    echo "     --region=$REGION"
fi

# 4. Display current configuration
echo ""
echo "📊 Current Configuration:"
echo "=========================="
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="table(
    spec.template.spec.timeoutSeconds,
    spec.template.spec.sessionAffinity,
    spec.template.spec.containers[0].resources.limits.cpu,
    spec.template.spec.containers[0].resources.limits.memory
  )"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "🎮 Your racing game WebSocket endpoints:"
echo "   - Telemetry: wss://$SERVICE_NAME-*.run.app/ws/telemetry"
echo "   - Endurance: wss://$SERVICE_NAME-*.run.app/ws/endurance"
echo "   - Leaderboard: wss://$SERVICE_NAME-*.run.app/ws/leaderboard"
echo ""
echo "⏱️  Timeout: 30 minutes (1800 seconds)"
echo ""
echo "💡 WebSocket Control Commands (send via WebSocket):"
echo "   {\"type\": \"control\", \"cmd\": \"play\"}     - Start playback"
echo "   {\"type\": \"control\", \"cmd\": \"pause\"}    - Pause playback"
echo "   {\"type\": \"control\", \"cmd\": \"speed\", \"value\": 2.0}  - Set playback speed"
echo "   {\"type\": \"control\", \"cmd\": \"seek\", \"timestamp\": \"...\"}  - Seek to timestamp"
echo "   {\"type\": \"control\", \"cmd\": \"reverse\"} - Reverse playback"
echo "   {\"type\": \"control\", \"cmd\": \"restart\"} - Restart from beginning"

