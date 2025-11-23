# Deployment Guide for Render

This guide explains how to deploy the Telemetry Rush application to Render.

## Architecture

The application consists of two services:
1. **Backend**: FastAPI server (Python) - Web Service
2. **Frontend**: React application (Static Site)

## Prerequisites

- A GitHub account with this repository
- A Render account (sign up at https://render.com)

## Deployment Steps

### Step 1: Prepare Repository

1. Make sure your code is pushed to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

### Step 2: Deploy Backend (FastAPI)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `telemetry-rush-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r fastapi-server/requirements.txt`
   - **Start Command**: `cd fastapi-server && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or choose a plan)
5. Add Environment Variables:
   - `PYTHON_VERSION`: `3.11.0`
6. Click **"Create Web Service"**
7. Wait for deployment to complete
8. **Copy the service URL** (e.g., `https://telemetry-rush-api.onrender.com`)

### Step 3: Deploy Frontend (React)

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `telemetry-rush-frontend`
   - **Build Command**: `cd react-frontend && npm install && npm run build`
   - **Publish Directory**: `react-frontend/dist`
   - **Plan**: Free (or choose a plan)
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://telemetry-rush-api.onrender.com` (use your backend URL)
   - `VITE_WEBSOCKET_ENABLED`: `true`
   - `VITE_WEBSOCKET_AUTO_CONNECT`: `true`
5. Click **"Create Static Site"**
6. Wait for deployment to complete
7. Your frontend will be available at `https://telemetry-rush-frontend.onrender.com`

### Step 4: Update Backend CORS (if needed)

If you need to restrict CORS to your frontend domain, update `fastapi-server/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://telemetry-rush-frontend.onrender.com",
        "http://localhost:3000",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Environment Variables

### Backend Environment Variables

- `PORT`: Automatically set by Render (don't set manually)
- `PYTHON_VERSION`: `3.11.0`

### Frontend Environment Variables

- `VITE_API_BASE_URL`: Your backend service URL (e.g., `https://telemetry-rush-api.onrender.com`)
- `VITE_WEBSOCKET_ENABLED`: `true` (or `false` to disable WebSocket)
- `VITE_WEBSOCKET_AUTO_CONNECT`: `true` (or `false` to disable auto-connect)

## Data Files

**Important**: Your CSV data files (`logs/vehicles/*.csv`, etc.) need to be included in the repository or uploaded separately.

1. Make sure data files are committed to Git:
   ```bash
   git add fastapi-server/logs/
   git commit -m "Add data files"
   git push
   ```

2. Or upload data files after deployment using Render's file system or external storage.

## WebSocket on Render

Render supports WebSocket connections. The WebSocket URLs will be:
- `wss://telemetry-rush-api.onrender.com/ws/telemetry`
- `wss://telemetry-rush-api.onrender.com/ws/endurance`
- `wss://telemetry-rush-api.onrender.com/ws/leaderboard`

Note: Use `wss://` (secure WebSocket) in production, which Render automatically handles.

## Troubleshooting

### Backend won't start
- Check logs in Render Dashboard
- Verify `requirements.txt` has all dependencies
- Ensure `PORT` environment variable is used (automatically provided by Render)

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` is set correctly in frontend environment variables
- Check backend logs for CORS errors
- Ensure backend service is running and healthy

### WebSocket connections failing
- Verify backend is running and WebSocket endpoints are accessible
- Check browser console for connection errors
- Ensure `VITE_API_BASE_URL` uses `https://` (not `http://`) in production
- Render automatically upgrades `ws://` to `wss://` for WebSockets

### Data files not loading
- Verify CSV files are committed to repository
- Check file paths in `main.py` (`logs/vehicles/`, etc.)
- Review backend logs for file loading errors

## Updating Deployment

After making changes:
1. Push changes to GitHub
2. Render will automatically redeploy (if auto-deploy is enabled)
3. Or manually trigger deployment in Render Dashboard

## Free Tier Limitations

- Services may spin down after 15 minutes of inactivity (Free tier)
- First request after spin-down may take 30-60 seconds
- Consider upgrading for always-on services

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com/

