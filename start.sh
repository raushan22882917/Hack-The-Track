#!/bin/bash
set -e

# Get port from environment variable, default to 8080
# Cloud Run automatically sets PORT environment variable
PORT=${PORT:-8080}

# Ensure PORT is a valid integer
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: PORT must be a number, got: $PORT"
    exit 1
fi

# Start uvicorn server
echo "Starting server on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"

