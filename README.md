# Clawbuddy Mission Control API

Permanent API endpoint for Mission Control dashboard.

## Deploy to Render.com

1. Go to https://render.com and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub account and select/create a repo
4. Or use "Deploy from Git URL" and paste your repo URL
5. Configure:
   - **Name:** clawbuddy-mission-control-api
   - **Root Directory:** (leave blank)
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
6. Add Environment Variable:
   - `API_TOKEN` = `clawbuddy-mission-control-live-2024`
7. Click "Create Web Service"

Render will give you a permanent URL like:
`https://clawbuddy-mission-control-api.onrender.com`

## API Endpoints

- `GET /api/all` - Full data snapshot
- `GET /api/kpis` - KPI metrics
- `GET /api/tasks` - Task board
- `GET /api/agents` - Agent team
- `POST /webhook/update` - Push data from OpenClaw
- `GET /health` - Health check

## Authentication

Include header: `Authorization: Bearer clawbu...2024`

## Updating Data

Your OpenClaw can POST to `/webhook/update` to sync data.
Or manually edit `data.json` in Render's dashboard.
