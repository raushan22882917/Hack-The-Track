# Quick Start: Deploy to Render

## Backend Deployment (FastAPI)

### Option 1: Using Render Dashboard

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Use these settings:
   ```
   Name: telemetry-rush-api
   Environment: Python 3
   Build Command: pip install -r fastapi-server/requirements.txt
   Start Command: cd fastapi-server && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Click **"Create Web Service"**

### Option 2: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Go to Render Dashboard → **"New +"** → **"Blueprint"**
3. Select your repository
4. Render will automatically detect and use `render.yaml`

## Frontend Deployment (React)

1. Go to Render Dashboard → **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Use these settings:
   ```
   Name: telemetry-rush-frontend
   Build Command: cd react-frontend && npm install && npm run build
   Publish Directory: react-frontend/dist
   ```
4. Add Environment Variable:
   ```
   VITE_API_BASE_URL = https://telemetry-rush-api.onrender.com
   ```
   (Replace with your actual backend URL)

## Important Notes

- Backend automatically uses `$PORT` from Render
- Frontend needs `VITE_API_BASE_URL` environment variable set to your backend URL
- Data files in `fastapi-server/logs/` should be committed to Git
- WebSocket works automatically on Render (use `wss://` in production)

See `DEPLOY.md` for detailed instructions.

